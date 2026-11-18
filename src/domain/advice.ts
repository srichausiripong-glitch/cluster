import { clinical } from '../copy/clinical'
import type { Advice, DiseaseGroup, ExposureBand } from './types'

/** Builds the advice from register ids, so every sentence carries its source. */
const advice = (title: string, steps: string[], urgent: boolean): Advice => ({
  title: clinical(title).text,
  steps: steps.map((id) => clinical(id).text),
  urgent,
  ids: { title, steps },
})

/**
 * Advice per disease group and tier, from spec section 6. Every sentence lives in the clinical
 * register (src/copy/clinical.ts), with the public page that backs it.
 *
 * A link for contact within 72 hours always says "go today", whether or not it names a
 * disease. If only HIV links did, the urgency itself would name the disease.
 */
export function adviceFor(group: DiseaseGroup | null, tier: 1 | 2, band: ExposureBand): Advice {
  if (group === null) {
    const code = ['recipient.fullPanel']
    if (band === 'h72') return advice('advice.unnamed.h72.title', ['advice.unnamed.h72.go', 'advice.unnamed.h72.tell', ...code], true)
    return advice('advice.unnamed.title', [tier === 1 ? 'advice.unnamed.tier1' : 'advice.unnamed.tier2', ...code, 'advice.unnamed.recent'], false)
  }
  if (group === 'hiv') {
    if (band === 'h72') return advice('advice.hiv.h72.title', ['advice.hiv.h72.pep', 'advice.hiv.h72.baseline', 'advice.hiv.h72.retest'], true)
    return advice('advice.hiv.title', ['advice.hiv.test', 'advice.hiv.window', 'advice.hiv.prep'], false)
  }
  if (group === 'mpox') {
    return advice('advice.mpox.title', tier === 1 ? ['advice.mpox.watch21', 'advice.mpox.ifSymptomsIsolate', 'advice.mpox.vaccine'] : ['advice.mpox.watch', 'advice.mpox.ifSymptoms'], false)
  }
  if (group === 'gono_chlam') {
    return advice('advice.gc.title', tier === 1 ? ['advice.gc.treat', 'advice.gc.noSelfMeds', 'advice.gc.abstain'] : ['advice.gc.test', 'advice.gc.noSelfMeds'], false)
  }
  // Syphilis: treat at once only for contact within three months (spec 6); older contact starts with a blood test.
  const treatNow = tier === 1 && band !== 'older'
  return advice('advice.syph.title', treatNow ? ['advice.syph.treat', 'advice.syph.blood', 'advice.syph.abstain'] : ['advice.syph.blood', 'advice.syph.sores'], false)
}
