import type { CountRow } from './display.js'
import type { ReportKind } from './types.js'
import { shiftWeek } from './weeks.js'

const SIGNAL_KINDS: ReportKind[] = ['gono_chlam', 'syphilis']
/** Above twenty and above three times the highest of the four weeks before (amendment 6). */
const jumps = (count: (w: string) => number, week: string) => {
  const now = count(week)
  return now > 20 && now > 3 * Math.max(0, ...[1, 2, 3, 4].map((back) => count(shiftWeek(week, -back))))
}

/**
 * The cells to hold for a week: each zone and kind judged on its own, and also each zone's signal
 * kinds judged together, since amendment 6 speaks of the zone's count. Pass counts with earlier held
 * or discarded cells already taken out, so a rejected jump never becomes the next week's baseline.
 */
export function heldCells(counts: CountRow[], week: string): { zone: string; kind: ReportKind; n: number }[] {
  const n = (zone: string, kinds: ReportKind[], w: string) => counts.filter((c) => c.zone === zone && kinds.includes(c.kind) && c.week === w).reduce((sum, c) => sum + c.n, 0)
  const held = new Map<string, { zone: string; kind: ReportKind; n: number }>()
  const hold = (zone: string, kind: ReportKind) => held.set(`${zone}|${kind}`, { zone, kind, n: n(zone, [kind], week) })
  for (const c of counts) {
    if (c.week !== week) continue
    if (jumps((w) => n(c.zone, [c.kind], w), week)) hold(c.zone, c.kind)
    if (SIGNAL_KINDS.includes(c.kind) && jumps((w) => n(c.zone, SIGNAL_KINDS, w), week))
      for (const kind of SIGNAL_KINDS) if (n(c.zone, [kind], week) > 0) hold(c.zone, kind)
  }
  return [...held.values()]
}
