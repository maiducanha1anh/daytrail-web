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
