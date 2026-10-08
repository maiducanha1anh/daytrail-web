import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api'
import { MediaManager, type MediaManagerHandle } from '../media/MediaManager'
import type { GuardRegistrar } from '../../navigation'
import { taskApi } from './api'
import { formatLocalDate, parseLocalDate, todayKey } from './date'
import { DialogFrame } from './DialogFrame'
import { taskErrorMessage } from './useTaskDay'
import type { Task, TaskSeries } from './types'

const priorityLabel = { low: 'Thấp', normal: 'Bình thường', high: 'Cao' } as const
const frequencyLabel = { daily: 'Hằng ngày', weekly: 'Hằng tuần', monthly: 'Hằng tháng' } as const
const weekdayLabel = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật']

export function TaskDetailDialog({ onClose, onSeriesChanged, onTaskChanged, onUnauthorized, registerNavigationGuard, task }: {
  onClose: () => void
  onSeriesChanged?: (message: string) => void
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
  const [series, setSeries] = useState<TaskSeries>()
  const [seriesLoading, setSeriesLoading] = useState(Boolean(task.recurrence))
  const [seriesError, setSeriesError] = useState<string>()
  const [stopOpen, setStopOpen] = useState(false)
  const [stopDate, setStopDate] = useState(todayKey())
  const [stopError, setStopError] = useState<string>()
  const [stopping, setStopping] = useState(false)
  const controllerRef = useRef<AbortController | undefined>(undefined)
  const seriesControllerRef = useRef<AbortController | undefined>(undefined)
  const stopControllerRef = useRef<AbortController | undefined>(undefined)
  const mediaRef = useRef<MediaManagerHandle>(null)
  const dirty = note !== (currentTask.note ?? '')

  useEffect(() => () => {
    controllerRef.current?.abort()
    seriesControllerRef.current?.abort()
    stopControllerRef.current?.abort()
  }, [])

  const loadSeries = useCallback(() => {
    if (!task.recurrence) return
    seriesControllerRef.current?.abort()
    const controller = new AbortController()
    seriesControllerRef.current = controller
    setSeriesLoading(true)
    setSeriesError(undefined)
    void taskApi.series(task.recurrence.seriesId, controller.signal).then((result) => {
      if (!controller.signal.aborted) setSeries(result.series)
    }).catch((loadError: unknown) => {
      if (controller.signal.aborted) return
      if (loadError instanceof ApiError && loadError.status === 401) {
        onUnauthorized()
        return
      }
      setSeriesError(taskErrorMessage(loadError))
    }).finally(() => {
      if (!controller.signal.aborted) setSeriesLoading(false)
    })
  }, [onUnauthorized, task.recurrence])

  useEffect(() => {
    const timer = window.setTimeout(loadSeries, 0)
    return () => {
      window.clearTimeout(timer)
      seriesControllerRef.current?.abort()
    }
  }, [loadSeries])

  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])

  const requestAction = useCallback((action: () => void) => {
    const continueThroughMedia = () => {
      if (mediaRef.current) mediaRef.current.requestLeave(action)
      else action()
    }
    if (dirty) setPendingAction(() => continueThroughMedia)
    else continueThroughMedia()
  }, [dirty])

  useEffect(() => registerNavigationGuard?.(requestAction), [registerNavigationGuard, requestAction])

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
    if (busy || stopping || !dirty) return
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
    if (busy || stopping) return
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
    if (busy || stopping || !pendingAction) return
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

  function openStopConfirmation() {
    requestAction(() => {
      setStopDate(todayKey())
      setStopError(undefined)
      setStopOpen(true)
    })
  }

  async function handleStopSeries() {
    if (!series || !currentTask.recurrence || stopping) return
    if (!parseLocalDate(stopDate)) {
      setStopError('Hãy chọn ngày dừng hợp lệ.')
      return
    }
    if (stopDate < series.startDate || stopDate > series.endDate) {
      setStopError(`Ngày dừng phải nằm từ ${formatLocalDate(series.startDate)} đến ${formatLocalDate(series.endDate)}.`)
      return
    }
    setStopping(true)
    setStopError(undefined)
    setError(undefined)
    const controller = new AbortController()
    stopControllerRef.current = controller
    try {
      const result = await taskApi.stopSeries(currentTask.recurrence.seriesId, stopDate, controller.signal)
      if (controller.signal.aborted) return
      setSeries(result.series)
      const message = `Đã dừng lặp: loại bỏ ${result.removedCount} lần, giữ lại ${result.keptCount} lần.`
      onSeriesChanged?.(message)
      onClose()
    } catch (stopRequestError: unknown) {
      if (controller.signal.aborted) return
      if (stopRequestError instanceof ApiError && stopRequestError.status === 401) {
        onUnauthorized()
        return
      }
      setStopError(taskErrorMessage(stopRequestError))
    } finally {
      if (!controller.signal.aborted) setStopping(false)
    }
  }

  return <DialogFrame labelledBy="task-detail-title" onClose={() => { if (!stopping) requestAction(onClose) }} wide>
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
    {currentTask.recurrence && <section className="detail-section recurrence-detail" aria-labelledby="recurrence-detail-title">
      <div className="recurrence-detail-heading"><div><h3 id="recurrence-detail-title">Chuỗi lặp</h3><p>Thao tác sửa, note, hoàn thành, chuyển ngày hoặc xóa chỉ áp dụng lần này.</p></div><span className="repeat-badge">↻ {frequencyLabel[currentTask.recurrence.frequency]}</span></div>
      {seriesLoading ? <div className="loading-inline" aria-live="polite">Đang tải thông tin chuỗi…</div> : seriesError ? <div className="load-error compact-error" role="alert"><p>{seriesError}</p><button className="secondary-button" type="button" onClick={loadSeries}>Thử lại</button></div> : series && <>
        <dl className="series-facts">
          <div><dt>Quy tắc</dt><dd>{series.frequency === 'weekly' ? `${frequencyLabel.weekly}: ${series.weekdays.map((day) => weekdayLabel[day - 1]).join(', ')}` : series.frequency === 'monthly' ? `${frequencyLabel.monthly}, ngày ${Number(series.startDate.slice(8, 10))}` : frequencyLabel.daily}</dd></div>
          <div><dt>Khoảng lặp</dt><dd>{formatLocalDate(series.startDate)} – {formatLocalDate(series.endDate)}</dd></div>
          <div><dt>Ngày dự kiến của lần này</dt><dd>{formatLocalDate(currentTask.recurrence.originalDate)}</dd></div>
          <div><dt>Trạng thái chuỗi</dt><dd>{series.stoppedFromDate ? `Đã dừng từ ${formatLocalDate(series.stoppedFromDate)}` : 'Đang lặp'}</dd></div>
        </dl>
        {currentTask.date !== currentTask.recurrence.originalDate && <p className="series-moved-note">Lần này đã chuyển từ {formatLocalDate(currentTask.recurrence.originalDate)} sang {formatLocalDate(currentTask.date)}.</p>}
        {!series.stoppedFromDate && <button className="danger-button" type="button" onClick={openStopConfirmation} disabled={busy || stopping}>Dừng lặp</button>}
      </>}
    </section>}
    <section className="detail-section">
      <div className="note-heading"><div><h3>Note công việc</h3><p>Note tách biệt với mô tả kế hoạch.</p></div>{dirty && <span className="unsaved-badge">Chưa lưu</span>}</div>
      <textarea aria-label="Note công việc" value={note} onChange={(event) => setNote(event.target.value)} maxLength={5_000} rows={7} disabled={busy || stopping} />
      <div className="note-meta"><span>{note.length}/5.000 ký tự</span><button className="secondary-button" type="button" onClick={handleSaveNote} disabled={busy || stopping || !dirty}>{busy ? 'Đang xử lý…' : 'Lưu note'}</button></div>
    </section>

    <MediaManager ref={mediaRef} owner={{ type: 'task', taskId: currentTask.id }} onUnauthorized={onUnauthorized} disabled={stopping} />

    {error && <div className="form-message error" role="alert">{error}</div>}
    {notice && <div className="form-message success" role="status">{notice}</div>}

    <label className="completion-control">
      <input type="checkbox" checked={currentTask.completed} onChange={(event) => void handleCompletion(event.target.checked)} disabled={busy || stopping} />
      <span>{currentTask.completed ? 'Công việc đã hoàn thành' : 'Đánh dấu công việc là hoàn thành'}</span>
    </label>
    <p className="field-help">Nếu note chưa lưu, DayTrail sẽ lưu note trước rồi mới cập nhật trạng thái.</p>

    {stopOpen && series && <div className="stop-series-prompt" role="alertdialog" aria-labelledby="stop-series-title">
      <h3 id="stop-series-title">Dừng chuỗi lặp</h3>
      <p>Từ ngày đã chọn, các lần chưa hoàn thành, chưa có ghi chú và chưa có ảnh sẽ được bỏ khỏi lịch. Những lần đã hoàn thành, có ghi chú hoặc có ảnh được giữ lại.</p>
      {currentTask.recurrence && currentTask.date !== currentTask.recurrence.originalDate && <p className="series-moved-note">Công việc đang mở đã được chuyển ngày. Việc dừng vẫn xét theo ngày dự kiến ban đầu là {formatLocalDate(currentTask.recurrence.originalDate)}.</p>}
      <div className="field">
        <label htmlFor="stop-series-date">Dừng từ ngày</label>
        <input id="stop-series-date" type="date" min={series.startDate} max={series.endDate} value={stopDate} onChange={(event) => setStopDate(event.target.value)} aria-invalid={Boolean(stopError)} disabled={stopping} />
        <span className="field-help">Mặc định là hôm nay theo ngày địa phương. Ngày phải nằm trong khoảng của chuỗi.</span>
      </div>
      {stopError && <div className="form-message error" role="alert">{stopError}</div>}
      <div className="dialog-actions">
        <button className="secondary-button" type="button" onClick={() => { setStopOpen(false); setStopError(undefined) }} disabled={stopping}>Hủy</button>
        <button className="danger-button" type="button" onClick={() => void handleStopSeries()} disabled={stopping}>{stopping ? 'Đang dừng…' : 'Xác nhận dừng lặp'}</button>
      </div>
    </div>}

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
