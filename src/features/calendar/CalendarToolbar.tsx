import type { CalendarView } from './types'

const views: { label: string; value: CalendarView }[] = [
  { label: 'Năm', value: 'year' },
  { label: 'Tháng', value: 'month' },
  { label: 'Tuần', value: 'week' },
  { label: 'Ngày', value: 'day' },
]

export function CalendarToolbar({ onCreate, onNext, onPrevious, onToday, onViewChange, title, view }: {
  onCreate: () => void
  onNext: () => void
  onPrevious: () => void
  onToday: () => void
  onViewChange: (view: CalendarView) => void
  title: string
  view: CalendarView
}) {
  return <section className="calendar-controls" aria-label="Điều khiển lịch">
    <div className="calendar-view-switch" aria-label="Chế độ xem">
      {views.map((item) => <button key={item.value} type="button" className={view === item.value ? 'active' : ''} aria-pressed={view === item.value} onClick={() => onViewChange(item.value)}>{item.label}</button>)}
    </div>
    <div className="calendar-period-nav">
      <button type="button" className="icon-button" onClick={onPrevious} aria-label="Khoảng thời gian trước">‹</button>
      <h2>{title}</h2>
      <button type="button" className="icon-button" onClick={onNext} aria-label="Khoảng thời gian sau">›</button>
    </div>
    <div className="calendar-control-actions">
      <button className="secondary-button" type="button" onClick={onToday}>Hôm nay</button>
      <button className="primary-button compact" type="button" onClick={onCreate}>+ Tạo công việc</button>
    </div>
  </section>
}
