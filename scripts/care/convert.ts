// Turns public lists of care points into the app's own points (redesign spec 5.8). Every point made
// here is not yet confirmed: it names the list it came from and the day it was copied, and the app
// shows it as a small dot that says to call first. Pure, so the tests can feed it small lists.
import type { CarePointData } from '../../src/data/carePoints.ts'
import { toXY } from '../../src/map/geo.ts'

/** One result of an Overpass query with `out center tags`. A way or a relation stands at its centre. */
export interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

const PHC_SOURCE = 'https://data.bangkok.go.th/dataset/phc_2025'
const HOS_SOURCE = 'https://data.bangkok.go.th/dataset/bmahospital'
/** Two pharmacies of one name closer than this are one shop mapped twice. */
const SAME_SHOP_M = 25

/** Rows of a CSV file as objects keyed by its first line. Quoted fields may hold commas, quotes and new lines. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const s = text.replace(/^﻿/, '')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (quoted) {
      if (c !== '"') field += c
      else if (s[i + 1] === '"') {
        field += '"'
        i++
      } else quoted = false
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  const [head, ...body] = rows.filter((r) => r.some((f) => f.trim() !== ''))
  if (!head) return []
  return body.map((r) => Object.fromEntries(head.map((name, i) => [name.trim(), (r[i] ?? '').trim()])))
}

/**
 * The first phone number of a field, as digits, or undefined when there is no whole one. The lists
 * write `022265897 022227874`, `0 2289 7000-3`, `022112353 ext 101` and `+66 81 234 5678`: a number
 * is whole at 10 digits for a mobile (06, 08, 09) and at 9 for a fixed line.
 */
export function firstPhone(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  // "+66 (0) 2731 6532" writes the trunk 0 twice; it is dropped with the country code.
  const first = raw.split(/[;,/]|ext|ต่อ/i)[0].trim().replace(/^\+\s*66[\s-]*(\(0\))?[\s-]*/, '0')
  const digits = first.replace(/\D/g, '')
  if (!digits.startsWith('0')) return undefined
  const whole = /^0[689]/.test(digits) ? 10 : 9
  return digits.length >= whole ? digits.slice(0, whole) : undefined
}

/** Query parameters that only track where a click came from, or set the page's language; any other parameter may name the page (Facebook's profile.php?id=…) and stays. */
const TRACKING = /^(utm_.*|fbclid|gclid|mibextid|ref|_rdr|refsrc|__tn__|__cft__.*|locale)$/i

/** A contact link as browsers take it: a missing scheme becomes https, tracking and the fragment go, and anything not http(s) is dropped. */
export function cleanUrl(raw: string | undefined): string | undefined {
  const text = raw?.trim()
  if (!text || !/[.]/.test(text)) return undefined
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
    for (const key of [...url.searchParams.keys()]) if (TRACKING.test(key)) url.searchParams.delete(key)
    url.hash = ''
    return decodeURI(url.toString())
  } catch {
    return undefined
  }
}

export function cleanEmail(raw: string | undefined): string | undefined {
  const text = raw?.trim()
  return text && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : undefined
}

/** A LINE id (@name) or a line.me link; anything else is not a LINE contact. */
export function cleanLine(raw: string | undefined): string | undefined {
  const text = raw?.trim()
  if (!text) return undefined
  if (/^@[\w.-]+$/.test(text)) return text
  const url = cleanUrl(text)
  return url && /^https:\/\/line\.me\//.test(url) ? url : undefined
}

/** The contact fields that are present, so a point carries no empty ones. */
const contacts = (c: { email?: string; website?: string; facebook?: string; line?: string }) => Object.fromEntries(Object.entries(c).filter(([, v]) => v)) as Partial<CarePointData>

/** Thai vowel and tone marks above or below a letter, which the lists spell differently. */
const MARKS = /[ัิ-ฺ็-๎]/g
const HOSPITAL = 'โรงพยาบาล'

/** What tells two spellings of one hospital apart from other hospitals: the first 6 letters of its name after "โรงพยาบาล", without spaces or marks. '' matches nothing. */
export function hospitalKey(name: string): string {
  const at = name.indexOf(HOSPITAL)
  if (at < 0) return ''
  return name.slice(at + HOSPITAL.length).replace(/\s+/g, '').replace(MARKS, '').slice(0, 6)
}

const centreNumber = (name: string): string | undefined => /ศูนย์บริการสาธารณสุข\s*(\d+)/.exec(name)?.[1]
const coordinate = (text: string | undefined): number => (text && text.trim() !== '' ? Number(text) : NaN)

/** OpenStreetMap's pharmacies in Bangkok as points, each shop once. */
export function pharmaciesFrom(elements: OverpassElement[], fetched: string, inBangkok: (lat: number, lon: number) => boolean): CarePointData[] {
  const kept: CarePointData[] = []
  for (const element of elements) {
    const lat = element.lat ?? element.center?.lat
    const lon = element.lon ?? element.center?.lon
    if (lat === undefined || lon === undefined || !inBangkok(lat, lon)) continue
    const tags = element.tags ?? {}
    const name = tags.name || tags['name:th'] || tags['name:en'] || 'ร้านยา'
    const [x, y] = toXY(lat, lon)
    const twice = kept.some((p) => {
      if (p.name !== name) return false
      const [px, py] = toXY(p.lat, p.lon)
      return Math.hypot(px - x, py - y) < SAME_SHOP_M
    })
    if (twice) continue
    const phone = firstPhone(tags.phone ?? tags['contact:phone'])
    kept.push({
      id: `osm-${element.type}-${element.id}`,
      name,
      kind: 'pharmacy',
      layer: 'pharmacy',
      klass: 'B',
      lat,
      lon,
      address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:district']].filter(Boolean).join(' '),
      ...(phone ? { phone } : {}),
      ...contacts({ email: cleanEmail(tags.email ?? tags['contact:email']), website: cleanUrl(tags.website ?? tags['contact:website']), facebook: cleanUrl(tags['contact:facebook']), line: cleanLine(tags['contact:line']) }),
      free: false,
      community: false,
      source: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      fetched,
      verified: null,
    })
  }
  return kept
}

/** The BMA's health centres as points, but for those the registry already lists by their number. */
export function healthCentresFrom(csv: string, fetched: string, registry: CarePointData[]): CarePointData[] {
  const listed = new Set(registry.map((p) => centreNumber(p.name)).filter(Boolean))
  return parseCsv(csv).flatMap((row): CarePointData[] => {
    const lat = coordinate(row.Latitude)
    const lon = coordinate(row.longitude)
    const number = centreNumber(row.HCName ?? '')
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || (number && listed.has(number))) return []
    const phone = firstPhone(row.ContactNumber)
    return [{ id: `bma-phc-${row.HCCode}`, name: row.HCName, kind: 'clinic', layer: 'health_centre', klass: 'A', lat, lon, address: row.Address ?? '', ...(phone ? { phone } : {}), ...contacts({ email: cleanEmail(row.EmailAddress), website: cleanUrl(row.Website), facebook: cleanUrl(row.FBChanel) }), free: false, community: false, source: PHC_SOURCE, fetched, verified: null }]
  })
}

/** The BMA's hospitals as points, but for those the registry already lists under any spelling. */
export function hospitalsFrom(csv: string, fetched: string, registry: CarePointData[]): CarePointData[] {
  const listed = new Set(registry.map((p) => hospitalKey(p.name)).filter(Boolean))
  return parseCsv(csv).flatMap((row): CarePointData[] => {
    const lat = coordinate(row.lat)
    const lon = coordinate(row.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || listed.has(hospitalKey(row.name ?? ''))) return []
    const phone = firstPhone(row.tel)
    return [{ id: `bma-hos-${row.id_hos}`, name: row.name, kind: 'hospital', layer: 'hospital', klass: 'A', lat, lon, address: row.address ?? '', ...(phone ? { phone } : {}), ...contacts({ website: cleanUrl(row.www) }), free: false, community: false, source: HOS_SOURCE, fetched, verified: null }]
  })
}

/** A number found by searching, with the public page that shows it (never a Google listing). */
export type FoundPhones = Record<string, { phone: string; source: string }>

/** Adds the found numbers, each with its page, to the places whose own source gave none; a source's own number always wins. */
export function addFoundPhones(points: CarePointData[], found: FoundPhones): CarePointData[] {
  return points.map((p) => {
    const hit = found[p.id]
    return p.phone || !hit ? p : { ...p, phone: hit.phone, phoneSource: hit.source }
  })
}
