import { isoWeek } from '../src/domain/weeks.js'

/** The ISO week in Bangkok (UTC+7), whatever zone the server runs in. */
export function serverWeek(now: Date): string {
  const t = new Date(now.getTime() + 7 * 3600_000)
  return isoWeek(new Date(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()))
}

/** The date in Bangkok, YYYY-MM-DD: a phone sends at most one envelope a day (live map, owner 25 Nov 2026). */
export function serverDay(now: Date): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10)
}
