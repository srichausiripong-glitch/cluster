import type { DiseaseGroup } from './types'

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

/**
 * One code per disease group per week, the same for every recipient, in two variants
 * by whether the sender had a clinic code (spec 5.5). Prototype only: an FNV-1a hash,
 * not a secret. The real service would publish the weekly codes to clinic consoles.
 */
export function weeklyCode(group: DiseaseGroup, hasClinicCode: boolean, week: string): string {
  let h = 0x811c9dc5
  for (const ch of `${group}|${hasClinicCode ? 1 : 0}|${week}`) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  const first = LETTERS[h % LETTERS.length]
  const second = LETTERS[Math.floor(h / LETTERS.length) % LETTERS.length]
  const digits = String(Math.floor(h / (LETTERS.length * LETTERS.length)) % 1000).padStart(3, '0')
  return `${first}${second}${digits}`
}
