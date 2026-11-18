/**
 * What a person may say about a place (2026-11-18 design, decision 4): fixed kinds, and a number only
 * for the two phone kinds. No free text, so nothing identifying can be typed in by mistake.
 */
export const PLACE_KINDS = ['closed', 'moved', 'hours', 'wrong_phone', 'add_phone'] as const
export type PlaceKind = (typeof PLACE_KINDS)[number]
/** The kinds that carry a number: the place's own, which the team calls before using it. */
export const PHONE_KINDS: readonly PlaceKind[] = ['wrong_phone', 'add_phone']
/** A place id as the lists write them: registry slugs, bma-…, osm-node-… */
export const PLACE_ID = /^[a-z0-9-]{3,64}$/

/** A Thai number as digits: 9 from 0 for a fixed line, 10 from 06/08/09 for a mobile; anything else is null. */
export function thaiPhone(raw: unknown): string | null {
  if (typeof raw !== 'string' || !/^[\d\s-]+$/.test(raw.trim())) return null
  const digits = raw.replace(/\D/g, '')
  return /^0[689]\d{8}$/.test(digits) || /^0[1-57]\d{7}$/.test(digits) ? digits : null
}

/** Sends one correction. The server counts it by week, place, kind and number, and keeps nothing else. */
export async function sendPlaceReport(place: string, kind: PlaceKind, phone?: string): Promise<boolean> {
  try {
    const body = phone ? { place, kind, phone } : { place, kind }
    const res = await fetch('/api/place', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    return res.ok
  } catch {
    return false
  }
}
