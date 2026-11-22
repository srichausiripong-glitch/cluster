import type { DensityBand, TestingLevel } from '../domain/types'

/** A published level as one, two or three dots (redesign spec 5.7). */
export function levelOf(band: DensityBand | TestingLevel): 1 | 2 | 3 {
  return band === 'thin' || band === 'low' ? 1 : band === 'medium' ? 2 : 3
}
