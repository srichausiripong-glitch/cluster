import { isoWeek } from '../src/domain/weeks'

/** The ISO week in Bangkok (UTC+7), whatever zone the server runs in. */
export function serverWeek(now: Date): string {
  const t = new Date(now.getTime() + 7 * 3600_000)
  return isoWeek(new Date(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()))
}
