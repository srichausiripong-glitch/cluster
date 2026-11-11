const THAI_DATE = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })

/** A date in Thai wording, Buddhist era, e.g. "3 ก.พ. 2570". */
export function formatThaiDate(date: Date): string {
  return THAI_DATE.format(date)
}
