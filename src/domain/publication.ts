import type { DensityBand } from './types.js'

/** Minimum number of reports behind every displayed attribute (spec 7.2). */
export const K = 10

/**
 * Red and orange show from one report, as green does (owner, 25 Nov 2026, changing the 23 Nov design so the
 * map fills from the first reports). One phone in one week can colour a district; the bar still rises with
 * the random reports expected once many phones send (`reaches`).
 */
export const SIGNAL_MIN = 1
/** Green, tested and found nothing, shows from the first report. */
export const TESTED_MIN = 1

/** A row's depth by its own raw count: under 5, 5 to 14, 15 and up. */
export function bandOf(n: number): DensityBand {
  return n < 5 ? 'thin' : n < 15 ? 'medium' : 'dense'
}

/**
 * Whether a raw count shows: the minimum, plus the random reports expected over the row's cells (λ)
 * and twice their spread, rounded. While few phones send, λ is near 0 and this is the minimum itself.
 */
export function reaches(n: number, min: number, lambda: number): boolean {
  return n >= Math.round(min + lambda + 2 * Math.sqrt(lambda))
}
