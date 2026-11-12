import { weeklyCode } from './fastTrack'
import type { DiseaseGroup, ExposureBand, Notice } from './types'

export interface NoticeInput {
  group: DiseaseGroup
  /** The sender said the result came from a clinic or a lab. */
  hasLabResult: boolean
  nameDisease: boolean
  band: ExposureBand
  week: string
}

/**
 * The default link is an invitation that names no disease. HIV may be named only
 * for exposure within 72 hours (spec 5.5). The tier is the sender's own statement.
 */
export function composeNotice(input: NoticeInput): Notice {
  const mayName = input.group !== 'hiv' || input.band === 'h72'
  const named = input.nameDisease && mayName
  return {
    v: 1,
    group: named ? input.group : null,
    tier: input.hasLabResult ? 1 : 2,
    band: input.band,
    week: input.week,
    code: weeklyCode(input.group, input.hasLabResult, input.week, named),
  }
}
