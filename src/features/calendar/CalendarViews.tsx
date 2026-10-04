import { useMemo, useState } from 'react'
import { TaskCollection } from '../tasks/TaskCollection'
import { TaskDetailDialog, type GuardRegistrar } from '../tasks/TaskDetailDialog'
import { dateRange, formatLocalDate, monthCells, monthLabel } from '../tasks/date'
import type { useTaskDay } from '../tasks/useTaskDay'
import type { Task, TaskSummary } from '../tasks/types'

type TaskDayState = ReturnType<typeof useTaskDay>

const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const monthWeekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const repeatLabel = { daily: 'Hằng ngày', weekly: 'Hằng tuần', monthly: 'Hằng tháng' } as const

function summaryMap(summaries: TaskSummary[]) {
  return new Map(summaries.map((summary) => [summary.date, summary]))
}

function RangeFeedback({ error, loading, onRetry }: { error?: string; loading: boolean; onRetry: () => void }) {
  if (error) return <div className="load-error" role="alert"><p>{error}</p><button className="secondary-button" type="button" onClick={onRetry}>Thử lại</button></div>
  if (loading) return <div className="loading-block calendar-loading" aria-live="polite" aria-busy="true"><span className="spinner" aria-hidden="true" /><span>Đang tải dữ liệu lịch…</span></div>
  return null
}

function SummaryCards({ summary }: { summary: TaskSummary }) {
  if (summary.total === 0) return <div className="summary-empty"><strong>Ngày này chưa có công việc.</strong><span>Ngày trống không được tính là hoàn thành 100%.</span></div>
  return <div className="summary-grid">
    <div><span>Tổng số</span><strong>{summary.total}</strong></div>
    <div><span>Đã hoàn thành</span><strong>{summary.completed}</strong></div>
    <div><span>Chưa làm</span><strong>{summary.incomplete}</strong></div>
    <div className="progress-summary"><span>Tiến độ</span><strong>{summary.completionPercentage}%</strong><div className="progress-track" aria-label={`${summary.completionPercentage}% hoàn thành`}><span style={{ width: `${summary.completionPercentage}%` }} /></div></div>
  </div>
}

export function YearView({ error, loading, onOpenMonth, onRetry, summaries, year }: {
  error?: string
  loading: boolean
  onOpenMonth: (month: number) => void
  onRetry: () => void
  summaries: TaskSummary[]
  year: number
}) {
  const months = useMemo(() => Array.from({ length: 12 }, (_, month) => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`
    const monthSummaries = summaries.filter((summary) => summary.date.startsWith(prefix))
    const total = monthSummaries.reduce((sum, summary) => sum + summary.total, 0)
    const completed = monthSummaries.reduce((sum, summary) => sum + summary.completed, 0)
    return { month, total, completed, percentage: total === 0 ? 0 : Math.round((completed / total) * 100) }
  }), [summaries, year])

  return <section className="content-card calendar-main-view" aria-labelledby="year-view-title">
    <div className="section-heading"><div><h2 id="year-view-title">Tổng quan năm {year}</h2><p>Chỉ tải số liệu tổng hợp, không tải mô tả hoặc note công việc.</p></div></div>
    <RangeFeedback error={error} loading={loading} onRetry={onRetry} />
    {!loading && !error && <div className="year-grid">{months.map((item) => <button key={item.month} type="button" className="year-month-card" onClick={() => onOpenMonth(item.month)}>
      <span>{monthLabel(year, item.month)}</span>
      {item.total === 0 ? <strong>Chưa có việc</strong> : <><strong>{item.total} công việc</strong><small>{item.completed}/{item.total} hoàn thành · {item.percentage}%</small><span className="month-progress"><i style={{ width: `${item.percentage}%` }} /></span></>}
    </button>)}</div>}
  </section>
}

export function MonthView({ acceptTask, error, loading, onOpenDay, onRetry, onSelectDate, onSeriesChanged, onUnauthorized, registerNavigationGuard, removeTask, selectedDate, summaries, taskDay, today, year, month }: {
  acceptTask: (task: Task) => void
  error?: string
  loading: boolean
  month: number
  onOpenDay: () => void
  onRetry: () => void
  onSelectDate: (date: string) => void
  onSeriesChanged: () => void
  onUnauthorized: () => void
  registerNavigationGuard: GuardRegistrar
  removeTask: (id: string) => void
  selectedDate: string
  summaries: TaskSummary[]
  taskDay: TaskDayState
  today: string
  year: number
}) {
  const cells = useMemo(() => monthCells(year, month), [month, year])
  const byDate = useMemo(() => summaryMap(summaries), [summaries])
  return <div className="calendar-view-stack">
    <section className="content-card calendar-main-view" aria-labelledby="month-view-title">
      <div className="section-heading"><div><h2 id="month-view-title">{monthLabel(year, month)}</h2><p>Tuần bắt đầu từ thứ Hai. Chọn một ngày để xem danh sách bên dưới.</p></div></div>
      <RangeFeedback error={error} loading={loading} onRetry={onRetry} />
      <div className="month-view-weekdays" aria-hidden="true">{monthWeekDays.map((day) => <span key={day}>{day}</span>)}</div>
      <div className="month-view-grid">{cells.map((cell) => {
        const summary = byDate.get(cell.key)
        const past = cell.key < today
        return <button key={cell.key} type="button" className={`${cell.inMonth ? '' : 'outside'} ${cell.key === selectedDate ? 'selected' : ''} ${cell.key === today ? 'today' : ''}`} onClick={() => onSelectDate(cell.key)} aria-pressed={cell.key === selectedDate} aria-label={formatLocalDate(cell.key)}>
          <span className="month-day-number">{cell.day}</span>
          {cell.inMonth && summary && summary.total > 0 && <span className="month-day-meta">{past ? `${summary.completed}/${summary.total} · ${summary.completionPercentage}%` : `${summary.total} việc`}</span>}
          {cell.inMonth && !summary && <span className="month-day-empty">Không có việc</span>}
        </button>
      })}</div>
    </section>
    <section className="content-card calendar-selected-day" aria-labelledby="month-selected-title">
      <div className="section-heading"><div><p className="eyebrow">Ngày đã chọn</p><h2 id="month-selected-title">{formatLocalDate(selectedDate)}</h2><p>Xem nhanh công việc hoặc mở chế độ Ngày để có tổng quan đầy đủ.</p></div><button className="secondary-button" type="button" onClick={onOpenDay}>Mở chế độ Ngày</button></div>
      <TaskCollection date={selectedDate} tasks={taskDay.tasks} loading={taskDay.loading} error={taskDay.error} reload={taskDay.reload} acceptTask={acceptTask} removeTask={removeTask} onSeriesChanged={onSeriesChanged} onUnauthorized={onUnauthorized} registerNavigationGuard={registerNavigationGuard} />
    </section>
  </div>
}

export function WeekView({ error, from, loading, onOpenDay, onRetry, onSeriesChanged, onTaskChanged, onUnauthorized, registerNavigationGuard, tasks, to, today }: {
  error?: string
  from: string
  loading: boolean
  onOpenDay: (date: string) => void
  onRetry: () => void
  onSeriesChanged: () => void
  onTaskChanged: (task: Task) => void
  onUnauthorized: () => void
  registerNavigationGuard: GuardRegistrar
  tasks: Task[]
  to: string
  today: string
}) {
  const [selectedTask, setSelectedTask] = useState<Task>()
  const [seriesNotice, setSeriesNotice] = useState<string>()
  const dates = useMemo(() => dateRange(from, to), [from, to])
  const grouped = useMemo(() => new Map(dates.map((date) => [date, tasks.filter((task) => task.date === date).sort((left, right) => left.startTime.localeCompare(right.startTime) || left.id.localeCompare(right.id))])), [dates, tasks])

  function acceptTask(task: Task) {
    setSelectedTask(task)
    onTaskChanged(task)
  }

  return <section className="content-card calendar-main-view" aria-labelledby="week-view-title">
    <div className="section-heading"><div><h2 id="week-view-title">Kế hoạch trong tuần</h2><p>Công việc trùng giờ được xếp thành các thẻ riêng, không che lên nhau.</p></div></div>
    {seriesNotice && <div className="form-message success collection-notice" role="status">{seriesNotice}</div>}
    <RangeFeedback error={error} loading={loading} onRetry={onRetry} />
    {!loading && !error && <div className="week-board">{dates.map((date, index) => <section key={date} className={`week-day-column ${date === today ? 'today' : ''}`}>
      <button className="week-day-heading" type="button" onClick={() => onOpenDay(date)}><span>{weekDays[index]}</span><strong>{formatLocalDate(date, { day: '2-digit', month: '2-digit' })}</strong></button>
      <div className="week-task-stack">{(grouped.get(date) ?? []).map((task) => <button key={task.id} type="button" className={`week-task ${task.completed ? 'completed' : ''}`} onClick={() => setSelectedTask(task)}>
        <span>{task.startTime}–{task.endTime}</span><strong>{task.name}</strong><small>{task.completed ? 'Đã hoàn thành' : 'Chưa làm'}{task.recurrence ? ` · ↻ ${repeatLabel[task.recurrence.frequency]}` : ''}</small>
      </button>)}{(grouped.get(date) ?? []).length === 0 && <span className="week-empty">Không có việc</span>}</div>
    </section>)}</div>}
    {selectedTask && <TaskDetailDialog key={selectedTask.id} task={selectedTask} onClose={() => setSelectedTask(undefined)} onSeriesChanged={(message) => { setSeriesNotice(message); onSeriesChanged() }} onTaskChanged={acceptTask} onUnauthorized={onUnauthorized} registerNavigationGuard={registerNavigationGuard} />}
  </section>
}

export function DayView({ acceptTask, onSeriesChanged, onUnauthorized, registerNavigationGuard, removeTask, selectedDate, taskDay }: {
  acceptTask: (task: Task) => void
  onUnauthorized: () => void
  onSeriesChanged: () => void
  registerNavigationGuard: GuardRegistrar
  removeTask: (id: string) => void
  selectedDate: string
  taskDay: TaskDayState
}) {
  return <div className="calendar-view-stack">
    <section className="content-card calendar-selected-day" aria-labelledby="day-view-title">
      <div className="section-heading"><div><p className="eyebrow">Chế độ Ngày</p><h2 id="day-view-title">{formatLocalDate(selectedDate)}</h2><p>Công việc được sắp theo giờ bắt đầu.</p></div>{taskDay.refreshing && <span className="refresh-note">Đang cập nhật…</span>}</div>
      <TaskCollection date={selectedDate} tasks={taskDay.tasks} loading={taskDay.loading} error={taskDay.error} reload={taskDay.reload} acceptTask={acceptTask} removeTask={removeTask} onSeriesChanged={onSeriesChanged} onUnauthorized={onUnauthorized} registerNavigationGuard={registerNavigationGuard} />
    </section>
    <section className="content-card" aria-labelledby="day-summary-title"><div className="section-heading"><div><h2 id="day-summary-title">Tổng quan ngày</h2><p>Số liệu cập nhật từ toàn bộ công việc trong ngày.</p></div></div>{taskDay.loading ? <div className="summary-loading">Đang tải tổng quan…</div> : <SummaryCards summary={taskDay.summary} />}</section>
  </div>
}
