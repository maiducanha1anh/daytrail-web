import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api'
import { taskApi } from './api'
import type { GuardRegistrar } from '../../navigation'
import { TaskDetailDialog } from './TaskDetailDialog'
import { TaskFormDialog, type TaskFormSaveResult } from './TaskFormDialog'
import { MoveTaskDialog } from './MoveTaskDialog'
import { taskErrorMessage } from './useTaskDay'
import type { Task } from './types'

const priorityLabel = { low: 'Thấp', normal: 'Bình thường', high: 'Cao' } as const
const repeatLabel = { daily: 'Hằng ngày', weekly: 'Hằng tuần', monthly: 'Hằng tháng' } as const

export function TaskCollection({ acceptTask, allowCreate, date, error, loading, onPlanInCalendar, onSeriesChanged, onUnauthorized, registerNavigationGuard, reload, removeTask, tasks }: {
  acceptTask: (task: Task) => void
  allowCreate?: boolean
  date: string
  error?: string
  loading: boolean
  onPlanInCalendar?: () => void
  onSeriesChanged?: () => void
  onUnauthorized: () => void
  registerNavigationGuard?: GuardRegistrar
  reload: () => void
  removeTask: (id: string) => void
  tasks: Task[]
}) {
  const [selectedTask, setSelectedTask] = useState<Task>()
  const [editingTask, setEditingTask] = useState<Task>()
  const [movingTask, setMovingTask] = useState<Task>()
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string>()
  const [actionError, setActionError] = useState<string>()
  const [actionNotice, setActionNotice] = useState<string>()
  const deleteController = useRef<AbortController | undefined>(undefined)

  useEffect(() => () => deleteController.current?.abort(), [])

  async function handleDelete(task: Task) {
    const scope = task.recurrence ? 'Xóa lần này' : 'Xóa công việc'
    if (deletingId || !window.confirm(`${scope} “${task.name}”? Thao tác này không thể hoàn tác.`)) return
    const controller = new AbortController()
    deleteController.current = controller
    setDeletingId(task.id)
    setActionError(undefined)
    try {
      await taskApi.delete(task.id, controller.signal)
      if (controller.signal.aborted) return
      if (selectedTask?.id === task.id) setSelectedTask(undefined)
      setActionNotice(task.recurrence ? 'Đã xóa lần thực hiện này.' : 'Đã xóa công việc.')
      removeTask(task.id)
    } catch (deleteError: unknown) {
      if (controller.signal.aborted) return
      if (deleteError instanceof ApiError && deleteError.status === 401) {
        onUnauthorized()
        return
      }
      setActionError(taskErrorMessage(deleteError))
    } finally {
      if (!controller.signal.aborted) setDeletingId(undefined)
    }
  }

  function acceptAndSelect(task: Task) {
    acceptTask(task)
    setSelectedTask((current) => current?.id === task.id ? task : current)
  }

  function handleCreated(result: TaskFormSaveResult) {
    setActionNotice(result.message)
    if (result.task) acceptTask(result.task)
    else {
      reload()
      onSeriesChanged?.()
    }
  }

  function handleEdited(result: TaskFormSaveResult) {
    setActionNotice(result.message)
    if (result.task) acceptAndSelect(result.task)
  }

  function handleSeriesChanged(message: string) {
    setActionNotice(message)
    reload()
    onSeriesChanged?.()
  }

  return <>
    {allowCreate && <div className="collection-toolbar"><button className="primary-button compact" type="button" onClick={() => setCreating(true)}>+ Tạo công việc</button></div>}
    {actionNotice && <div className="form-message success collection-notice" role="status">{actionNotice}</div>}
    {(error || actionError) && <div className="load-error" role="alert"><p>{actionError ?? error}</p><button className="secondary-button" type="button" onClick={() => { setActionError(undefined); reload() }}>Thử lại</button></div>}
    {loading ? <div className="loading-block" aria-live="polite" aria-busy="true"><span className="spinner" aria-hidden="true" /><span>Đang tải công việc…</span></div> : tasks.length === 0 ? <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">✓</span><h3>Chưa có công việc trong ngày này</h3>
      <p>{allowCreate ? 'Bắt đầu bằng một kế hoạch vừa sức cho ngày đã chọn.' : 'Hãy sang Lịch để lập kế hoạch cho hôm nay.'}</p>
      {onPlanInCalendar && <button className="secondary-button" type="button" onClick={onPlanInCalendar}>Mở Lịch</button>}
    </div> : <ul className="task-list">
      {tasks.map((task) => <li key={task.id} className={task.completed ? 'is-completed' : ''}>
        <button className="task-main" type="button" onClick={() => setSelectedTask(task)}>
          <span className="task-time">{task.startTime}<small>{task.endTime}</small></span>
          <span className="task-copy"><strong>{task.name}</strong><span>{task.group ?? 'Chưa phân nhóm'} · Ưu tiên {priorityLabel[task.priority].toLowerCase()} {task.recurrence && <em className="repeat-badge">↻ {repeatLabel[task.recurrence.frequency]}</em>}</span></span>
          <span className={`task-status ${task.completed ? 'completed' : ''}`}>{task.completed ? 'Đã xong' : 'Chưa làm'}</span>
        </button>
        <div className="task-actions" aria-label={`Thao tác cho ${task.name}`}>
          <button type="button" onClick={() => setEditingTask(task)}>{task.recurrence ? 'Sửa lần này' : 'Sửa'}</button>
          <button type="button" onClick={() => setMovingTask(task)}>{task.recurrence ? 'Chuyển lần này' : 'Chuyển ngày'}</button>
          <button className="danger-link" type="button" onClick={() => void handleDelete(task)} disabled={deletingId === task.id}>{deletingId === task.id ? 'Đang xóa…' : task.recurrence ? 'Xóa lần này' : 'Xóa'}</button>
        </div>
      </li>)}
    </ul>}

    {creating && <TaskFormDialog date={date} onClose={() => setCreating(false)} onSaved={handleCreated} onUnauthorized={onUnauthorized} />}
    {editingTask && <TaskFormDialog date={editingTask.date} task={editingTask} onClose={() => setEditingTask(undefined)} onSaved={handleEdited} onUnauthorized={onUnauthorized} />}
    {movingTask && <MoveTaskDialog task={movingTask} onClose={() => setMovingTask(undefined)} onMoved={acceptAndSelect} onUnauthorized={onUnauthorized} />}
    {selectedTask && <TaskDetailDialog key={selectedTask.id} task={selectedTask} onClose={() => setSelectedTask(undefined)} onSeriesChanged={handleSeriesChanged} onTaskChanged={acceptAndSelect} onUnauthorized={onUnauthorized} registerNavigationGuard={registerNavigationGuard} />}
  </>
}
