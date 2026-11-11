import type { DiseaseGroup } from './types'

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const GROUPS: readonly DiseaseGroup[] = ['gono_chlam', 'syphilis', 'mpox', 'hiv']

/**
 * One code per disease group per week, the same for every recipient, in two variants
 * by whether the sender had a clinic code (spec 5.5). A notice that names the disease
 * gets a code of its own, so seeing one named notice does not decode the unnamed ones.
 * Prototype only: an FNV-1a hash, not a secret. The real service would publish the
 * weekly codes to clinic consoles.
 */
export function weeklyCode(group: DiseaseGroup, hasClinicCode: boolean, week: string, named = false): string {
  let h = 0x811c9dc5
  for (const ch of `${group}|${hasClinicCode ? 1 : 0}|${week}${named ? '|named' : ''}`) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  const first = LETTERS[h % LETTERS.length]
  const second = LETTERS[Math.floor(h / LETTERS.length) % LETTERS.length]
  const digits = String(Math.floor(h / (LETTERS.length * LETTERS.length)) % 1000).padStart(3, '0')
  return `${first}${second}${digits}`
}

export interface WeeklyCodeEntry {
  code: string
  group: DiseaseGroup
  withClinicCode: boolean
  named: boolean
}

/** Every code a clinic may be shown in one week: four per disease group. */
export function weeklyCodes(week: string): WeeklyCodeEntry[] {
  return GROUPS.flatMap((group) =>
    [true, false].flatMap((withClinicCode) =>
      [false, true].map((named) => ({ code: weeklyCode(group, withClinicCode, week, named), group, withClinicCode, named })),
    ),
  )
}
