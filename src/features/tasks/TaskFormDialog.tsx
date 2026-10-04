import { type FormEvent, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api'
import { formatLocalDate } from './date'
import { DialogFrame } from './DialogFrame'
import { taskApi } from './api'
import { taskErrorMessage } from './useTaskDay'
import type { Task, TaskPlanInput, TaskPriority } from './types'

type FieldErrors = Partial<Record<'name' | 'startTime' | 'endTime' | 'group' | 'description', string>>

export function TaskFormDialog({ date, onClose, onSaved, onUnauthorized, task }: {
  date: string
  onClose: () => void
  onSaved: (task: Task) => void
  onUnauthorized: () => void
  task?: Task
}) {
  const [name, setName] = useState(task?.name ?? '')
  const [startTime, setStartTime] = useState(task?.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(task?.endTime ?? '10:00')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'normal')
  const [group, setGroup] = useState(task?.group ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const controllerRef = useRef<AbortController | undefined>(undefined)

  useEffect(() => () => controllerRef.current?.abort(), [])

  function validate() {
    const errors: FieldErrors = {}
    const normalizedName = name.trim()
    if (!normalizedName || normalizedName.length > 120) errors.name = 'Tên phải có từ 1 đến 120 ký tự.'
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime)) errors.startTime = 'Giờ bắt đầu phải có dạng HH:mm.'
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(endTime)) errors.endTime = 'Giờ kết thúc phải có dạng HH:mm.'
    if (!errors.startTime && !errors.endTime && endTime <= startTime) errors.endTime = 'Giờ kết thúc phải sau giờ bắt đầu.'
    if (group.trim().length > 80) errors.group = 'Nhóm không được vượt quá 80 ký tự.'
    if (description.trim().length > 2_000) errors.description = 'Mô tả không được vượt quá 2.000 ký tự.'
    return errors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return
    const errors = validate()
    setFieldErrors(errors)
    setError(undefined)
    if (Object.keys(errors).length) return

    const input: TaskPlanInput = {
      name,
      startTime,
      endTime,
      priority,
      group: group.trim() || null,
      description: description.trim() || null,
      repeat: 'none',
    }
    submittingRef.current = true
    setSubmitting(true)
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      const result = task
        ? await taskApi.update(task.id, {
            name: input.name,
            startTime: input.startTime,
            endTime: input.endTime,
            priority: input.priority,
            group: input.group,
            description: input.description,
          }, controller.signal)
        : await taskApi.create(date, input, controller.signal)
      if (controller.signal.aborted) return
      onSaved(result.task)
      onClose()
    } catch (submitError: unknown) {
      if (controller.signal.aborted) return
      if (submitError instanceof ApiError && submitError.status === 401) {
        onUnauthorized()
        return
      }
      setError(taskErrorMessage(submitError))
    } finally {
      if (!controller.signal.aborted) {
        submittingRef.current = false
        setSubmitting(false)
      }
    }
  }

  const titleId = task ? 'edit-task-title' : 'create-task-title'
  return <DialogFrame labelledBy={titleId} onClose={() => { if (!submitting) onClose() }} wide>
    <div className="dialog-heading">
      <p className="eyebrow">Lập kế hoạch</p>
      <h2 id={titleId}>{task ? 'Sửa công việc' : 'Tạo công việc'}</h2>
      <p>Ngày {formatLocalDate(date)}</p>
    </div>
    {error && <div className="form-message error" role="alert">{error}</div>}
    <form className="task-form" onSubmit={handleSubmit} noValidate>
      <div className="field field-span-2">
        <label htmlFor="task-name">Tên công việc</label>
        <input id="task-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} aria-invalid={Boolean(fieldErrors.name)} required />
        {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
      </div>
      <div className="field">
        <label htmlFor="task-start">Giờ bắt đầu</label>
        <input id="task-start" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} aria-invalid={Boolean(fieldErrors.startTime)} required />
        {fieldErrors.startTime && <span className="field-error">{fieldErrors.startTime}</span>}
      </div>
      <div className="field">
        <label htmlFor="task-end">Giờ kết thúc</label>
        <input id="task-end" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} aria-invalid={Boolean(fieldErrors.endTime)} required />
        {fieldErrors.endTime && <span className="field-error">{fieldErrors.endTime}</span>}
      </div>
      <div className="field">
        <label htmlFor="task-priority">Mức ưu tiên</label>
        <select id="task-priority" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
          <option value="low">Thấp</option><option value="normal">Bình thường</option><option value="high">Cao</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="task-group">Nhóm công việc</label>
        <input id="task-group" value={group} onChange={(event) => setGroup(event.target.value)} maxLength={80} placeholder="Không bắt buộc" aria-invalid={Boolean(fieldErrors.group)} />
        {fieldErrors.group && <span className="field-error">{fieldErrors.group}</span>}
      </div>
      <div className="field field-span-2">
        <label htmlFor="task-description">Mô tả</label>
        <textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2_000} rows={4} placeholder="Kế hoạch hoặc thông tin cần nhớ" aria-invalid={Boolean(fieldErrors.description)} />
        <span className="field-help">{description.length}/2.000 ký tự</span>
        {fieldErrors.description && <span className="field-error">{fieldErrors.description}</span>}
      </div>
      <div className="field field-span-2">
        <label htmlFor="task-repeat">Lặp lại</label>
        <select id="task-repeat" value="none" disabled><option value="none">Không lặp</option></select>
        <span className="field-help">Các lựa chọn lặp khác sẽ được bổ sung ở chặng sau.</span>
      </div>
      <div className="dialog-actions field-span-2">
        <button className="secondary-button" type="button" onClick={onClose} disabled={submitting}>Hủy</button>
        <button className="primary-button compact" type="submit" disabled={submitting} aria-busy={submitting}>{submitting ? 'Đang lưu…' : 'Lưu công việc'}</button>
      </div>
    </form>
  </DialogFrame>
}
