import { type FormEvent, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api'
import { taskApi } from './api'
import { formatLocalDate, parseLocalDate } from './date'
import { DialogFrame } from './DialogFrame'
import { taskErrorMessage } from './useTaskDay'
import type { Task } from './types'

export function MoveTaskDialog({ onClose, onMoved, onUnauthorized, task }: {
  onClose: () => void
  onMoved: (task: Task) => void
  onUnauthorized: () => void
  task: Task
}) {
  const [date, setDate] = useState(task.date)
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const controllerRef = useRef<AbortController | undefined>(undefined)

  useEffect(() => () => controllerRef.current?.abort(), [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return
    if (!parseLocalDate(date)) {
      setError('Hãy chọn một ngày hợp lệ.')
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setError(undefined)
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      const result = await taskApi.move(task.id, date, controller.signal)
      if (controller.signal.aborted) return
      onMoved(result.task)
      onClose()
    } catch (moveError: unknown) {
      if (controller.signal.aborted) return
      if (moveError instanceof ApiError && moveError.status === 401) {
        onUnauthorized()
        return
      }
      setError(taskErrorMessage(moveError))
    } finally {
      if (!controller.signal.aborted) {
        submittingRef.current = false
        setSubmitting(false)
      }
    }
  }

  return <DialogFrame labelledBy="move-task-title" onClose={() => { if (!submitting) onClose() }}>
    <div className="dialog-heading"><p className="eyebrow">{task.recurrence ? 'Chuyển lần này' : 'Chuyển ngày'}</p><h2 id="move-task-title">{task.name}</h2><p>Ngày hiện tại: {formatLocalDate(task.date)}</p></div>
    {error && <div className="form-message error" role="alert">{error}</div>}
    <form className="stack-form" onSubmit={submit}>
      <div className="field"><label htmlFor="move-date">Ngày mới</label><input id="move-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></div>
      <p className="field-help">Note, mô tả và trạng thái hoàn thành sẽ được giữ nguyên.{task.recurrence ? ' Quy tắc chuỗi và các lần khác không thay đổi.' : ''}</p>
      <div className="dialog-actions"><button className="secondary-button" type="button" onClick={onClose} disabled={submitting}>Hủy</button><button className="primary-button compact" type="submit" disabled={submitting}>{submitting ? 'Đang chuyển…' : 'Chuyển ngày'}</button></div>
    </form>
  </DialogFrame>
}
