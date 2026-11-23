import type { DensityBand, PublishedArea, TestingLevel } from '../domain/types'

/** The three colours a district can take (2026-11-23 design): red, orange, green. */
export type ToneKind = 'confirmed' | 'symptoms' | 'tested'
export interface Tone {
  kind: ToneKind
  band: DensityBand
}

const FROM_TESTING: Record<TestingLevel, DensityBand> = { low: 'thin', medium: 'medium', high: 'dense' }

/**
 * A district's one colour: red before orange before green, from the rows of the weekly file and the
 * two layer switches. A switch off lets the district fall to the next colour it qualifies for; green
 * has no switch. An area that is not shown has no colour.
 */
export function toneOf(area: PublishedArea | undefined, layers: { confirmed: boolean; symptoms: boolean }): Tone | null {
  if (area?.state !== 'shown') return null
  if (layers.confirmed && area.density) return { kind: 'confirmed', band: area.density }
  if (layers.symptoms && area.symptoms) return { kind: 'symptoms', band: area.symptoms }
  if (area.testing) return { kind: 'tested', band: FROM_TESTING[area.testing] }
  return null
}
