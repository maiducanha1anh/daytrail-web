import type { GuardRegistrar } from '../../navigation'
import { JournalEditor } from '../journals/JournalEditor'
import { TaskCollection } from '../tasks/TaskCollection'
import { formatLocalDate, todayKey } from '../tasks/date'
import { useTaskDay } from '../tasks/useTaskDay'

export function TodayPage({ onOpenCalendar, onUnauthorized, registerNavigationGuard }: {
  onOpenCalendar: () => void
  onUnauthorized: () => void
  registerNavigationGuard: GuardRegistrar
}) {
  const date = todayKey()
  const taskDay = useTaskDay(date, onUnauthorized)

  return <div className="today-page page-stack">
    <header className="page-heading"><div><p className="eyebrow">Hôm nay</p><h1>{formatLocalDate(date)}</h1><p>Tập trung vào những việc đã lên kế hoạch và ghi lại điều đáng nhớ.</p></div>{taskDay.refreshing && <span className="refresh-note">Đang cập nhật…</span>}</header>

    <section className="content-card" aria-labelledby="today-tasks-title">
      <div className="section-heading"><div><h2 id="today-tasks-title">Danh sách công việc</h2><p>Mở một công việc để xem chi tiết, viết note hoặc cập nhật trạng thái.</p></div><span className="count-badge">{taskDay.tasks.length} việc</span></div>
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
      />
    </section>

    <JournalEditor key={date} date={date} onUnauthorized={onUnauthorized} registerNavigationGuard={registerNavigationGuard} />

    <section className="content-card" aria-labelledby="summary-title">
      <div className="section-heading"><div><h2 id="summary-title">Tổng quan ngày</h2><p>Cập nhật từ dữ liệu công việc đã lưu trên backend.</p></div></div>
      {taskDay.loading ? <div className="summary-loading">Đang tải tổng quan…</div> : taskDay.summary.total === 0 ? <div className="summary-empty"><strong>Ngày này chưa có công việc.</strong><span>Phần trăm hoàn thành được để trống thay vì coi là một ngày 0%.</span></div> : <div className="summary-grid">
        <div><span>Tổng số</span><strong>{taskDay.summary.total}</strong></div>
        <div><span>Đã hoàn thành</span><strong>{taskDay.summary.completed}</strong></div>
        <div><span>Chưa làm</span><strong>{taskDay.summary.incomplete}</strong></div>
        <div className="progress-summary"><span>Tiến độ</span><strong>{taskDay.summary.completionPercentage}%</strong><div className="progress-track" aria-label={`${taskDay.summary.completionPercentage}% hoàn thành`}><span style={{ width: `${taskDay.summary.completionPercentage}%` }} /></div></div>
      </div>}
    </section>
  </div>
}
