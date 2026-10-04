const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function toLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayKey() {
  return toLocalDateKey(new Date())
}

export function parseLocalDate(value: string) {
  const match = DATE_PATTERN.exec(value)
  if (!match) return undefined
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return toLocalDateKey(date) === value ? date : undefined
}

export function formatLocalDate(value: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) {
  const date = parseLocalDate(value)
  return date ? new Intl.DateTimeFormat('vi-VN', options).format(date) : value
}

export function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1))
}

export function addDays(value: string, amount: number) {
  const date = parseLocalDate(value)
  if (!date) return value
  return toLocalDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount))
}

export function startOfWeek(value: string) {
  const date = parseLocalDate(value)
  if (!date) return value
  const mondayOffset = (date.getDay() + 6) % 7
  return toLocalDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - mondayOffset))
}

export function endOfWeek(value: string) {
  return addDays(startOfWeek(value), 6)
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

export function moveToMonth(value: string, offset: number) {
  const date = parseLocalDate(value)
  if (!date) return value
  const targetFirst = new Date(date.getFullYear(), date.getMonth() + offset, 1)
  const day = Math.min(date.getDate(), daysInMonth(targetFirst.getFullYear(), targetFirst.getMonth()))
  return toLocalDateKey(new Date(targetFirst.getFullYear(), targetFirst.getMonth(), day))
}

export function moveToYear(value: string, offset: number) {
  const date = parseLocalDate(value)
  if (!date) return value
  const year = date.getFullYear() + offset
  const day = Math.min(date.getDate(), daysInMonth(year, date.getMonth()))
  return toLocalDateKey(new Date(year, date.getMonth(), day))
}

export function dateRange(from: string, to: string) {
  const output: string[] = []
  let current = from
  while (current <= to) {
    output.push(current)
    current = addDays(current, 1)
  }
  return output
}

export function monthCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const offset = (firstDay.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    return {
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      key: toLocalDateKey(date),
    }
  })
}
