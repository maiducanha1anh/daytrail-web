import { useState } from 'react'
import type { GuardRegistrar } from '../../navigation'
import { JournalEditor } from '../journals/JournalEditor'
import { TaskCollection } from '../tasks/TaskCollection'
import { TaskFormDialog, type TaskFormSaveResult } from '../tasks/TaskFormDialog'
import { formatLocalDate, todayKey } from '../tasks/date'
import { useTaskDay } from '../tasks/useTaskDay'

export function TodayPage({ onOpenCalendar, onUnauthorized, registerNavigationGuard }: {
  onOpenCalendar: () => void
  onUnauthorized: () => void
  registerNavigationGuard: GuardRegistrar
}) {
  const date = todayKey()
  const taskDay = useTaskDay(date, onUnauthorized)
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState<string>()

  function created(result: TaskFormSaveResult) {
    setNotice(result.message)
    if (result.task) taskDay.acceptTask(result.task)
    else taskDay.reload()
  }

  return <div className="today-page page-stack">
    <header className="page-heading today-heading"><div><h1>Hôm nay</h1><p>{formatLocalDate(date)}</p></div><div className="page-heading-actions">{taskDay.refreshing && <span className="refresh-note">Đang cập nhật…</span>}<button className="primary-button compact" type="button" onClick={() => setCreating(true)}>＋ Công việc</button></div></header>
    {notice && <div className="form-message success" role="status">{notice}</div>}

    <div className="today-columns"><section className="content-card today-tasks-card" aria-labelledby="today-tasks-title">
      <div className="section-heading"><h2 id="today-tasks-title">Công việc</h2><span className="count-badge">{taskDay.tasks.length} việc</span></div>
      <TaskCollection
        date={date}
        tasks={taskDay.tasks}
        loading={taskDay.loading}
        error={taskDay.error}
        reload={taskDay.reload}
        acceptTask={taskDay.acceptTask}
        removeTask={taskDay.removeTask}
        onPlanInCalendar={onOpenCalendar}
        onUnauthorized={onUnauthorized}
        registerNavigationGuard={registerNavigationGuard}
        showFilters
      />
      <div className="today-progress"><span>{taskDay.summary.completed}/{taskDay.summary.total} hoàn thành</span><div className="progress-track"><span style={{ width: `${taskDay.summary.completionPercentage}%` }} /></div></div>
    </section>

    <JournalEditor key={date} date={date} onUnauthorized={onUnauthorized} registerNavigationGuard={registerNavigationGuard} /></div>

    <section className="content-card today-summary-card" aria-labelledby="summary-title">
      <div className="section-heading"><h2 id="summary-title">Tổng quan ngày</h2></div>
      {taskDay.loading ? <div className="summary-loading">Đang tải tổng quan…</div> : taskDay.summary.total === 0 ? <div className="summary-empty"><strong>Ngày này chưa có công việc.</strong></div> : <div className="summary-grid">
        <div><span>Tổng số</span><strong>{taskDay.summary.total}</strong></div>
        <div><span>Đã hoàn thành</span><strong>{taskDay.summary.completed}</strong></div>
        <div><span>Chưa làm</span><strong>{taskDay.summary.incomplete}</strong></div>
        <div className="progress-summary"><span>Tiến độ</span><strong>{taskDay.summary.completionPercentage}%</strong><div className="progress-track" aria-label={`${taskDay.summary.completionPercentage}% hoàn thành`}><span style={{ width: `${taskDay.summary.completionPercentage}%` }} /></div></div>
      </div>}
    </section>
    {creating && <TaskFormDialog date={date} onClose={() => setCreating(false)} onSaved={created} onUnauthorized={onUnauthorized} />}
  </div>
}
