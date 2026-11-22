import type { DensityBand } from './types.js'

/** Minimum number of reports behind every displayed attribute (spec 7.2). */
export const K = 10

export function densityBand(n: number): DensityBand | null {
  if (n < K) return null
  if (n < 20) return 'thin'
  if (n < 50) return 'medium'
  return 'dense'
}
