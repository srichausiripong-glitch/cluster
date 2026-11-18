/**
 * Opening hours (2026-11-18 design, decision 3). A place's hours are spans of the week; whether it is
 * open is worked out in Bangkok time, whatever zone the phone is in. Public holidays are not known.
 */
export interface OpenSpan {
  /** 0 = Sunday … 6 = Saturday. */
  days: number[]
  /** HH:MM, Bangkok time. */
  from: string
  /** HH:MM; '24:00' is the end of the day, and a time before `from` runs past midnight. */
  to: string
}

/** Open, with the time it closes (null: it never closes); or closed, with the next opening if any. */
export type OpenStatus = { open: true; closes: string | null } | { open: false; opens: { day: number; at: string } | null }

const DAY_CODES: Record<string, number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 }
const DAY = '(?:Mo|Tu|We|Th|Fr|Sa|Su)'
/** A day, a range of days, or "PH" alone: a public holiday is never the end of a range. */
const SELECTOR = `(?:${DAY}(?:-${DAY})?|PH)`
const DAYS = new RegExp(`^${SELECTOR}(?:,${SELECTOR})*$`)
const TIME = /^([01]\d|2[0-4]):([0-5]\d)-([01]\d|2[0-4]):([0-5]\d)$/

/** Days named by one OpenStreetMap day selector, e.g. "Mo-Fr,Su"; "PH" adds none. */
function daysOf(selector: string): number[] {
  const out = new Set<number>()
  for (const part of selector.split(',')) {
    const [a, b] = part.split('-')
    if (a === 'PH') continue
    const start = DAY_CODES[a]
    const end = b === undefined ? start : DAY_CODES[b]
    for (let d = start; ; d = (d + 1) % 7) {
      out.add(d)
      if (d === end) break
    }
  }
  return [...out].sort((x, y) => x - y)
}

/**
 * The common forms of an OpenStreetMap `opening_hours` tag: "24/7", rules split by ";" or ", ", each
 * "<days> <HH:MM-HH:MM>[,<HH:MM-HH:MM>]" or "<days> off". Anything else is null: unknown, never a guess.
 * As OpenStreetMap reads them, a rule after ";" replaces the hours of the days it names, and a rule
 * after ", " adds to them.
 */
export function parseOsmHours(tag: string | undefined): OpenSpan[] | null {
  const text = tag?.trim()
  if (!text) return null
  if (text === '24/7') return [{ days: [0, 1, 2, 3, 4, 5, 6], from: '00:00', to: '24:00' }]
  let spans: OpenSpan[] = []
  const without = (days: number[]) => spans.map((s) => ({ ...s, days: s.days.filter((d) => !days.includes(d)) })).filter((s) => s.days.length)
  // Split keeping the separators: odd parts are "; " or ", ".
  const parts = text.split(/(;\s*|,\s+(?=[A-Z][a-z]))/)
  for (let i = 0; i < parts.length; i += 2) {
    const adds = i > 0 && parts[i - 1].startsWith(',')
    const [selector, times, ...rest] = parts[i].trim().split(/\s+/)
    if (rest.length || !selector || !times || !DAYS.test(selector)) return null
    const days = daysOf(selector)
    if (times === 'off') {
      spans = without(days)
      continue
    }
    if (!adds) spans = without(days)
    if (!days.length) continue // a rule for public holidays alone
    for (const range of times.split(',')) {
      const m = TIME.exec(range)
      if (!m) return null
      spans.push({ days, from: `${m[1]}:${m[2]}`, to: `${m[3]}:${m[4]}` })
    }
  }
  return spans.length ? spans : null
}

const WEEK_MIN = 7 * 24 * 60
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const clock = (m: number) => {
  const t = ((m % 1440) + 1440) % 1440
  return m > 0 && t === 0 ? '24:00' : `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

/** The spans as intervals of minutes from Sunday 00:00, merged where they touch; one past the week's end wraps. */
function intervals(spans: OpenSpan[]): [number, number][] {
  const raw: [number, number][] = []
  for (const s of spans)
    for (const d of s.days) {
      const start = d * 1440 + minutes(s.from)
      const end = d * 1440 + minutes(s.to) + (minutes(s.to) <= minutes(s.from) ? 1440 : 0)
      raw.push([start, end])
    }
  raw.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const r of raw) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([...r])
  }
  return merged
}

/** Open or closed at `now`, in Bangkok time; null when the hours are not known. */
export function openStatus(spans: OpenSpan[] | undefined, now: Date): OpenStatus | null {
  if (!spans?.length) return null
  const local = new Date(now.getTime() + 7 * 3600_000)
  const at = local.getUTCDay() * 1440 + local.getUTCHours() * 60 + local.getUTCMinutes()
  const list = intervals(spans)
  if (list.length === 1 && list[0][1] - list[0][0] >= WEEK_MIN) return { open: true, closes: null }
  // An interval that runs past Saturday night also covers the start of the week.
  for (const [start, end] of list) {
    for (const shift of [0, -WEEK_MIN]) {
      if (at >= start + shift && at < end + shift) return { open: true, closes: clock(end) }
    }
  }
  let next: number | null = null
  for (const [start] of list) {
    const ahead = start > at ? start - at : start + WEEK_MIN - at
    if (next === null || ahead < next) next = ahead
  }
  if (next === null) return { open: false, opens: null }
  const opensAt = (at + next) % WEEK_MIN
  return { open: false, opens: { day: Math.floor(opensAt / 1440), at: clock(opensAt % 1440) } }
}
