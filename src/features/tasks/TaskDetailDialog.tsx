import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api'
import { taskApi } from './api'
import { formatLocalDate } from './date'
import { DialogFrame } from './DialogFrame'
import { taskErrorMessage } from './useTaskDay'
import type { Task } from './types'

export type NavigationGuard = (next: () => void) => void
export type GuardRegistrar = (guard?: NavigationGuard) => void

const priorityLabel = { low: 'Thấp', normal: 'Bình thường', high: 'Cao' } as const

export function TaskDetailDialog({ onClose, onTaskChanged, onUnauthorized, registerNavigationGuard, task }: {
  onClose: () => void
  onTaskChanged: (task: Task) => void
  onUnauthorized: () => void
  registerNavigationGuard?: GuardRegistrar
  task: Task
}) {
  const [currentTask, setCurrentTask] = useState(task)
  const [note, setNote] = useState(task.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [pendingAction, setPendingAction] = useState<(() => void)>()
  const controllerRef = useRef<AbortController | undefined>(undefined)
  const dirty = note !== (currentTask.note ?? '')

  useEffect(() => () => controllerRef.current?.abort(), [])

  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])

  const requestAction = useCallback((action: () => void) => {
    if (dirty) setPendingAction(() => action)
    else action()
  }, [dirty])

  useEffect(() => {
    if (!registerNavigationGuard) return
    registerNavigationGuard(requestAction)
    return () => registerNavigationGuard(undefined)
  }, [registerNavigationGuard, requestAction])

  function accept(nextTask: Task) {
    setCurrentTask(nextTask)
    setNote(nextTask.note ?? '')
    onTaskChanged(nextTask)
  }

  async function saveNote(signal: AbortSignal) {
    const result = await taskApi.update(currentTask.id, { note: note.trim() || null }, signal)
    accept(result.task)
    return result.task
  }

  function handleFailure(actionError: unknown, fallback?: string) {
    if (actionError instanceof ApiError && actionError.status === 401) {
      onUnauthorized()
      return
    }
    setError(fallback ?? taskErrorMessage(actionError))
  }

  async function handleSaveNote() {
    if (busy || !dirty) return
    setBusy(true)
    setError(undefined)
    setNotice(undefined)
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      await saveNote(controller.signal)
      if (!controller.signal.aborted) setNotice('Đã lưu note.')
    } catch (saveError: unknown) {
      if (!controller.signal.aborted) handleFailure(saveError)
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  async function handleCompletion(completed: boolean) {
    if (busy) return
    setBusy(true)
    setError(undefined)
    setNotice(undefined)
    const controller = new AbortController()
    controllerRef.current = controller
    let noteWasSaved = false
    try {
      if (dirty) {
        await saveNote(controller.signal)
        noteWasSaved = true
      }
      const result = await taskApi.setCompletion(currentTask.id, completed, controller.signal)
      accept(result.task)
      setNotice(completed ? 'Đã đánh dấu hoàn thành.' : 'Đã chuyển về chưa làm.')
    } catch (completionError: unknown) {
      if (!controller.signal.aborted) handleFailure(completionError, noteWasSaved ? 'Note đã được lưu, nhưng chưa thể cập nhật trạng thái. Hãy thử lại.' : undefined)
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  async function saveThenContinue() {
    if (busy || !pendingAction) return
    const action = pendingAction
    setBusy(true)
    setError(undefined)
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      await saveNote(controller.signal)
      if (!controller.signal.aborted) {
        setPendingAction(undefined)
        action()
      }
    } catch (saveError: unknown) {
      if (!controller.signal.aborted) handleFailure(saveError)
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  function discardThenContinue() {
    if (!pendingAction) return
    const action = pendingAction
    setNote(currentTask.note ?? '')
    setPendingAction(undefined)
    action()
  }

  return <DialogFrame labelledBy="task-detail-title" onClose={() => requestAction(onClose)} wide>
    <div className="dialog-heading detail-heading">
      <div><p className="eyebrow">Chi tiết công việc</p><h2 id="task-detail-title">{currentTask.name}</h2></div>
      <span className={`task-status ${currentTask.completed ? 'completed' : ''}`}>{currentTask.completed ? 'Đã hoàn thành' : 'Chưa làm'}</span>
    </div>

    <dl className="task-facts">
      <div><dt>Ngày</dt><dd>{formatLocalDate(currentTask.date)}</dd></div>
      <div><dt>Thời gian</dt><dd>{currentTask.startTime}–{currentTask.endTime}</dd></div>
      <div><dt>Ưu tiên</dt><dd>{priorityLabel[currentTask.priority]}</dd></div>
      <div><dt>Nhóm</dt><dd>{currentTask.group ?? 'Chưa đặt'}</dd></div>
    </dl>

    <section className="detail-section"><h3>Mô tả kế hoạch</h3><p>{currentTask.description ?? 'Không có mô tả.'}</p></section>
    <section className="detail-section">
      <div className="note-heading"><div><h3>Note công việc</h3><p>Note tách biệt với mô tả kế hoạch.</p></div>{dirty && <span className="unsaved-badge">Chưa lưu</span>}</div>
      <textarea aria-label="Note công việc" value={note} onChange={(event) => setNote(event.target.value)} maxLength={5_000} rows={7} disabled={busy} />
      <div className="note-meta"><span>{note.length}/5.000 ký tự</span><button className="secondary-button" type="button" onClick={handleSaveNote} disabled={busy || !dirty}>{busy ? 'Đang xử lý…' : 'Lưu note'}</button></div>
    </section>

    {error && <div className="form-message error" role="alert">{error}</div>}
    {notice && <div className="form-message success" role="status">{notice}</div>}

    <label className="completion-control">
      <input type="checkbox" checked={currentTask.completed} onChange={(event) => void handleCompletion(event.target.checked)} disabled={busy} />
      <span>{currentTask.completed ? 'Công việc đã hoàn thành' : 'Đánh dấu công việc là hoàn thành'}</span>
    </label>
    <p className="field-help">Nếu note chưa lưu, DayTrail sẽ lưu note trước rồi mới cập nhật trạng thái.</p>

    {pendingAction && <div className="unsaved-prompt" role="alertdialog" aria-labelledby="unsaved-title">
      <h3 id="unsaved-title">Note chưa được lưu</h3>
      <p>Bạn muốn lưu note trước khi rời khỏi chi tiết?</p>
      <div className="dialog-actions three-actions">
        <button className="primary-button compact" type="button" onClick={() => void saveThenContinue()} disabled={busy}>Lưu và tiếp tục</button>
        <button className="danger-button" type="button" onClick={discardThenContinue} disabled={busy}>Bỏ thay đổi</button>
        <button className="secondary-button" type="button" onClick={() => setPendingAction(undefined)} disabled={busy}>Tiếp tục chỉnh</button>
      </div>
    </div>}
  </DialogFrame>
}
