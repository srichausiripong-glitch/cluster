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
