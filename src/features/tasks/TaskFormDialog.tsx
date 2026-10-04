import { type FormEvent, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api'
import { addDays, formatLocalDate, parseLocalDate } from './date'
import { DialogFrame } from './DialogFrame'
import { taskApi } from './api'
import { taskErrorMessage } from './useTaskDay'
import type { Task, TaskPlanInput, TaskPriority, TaskRepeat, TaskSeriesInput } from './types'

type FieldErrors = Partial<Record<'name' | 'startTime' | 'endTime' | 'group' | 'description' | 'repeatEndDate' | 'weekdays', string>>

export type TaskFormSaveResult = {
  message: string
  task?: Task
}

const weekdayOptions = [
  { value: 1, label: 'Thứ Hai', short: 'T2' },
  { value: 2, label: 'Thứ Ba', short: 'T3' },
  { value: 3, label: 'Thứ Tư', short: 'T4' },
  { value: 4, label: 'Thứ Năm', short: 'T5' },
  { value: 5, label: 'Thứ Sáu', short: 'T6' },
  { value: 6, label: 'Thứ Bảy', short: 'T7' },
  { value: 7, label: 'Chủ nhật', short: 'CN' },
]

function isoWeekday(date: string) {
  const parsed = parseLocalDate(date)
  if (!parsed) return 1
  return parsed.getDay() === 0 ? 7 : parsed.getDay()
}

export function TaskFormDialog({ date, onClose, onSaved, onUnauthorized, task }: {
  date: string
  onClose: () => void
  onSaved: (result: TaskFormSaveResult) => void
  onUnauthorized: () => void
  task?: Task
}) {
  const [name, setName] = useState(task?.name ?? '')
  const [startTime, setStartTime] = useState(task?.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(task?.endTime ?? '10:00')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'normal')
  const [group, setGroup] = useState(task?.group ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [repeat, setRepeat] = useState<TaskRepeat>(task?.repeat ?? 'none')
  const [repeatEndDate, setRepeatEndDate] = useState('')
  const [weekdays, setWeekdays] = useState<number[]>([isoWeekday(date)])
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
    if (!task && repeat !== 'none') {
      if (!parseLocalDate(repeatEndDate)) errors.repeatEndDate = 'Hãy chọn ngày kết thúc hợp lệ.'
      else if (repeatEndDate < date) errors.repeatEndDate = 'Ngày kết thúc không được trước ngày bắt đầu.'
      else if (repeatEndDate > addDays(date, 365)) errors.repeatEndDate = 'Khoảng lặp không được vượt quá 366 ngày tính cả ngày bắt đầu.'
      if (repeat === 'weekly' && weekdays.length === 0) errors.weekdays = 'Hãy chọn ít nhất một thứ trong tuần.'
    }
    return errors
  }

  function changeRepeat(nextRepeat: TaskRepeat) {
    setRepeat(nextRepeat)
    if (nextRepeat === 'weekly' && weekdays.length === 0) setWeekdays([isoWeekday(date)])
    setFieldErrors((current) => ({ ...current, repeatEndDate: undefined, weekdays: undefined }))
  }

  function toggleWeekday(weekday: number) {
    setWeekdays((current) => current.includes(weekday)
      ? current.filter((value) => value !== weekday)
      : [...current, weekday].sort((left, right) => left - right))
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
      if (task) {
        const result = await taskApi.update(task.id, {
            name: input.name,
            startTime: input.startTime,
            endTime: input.endTime,
            priority: input.priority,
            group: input.group,
            description: input.description,
          }, controller.signal)
        if (controller.signal.aborted) return
        onSaved({ task: result.task, message: task.recurrence ? 'Đã lưu thay đổi cho lần này.' : 'Đã lưu thay đổi công việc.' })
      } else if (repeat === 'none') {
        const result = await taskApi.create(date, input, controller.signal)
        if (controller.signal.aborted) return
        onSaved({ task: result.task, message: 'Đã tạo công việc.' })
      } else {
        const seriesInput: TaskSeriesInput = {
          ...input,
          repeat: {
            frequency: repeat,
            endDate: repeatEndDate,
            ...(repeat === 'weekly' ? { weekdays } : {}),
          },
        }
        const result = await taskApi.createSeries(date, seriesInput, controller.signal)
        if (controller.signal.aborted) return
        onSaved({ message: `Đã tạo ${result.createdCount} lần thực hiện.` })
      }
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
  const editTitle = task?.recurrence ? 'Sửa lần này' : 'Sửa công việc'
  return <DialogFrame labelledBy={titleId} onClose={() => { if (!submitting) onClose() }} wide>
    <div className="dialog-heading">
      <p className="eyebrow">Lập kế hoạch</p>
      <h2 id={titleId}>{task ? editTitle : 'Tạo công việc'}</h2>
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
        <select id="task-repeat" value={repeat} onChange={(event) => changeRepeat(event.target.value as TaskRepeat)} disabled={Boolean(task)}>
          <option value="none">Không lặp</option>
          <option value="daily">Hằng ngày</option>
          <option value="weekly">Hằng tuần</option>
          <option value="monthly">Hằng tháng</option>
        </select>
        {task && <span className="field-help">Sửa lần này không thay đổi quy tắc của chuỗi.</span>}
      </div>
      {!task && repeat !== 'none' && <div className="recurrence-fields field-span-2">
        <div className="recurrence-summary"><strong>Ngày bắt đầu</strong><span>{formatLocalDate(date)}</span></div>
        <div className="field">
          <label htmlFor="task-repeat-end">Ngày kết thúc</label>
          <input id="task-repeat-end" type="date" min={date} max={addDays(date, 365)} value={repeatEndDate} onChange={(event) => setRepeatEndDate(event.target.value)} aria-invalid={Boolean(fieldErrors.repeatEndDate)} required />
          <span className="field-help">Bắt buộc, được tính trong chuỗi; tối đa 366 ngày tính cả ngày bắt đầu.</span>
          {fieldErrors.repeatEndDate && <span className="field-error">{fieldErrors.repeatEndDate}</span>}
        </div>
        {repeat === 'weekly' && <fieldset className="weekday-field" aria-describedby={fieldErrors.weekdays ? 'task-weekdays-error' : undefined}>
          <legend>Chọn thứ trong tuần</legend>
          <div className="weekday-options">{weekdayOptions.map((weekday) => <label key={weekday.value} title={weekday.label}>
            <input type="checkbox" checked={weekdays.includes(weekday.value)} onChange={() => toggleWeekday(weekday.value)} />
            <span>{weekday.short}</span>
          </label>)}</div>
          <span className="field-help">Mặc định là thứ của ngày bắt đầu; bạn có thể chọn nhiều thứ.</span>
          {fieldErrors.weekdays && <span id="task-weekdays-error" className="field-error">{fieldErrors.weekdays}</span>}
        </fieldset>}
        {repeat === 'monthly' && <div className="recurrence-note"><strong>Lặp vào ngày {Number(date.slice(8, 10))} mỗi tháng.</strong><span>Tháng không có ngày này sẽ được bỏ qua.</span></div>}
      </div>}
      <div className="dialog-actions field-span-2">
        <button className="secondary-button" type="button" onClick={onClose} disabled={submitting}>Hủy</button>
        <button className="primary-button compact" type="submit" disabled={submitting} aria-busy={submitting}>{submitting ? 'Đang lưu…' : task?.recurrence ? 'Lưu lần này' : 'Lưu công việc'}</button>
      </div>
    </form>
  </DialogFrame>
}
