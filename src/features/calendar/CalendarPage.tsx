import { useMemo, useState } from 'react'
import { TaskFormDialog } from '../tasks/TaskFormDialog'
import type { GuardRegistrar } from '../../navigation'
import { addDays, daysInMonth, endOfWeek, formatLocalDate, monthLabel, moveToMonth, moveToYear, parseLocalDate, startOfWeek, toLocalDateKey, todayKey } from '../tasks/date'
import { useTaskDay } from '../tasks/useTaskDay'
import type { Task } from '../tasks/types'
import { CalendarToolbar } from './CalendarToolbar'
import { DayView, MonthView, WeekView, YearView } from './CalendarViews'
import { MiniCalendar } from './MiniCalendar'
import type { CalendarView } from './types'
import { useCalendarRange } from './useCalendarRange'

function viewRange(view: CalendarView, selectedDate: string) {
  const date = parseLocalDate(selectedDate) ?? new Date()
  const year = date.getFullYear()
  const month = date.getMonth()
  if (view === 'year') return { from: `${year}-01-01`, to: `${year}-12-31` }
  if (view === 'month') return {
    from: toLocalDateKey(new Date(year, month, 1)),
    to: toLocalDateKey(new Date(year, month, daysInMonth(year, month))),
  }
  if (view === 'week') return { from: startOfWeek(selectedDate), to: endOfWeek(selectedDate) }
  return { from: selectedDate, to: selectedDate }
}

function viewTitle(view: CalendarView, selectedDate: string) {
  const date = parseLocalDate(selectedDate) ?? new Date()
  if (view === 'year') return `Năm ${date.getFullYear()}`
  if (view === 'month') return monthLabel(date.getFullYear(), date.getMonth())
  if (view === 'week') {
    const from = startOfWeek(selectedDate)
    const to = endOfWeek(selectedDate)
    return `${formatLocalDate(from, { day: 'numeric', month: 'short' })} – ${formatLocalDate(to, { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  return formatLocalDate(selectedDate)
}

function shiftForView(view: CalendarView, selectedDate: string, direction: -1 | 1) {
  if (view === 'year') return moveToYear(selectedDate, direction)
  if (view === 'month') return moveToMonth(selectedDate, direction)
  if (view === 'week') return addDays(selectedDate, direction * 7)
  return addDays(selectedDate, direction)
}

export function CalendarPage({ initialJournalDate, onUnauthorized, registerNavigationGuard, requestNavigation }: {
  initialJournalDate?: string
  onUnauthorized: () => void
  registerNavigationGuard: GuardRegistrar
  requestNavigation: (next: () => void) => void
}) {
  const today = todayKey()
  const firstDate = initialJournalDate && parseLocalDate(initialJournalDate) ? initialJournalDate : today
  const initialDate = parseLocalDate(firstDate) ?? new Date()
  const [selectedDate, setSelectedDate] = useState(firstDate)
  const [view, setView] = useState<CalendarView>(initialJournalDate ? 'day' : 'month')
  const [miniMonth, setMiniMonth] = useState({ year: initialDate.getFullYear(), month: initialDate.getMonth() })
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState<string>()
  const [revision, setRevision] = useState(0)
  const range = useMemo(() => viewRange(view, selectedDate), [selectedDate, view])
  const rangeData = useCalendarRange(range.from, range.to, view === 'week', revision, onUnauthorized)
  const taskDay = useTaskDay(selectedDate, onUnauthorized)
  const selected = parseLocalDate(selectedDate) ?? initialDate

  function navigate(action: () => void) {
    requestNavigation(action)
  }

  function setDateAndMiniMonth(date: string) {
    setSelectedDate(date)
    const parsed = parseLocalDate(date)
    if (parsed) setMiniMonth({ year: parsed.getFullYear(), month: parsed.getMonth() })
  }

  function selectDate(date: string) {
    navigate(() => {
      setDateAndMiniMonth(date)
      setCalendarOpen(false)
    })
  }

  function selectView(nextView: CalendarView) {
    if (nextView === view) return
    navigate(() => setView(nextView))
  }

  function shift(direction: -1 | 1) {
    navigate(() => setDateAndMiniMonth(shiftForView(view, selectedDate, direction)))
  }

  function goToday() {
    navigate(() => setDateAndMiniMonth(today))
  }

  function openMonth(month: number) {
    navigate(() => {
      const day = Math.min(selected.getDate(), daysInMonth(selected.getFullYear(), month))
      setDateAndMiniMonth(toLocalDateKey(new Date(selected.getFullYear(), month, day)))
      setView('month')
    })
  }

  function openDay(date = selectedDate) {
    navigate(() => {
      setDateAndMiniMonth(date)
      setView('day')
    })
  }

  function dataChanged() {
    setRevision((current) => current + 1)
  }

  function seriesChanged() {
    taskDay.reload()
    dataChanged()
  }

  function acceptTask(task: Task) {
    taskDay.acceptTask(task)
    dataChanged()
  }

  function removeTask(taskId: string) {
    taskDay.removeTask(taskId)
    dataChanged()
  }

  function acceptWeekTask(task: Task) {
    if (task.date === selectedDate) taskDay.acceptTask(task)
    dataChanged()
  }

  return <div className="calendar-page page-stack">
    <header className="page-heading calendar-page-heading"><div><p className="eyebrow">Lịch</p><h1>Lập kế hoạch</h1></div></header>
    {notice && <div className="form-message success page-notice" role="status">{notice}</div>}
    <button className="calendar-toggle" type="button" aria-expanded={calendarOpen} onClick={() => setCalendarOpen((open) => !open)}>{calendarOpen ? 'Thu gọn lịch chọn ngày' : 'Mở lịch chọn ngày'} · {monthLabel(miniMonth.year, miniMonth.month)}</button>

    <div className="calendar-layout calendar-layout-expanded">
      <MiniCalendar calendarOpen={calendarOpen} year={miniMonth.year} month={miniMonth.month} selectedDate={selectedDate} today={today} onChangeMonth={(offset) => setMiniMonth((current) => {
        const date = new Date(current.year, current.month + offset, 1)
        return { year: date.getFullYear(), month: date.getMonth() }
      })} onSelectDate={selectDate} />
      <div className="calendar-workspace">
        <CalendarToolbar view={view} title={viewTitle(view, selectedDate)} onViewChange={selectView} onPrevious={() => shift(-1)} onNext={() => shift(1)} onToday={goToday} onCreate={() => setCreating(true)} />
        {view === 'year' && <YearView year={selected.getFullYear()} summaries={rangeData.summaries} loading={rangeData.loading} error={rangeData.error} onRetry={rangeData.reload} onOpenMonth={openMonth} />}
        {view === 'month' && <MonthView year={selected.getFullYear()} month={selected.getMonth()} selectedDate={selectedDate} today={today} summaries={rangeData.summaries} loading={rangeData.loading} error={rangeData.error} onRetry={rangeData.reload} onSelectDate={selectDate} onOpenDay={() => openDay()} taskDay={taskDay} acceptTask={acceptTask} removeTask={removeTask} onSeriesChanged={seriesChanged} onUnauthorized={onUnauthorized} registerNavigationGuard={registerNavigationGuard} />}
        {view === 'week' && <WeekView from={range.from} to={range.to} today={today} tasks={rangeData.tasks} loading={rangeData.loading} error={rangeData.error} onRetry={rangeData.reload} onOpenDay={openDay} onTaskChanged={acceptWeekTask} onSeriesChanged={seriesChanged} onUnauthorized={onUnauthorized} registerNavigationGuard={registerNavigationGuard} />}
        {view === 'day' && <DayView selectedDate={selectedDate} taskDay={taskDay} acceptTask={acceptTask} removeTask={removeTask} onSeriesChanged={seriesChanged} onUnauthorized={onUnauthorized} registerNavigationGuard={registerNavigationGuard} />}
      </div>
    </div>

    {creating && <TaskFormDialog date={selectedDate} onClose={() => setCreating(false)} onSaved={(result) => {
      setNotice(result.message)
      if (result.task) acceptTask(result.task)
      else seriesChanged()
    }} onUnauthorized={onUnauthorized} />}
  </div>
}
