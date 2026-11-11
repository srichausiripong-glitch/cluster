const DAY = 86_400_000

/** ISO 8601 week of a date in the viewer's own calendar day, as `YYYY-Www`. */
export function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const weekday = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - weekday) // the Thursday of this week decides the year
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((t.getTime() - yearStart) / DAY + 1) / 7)
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function mondayOf(week: string): number {
  const [year, n] = week.split('-W').map(Number)
  const jan4 = new Date(Date.UTC(year, 0, 4)) // always in week 1
  const weekday = jan4.getUTCDay() || 7
  return jan4.getTime() - (weekday - 1) * DAY + (n - 1) * 7 * DAY
}

/** 1 for the publication week itself. */
export function weekIndex(publishedWeek: string, nowWeek: string): number {
  return Math.round((mondayOf(nowWeek) - mondayOf(publishedWeek)) / (7 * DAY)) + 1
}

export function shiftWeek(week: string, delta: number): string {
  return isoWeekUtc(new Date(mondayOf(week) + delta * 7 * DAY))
}

function isoWeekUtc(d: Date): string {
  return isoWeek(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}
