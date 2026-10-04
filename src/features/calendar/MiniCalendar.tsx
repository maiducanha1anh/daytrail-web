import { useMemo } from 'react'
import { formatLocalDate, monthCells, monthLabel } from '../tasks/date'

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export function MiniCalendar({ calendarOpen, month, onChangeMonth, onSelectDate, selectedDate, today, year }: {
  calendarOpen: boolean
  month: number
  onChangeMonth: (offset: number) => void
  onSelectDate: (date: string) => void
  selectedDate: string
  today: string
  year: number
}) {
  const cells = useMemo(() => monthCells(year, month), [month, year])
  return <aside className={`mini-calendar ${calendarOpen ? 'is-open' : ''}`} aria-label="Chọn ngày">
    <div className="month-toolbar"><button type="button" onClick={() => onChangeMonth(-1)} aria-label="Tháng trước">‹</button><strong>{monthLabel(year, month)}</strong><button type="button" onClick={() => onChangeMonth(1)} aria-label="Tháng sau">›</button></div>
    <div className="weekday-row">{weekDays.map((day) => <span key={day}>{day}</span>)}</div>
    <div className="month-grid">{cells.map((cell) => <button
      type="button"
      key={cell.key}
      data-date={cell.key}
      className={`${cell.inMonth ? '' : 'outside'} ${cell.key === selectedDate ? 'selected' : ''} ${cell.key === today ? 'today' : ''}`}
      onClick={() => onSelectDate(cell.key)}
      aria-label={formatLocalDate(cell.key)}
      aria-pressed={cell.key === selectedDate}
    >{cell.day}</button>)}</div>
  </aside>
}
