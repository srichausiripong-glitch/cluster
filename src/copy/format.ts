import { mondayDate } from '../domain/weeks'

const THAI_DATE = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })

/** A date in Thai wording, Buddhist era, e.g. "3 ก.พ. 2570". */
export function formatThaiDate(date: Date): string {
  return THAI_DATE.format(date)
}

const THAI_DAY = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
/** A day kept as YYYY-MM-DD, in Thai wording: the same day on every phone, whatever its zone. */
export function formatThaiDay(day: string): string {
  return THAI_DAY.format(new Date(`${day}T00:00:00Z`))
}

const THAI_DAY_MONTH = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', timeZone: 'UTC' })
/** An ISO week as its Monday to Sunday, e.g. "16–22 พ.ย." or "30 พ.ย.–6 ธ.ค.", naming the month once when both share it. */
export function formatThaiWeek(week: string): string {
  const monday = mondayDate(week)
  const sunday = new Date(monday.getTime() + 6 * 86_400_000)
  const [from, to] = [THAI_DAY_MONTH.format(monday), THAI_DAY_MONTH.format(sunday)]
  return monday.getUTCMonth() === sunday.getUTCMonth() ? `${monday.getUTCDate()}–${to}` : `${from}–${to}`
}
