import { useMemo, useState } from 'react'
import { TaskCollection } from '../tasks/TaskCollection'
import type { GuardRegistrar } from '../tasks/TaskDetailDialog'
import { formatLocalDate, monthLabel, toLocalDateKey, todayKey } from '../tasks/date'
import { useTaskDay } from '../tasks/useTaskDay'

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

function monthCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const offset = (firstDay.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    return { key: toLocalDateKey(date), day: date.getDate(), inMonth: date.getMonth() === month }
  })
}

export function CalendarPage({ onUnauthorized, registerNavigationGuard, requestNavigation }: {
  onUnauthorized: () => void
  registerNavigationGuard: GuardRegistrar
  requestNavigation: (next: () => void) => void
}) {
  const today = todayKey()
  const [selectedDate, setSelectedDate] = useState(today)
  const initial = new Date()
  const [visibleMonth, setVisibleMonth] = useState({ year: initial.getFullYear(), month: initial.getMonth() })
  const [calendarOpen, setCalendarOpen] = useState(false)
  const cells = useMemo(() => monthCells(visibleMonth.year, visibleMonth.month), [visibleMonth])
  const taskDay = useTaskDay(selectedDate, onUnauthorized)

  function changeMonth(offset: number) {
    setVisibleMonth((current) => {
      const date = new Date(current.year, current.month + offset, 1)
      return { year: date.getFullYear(), month: date.getMonth() }
    })
  }

  function selectDate(date: string) {
    requestNavigation(() => {
      setSelectedDate(date)
      const [year, month] = date.split('-').map(Number)
      setVisibleMonth({ year, month: month - 1 })
      setCalendarOpen(false)
    })
  }

  return <div className="calendar-page page-stack">
    <header className="page-heading calendar-page-heading"><div><p className="eyebrow">Lịch</p><h1>Lập kế hoạch theo ngày</h1><p>Chọn ngày quá khứ, hôm nay hoặc tương lai để xem và tạo công việc.</p></div><button className="secondary-button" type="button" onClick={() => selectDate(today)}>Về hôm nay</button></header>
    <button className="calendar-toggle" type="button" aria-expanded={calendarOpen} onClick={() => setCalendarOpen((open) => !open)}>{calendarOpen ? 'Thu gọn lịch tháng' : 'Mở lịch tháng'} · {monthLabel(visibleMonth.year, visibleMonth.month)}</button>

    <div className="calendar-layout">
      <aside className={`mini-calendar ${calendarOpen ? 'is-open' : ''}`} aria-label="Chọn ngày">
        <div className="month-toolbar"><button type="button" onClick={() => changeMonth(-1)} aria-label="Tháng trước">‹</button><strong>{monthLabel(visibleMonth.year, visibleMonth.month)}</strong><button type="button" onClick={() => changeMonth(1)} aria-label="Tháng sau">›</button></div>
        <div className="weekday-row">{weekDays.map((day) => <span key={day}>{day}</span>)}</div>
        <div className="month-grid">{cells.map((cell) => <button
          type="button"
          key={cell.key}
          data-date={cell.key}
          className={`${cell.inMonth ? '' : 'outside'} ${cell.key === selectedDate ? 'selected' : ''} ${cell.key === today ? 'today' : ''}`}
          onClick={() => selectDate(cell.key)}
          aria-label={formatLocalDate(cell.key)}
          aria-pressed={cell.key === selectedDate}
        >{cell.day}</button>)}</div>
      </aside>

      <section className="content-card calendar-day" aria-labelledby="selected-day-title">
        <div className="section-heading"><div><p className="eyebrow">Ngày đã chọn</p><h2 id="selected-day-title">{formatLocalDate(selectedDate)}</h2><p>Tạo và quản lý kế hoạch trong ngày này.</p></div>{taskDay.refreshing && <span className="refresh-note">Đang cập nhật…</span>}</div>
        <TaskCollection
          allowCreate
          date={selectedDate}
          tasks={taskDay.tasks}
          loading={taskDay.loading}
          error={taskDay.error}
          reload={taskDay.reload}
          acceptTask={taskDay.acceptTask}
          removeTask={taskDay.removeTask}
          onUnauthorized={onUnauthorized}
          registerNavigationGuard={registerNavigationGuard}
        />
      </section>
    </div>
  </div>
}
