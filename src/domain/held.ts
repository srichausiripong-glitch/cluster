import type { CountRow } from './display'
import type { ReportKind } from './types'
import { shiftWeek } from './weeks'

/** A cell is held when its week is above twenty and above three times the highest of the four weeks before (amendment 6). */
export function heldCells(counts: CountRow[], week: string): { zone: string; kind: ReportKind; n: number }[] {
  const n = (zone: string, kind: ReportKind, w: string) => counts.filter((c) => c.zone === zone && c.kind === kind && c.week === w).reduce((sum, c) => sum + c.n, 0)
  const cells = new Map<string, { zone: string; kind: ReportKind }>()
  for (const c of counts) if (c.week === week) cells.set(`${c.zone}|${c.kind}`, { zone: c.zone, kind: c.kind })
  const held: { zone: string; kind: ReportKind; n: number }[] = []
  for (const { zone, kind } of cells.values()) {
    const now = n(zone, kind, week)
    const before = Math.max(0, ...[1, 2, 3, 4].map((back) => n(zone, kind, shiftWeek(week, -back))))
    if (now > 20 && now > 3 * before) held.push({ zone, kind, n: now })
  }
  return held
}
