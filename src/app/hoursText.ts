import { th } from '../copy/th'
import { openStatus, type OpenSpan } from '../domain/hours'

/**
 * A place's hours as one line of words (2026-11-18 design, decision 3): open with its closing time,
 * open all day, or closed with its next opening; null when the hours are not known. Never colour alone.
 */
export function hoursLine(open: OpenSpan[] | undefined, now: Date = new Date()): string | null {
  const status = openStatus(open, now)
  if (!status) return null
  if (status.open) return status.closes ? th.hours.open.replace('{time}', status.closes) : th.hours.allDay
  if (!status.opens) return th.hours.closed
  // "วันนี้" only for an opening later today; the same weekday an hour ago is a week away.
  const local = new Date(now.getTime() + 7 * 3600_000)
  const clock = `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`
  const later = status.opens.day === local.getUTCDay() && status.opens.at > clock
  const day = later ? th.hours.today : th.hours.days[status.opens.day]
  return `${th.hours.closed} · ${th.hours.opens.replace('{day}', day).replace('{time}', status.opens.at)}`
}
