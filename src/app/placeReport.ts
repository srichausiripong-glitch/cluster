/**
 * What a person may say about a place (2026-11-18 design, decision 4): fixed kinds, and a number only
 * for the two phone kinds. No free text, so nothing identifying can be typed in by mistake.
 */
export const PLACE_KINDS = ['closed', 'moved', 'hours', 'wrong_phone', 'add_phone'] as const
export type PlaceKind = (typeof PLACE_KINDS)[number]
/** The kinds that carry a number: the place's own, which the team calls before using it. */
export const PHONE_KINDS: readonly PlaceKind[] = ['wrong_phone', 'add_phone']
/** The registry's hand-kept places (src/data/care-points.json); a test keeps the two in step. */
export const REGISTRY_IDS: readonly string[] = [
  'trc-anonymous-clinic', 'ihri-pribta-clinic', 'ihri-tangerine-clinic', 'silom-community-clinic-tropmed', 'siriraj-std-hiv-clinic',
  'swing-silom', 'swing-saphan-khwai', 'swing-phetkasem', 'rsat-ramkhamhaeng', 'bma-hc23-siphraya', 'bma-hc3-bangsue',
  'bma-hc9-prachathipatai', 'bma-hc25-huaikhwang', 'bma-hc43-minburi', 'bma-hc61-saimai', 'bma-klang-hospital', 'bma-taksin-hospital',
  'bma-charoenkrung-hospital', 'bma-luangphothawisak-hospital', 'bma-vejakarunrasmi-hospital', 'bma-latkrabang-hospital',
  'bma-ratchaphiphat-hospital', 'bma-sirindhorn-hospital',
]
/** The fetched lists' ids: OpenStreetMap's and the BMA's, numbers only. */
const FETCHED_ID = /^(?:osm-(?:node|way|relation)-\d{1,12}|bma-(?:phc|hos)-\d{1,8})$/

/** Only an id one of the place lists uses: no text can ride in it (final review). */
export function isPlaceId(id: unknown): id is string {
  return typeof id === 'string' && (FETCHED_ID.test(id) || REGISTRY_IDS.includes(id))
}

/** A Thai number as digits: 9 from 0 for a fixed line, 10 from 06/08/09 for a mobile; anything else is null. */
export function thaiPhone(raw: unknown): string | null {
  if (typeof raw !== 'string' || !/^(\+\s*66)?[\d\s-]+$/.test(raw.trim())) return null
  // "+66 81 …" is how phones write a Thai number: the country code stands for the leading 0.
  const digits = raw.trim().replace(/^\+\s*66[\s-]*/, '0').replace(/\D/g, '')
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
