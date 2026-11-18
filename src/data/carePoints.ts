import { areaAt, NEIGHBOURS } from '../map/areas'
import { toXY } from '../map/geo'
import type { CareLayer } from '../domain/types'
import healthCentres from './bma-health-centres.json'
import hospitals from './bma-hospitals.json'
import registry from './care-points.json'

/** A care point as the registry and the tests write it. Its district comes from where it stands. */
export interface CarePointData {
  id: string
  name: string
  kind: 'clinic' | 'hospital' | 'pharmacy' | 'lab'
  /** Which layer of the map it belongs to (redesign spec 5.8; round 2 plan, decision 9). */
  layer: CareLayer
  /** A: state or Red Cross, may show services, hours and cost. B: private or NGO clinic, name and place only (spec 5.2). */
  klass: 'A' | 'B'
  lat: number
  lon: number
  address: string
  free: boolean
  community: boolean
  services?: string[]
  hours?: string
  cost?: string
  pep?: boolean
  /** The public page every field was copied from. */
  source: string
  /** The day the data was copied from its source, YYYY-MM-DD (redesign spec 5.8). */
  fetched: string
  /** The first phone number, as digits, when the source gives one. */
  phone?: string
  /** The public page the number was found on, when that is not `source` (owner, 18 Nov 2026: search for a number before giving up). */
  phoneSource?: string
  /** Other ways to reach the place, only as its public list gives them (2026-11-18 design, decision 1). */
  email?: string
  website?: string
  facebook?: string
  /** A LINE URL (https://line.me/…) or a LINE id (@name). */
  line?: string
  /**
   * Who confirmed the point, when and how. Null until somebody has: such a point is still shown,
   * as a small dot that says to call first (redesign spec 5.8).
   */
  verified: { date: string; by: string; method: 'phone' | 'visit' | 'partner' } | null
}

export interface CarePoint extends CarePointData {
  /** The district the point stands in, from its coordinates; '' for a point outside the 50. */
  districtId: string
}

export const withDistrict = (p: CarePointData): CarePoint => ({ ...p, districtId: areaAt(toXY(p.lat, p.lon))?.id ?? '' })

/** Whether somebody has confirmed the point. Only a confirmed point is a big pin with its full detail (redesign spec 5.8). */
// A point whose data names no verification at all is not confirmed either, as the launch check reads it.
export const isVerified = (p: CarePointData): boolean => p.verified != null

/**
 * Every point that ships with the app, confirmed or not: the registry, then the BMA's health
 * centres and hospitals that the registry does not already list (scripts/care/fetch.ts). The
 * pharmacies are a file of their own, read only when 💊 is on (src/data/pharmacies.ts).
 */
export const ALL_CARE_POINTS: CarePoint[] = [...registry, ...healthCentres, ...hospitals].map((p) => withDistrict(p as CarePointData))

/**
 * The points the app shows: every point, at two levels of trust (redesign spec 5.8). One array
 * kept in place, so every screen that imported it sees the same list; tests put their own points
 * into it through `setCarePoints`.
 */
export const CARE_POINTS: CarePoint[] = [...ALL_CARE_POINTS]

export function setCarePoints(points: CarePointData[]): void {
  CARE_POINTS.splice(0, CARE_POINTS.length, ...points.map(withDistrict))
}

/** Confirmed points first, then free and community services; payment never changes the order (spec 5.2). */
export function orderedCarePoints(points: CarePoint[] = CARE_POINTS): CarePoint[] {
  const rank = (p: CarePoint) => (isVerified(p) ? 0 : 4) + (p.free && p.klass === 'A' ? 0 : p.community ? 1 : p.free ? 2 : 3)
  return [...points].sort((a, b) => rank(a) - rank(b))
}

/**
 * Places by what is near (redesign spec 5.7): those in the district first, then those in a
 * district next to it, then the rest, each part in the order of `orderedCarePoints`. Without one of
 * the 50 districts, that order alone.
 */
export function nearSort(points: CarePoint[], district: string | null): CarePoint[] {
  const ordered = orderedCarePoints(points)
  const next = district && Object.hasOwn(NEIGHBOURS, district) ? NEIGHBOURS[district] : null
  if (!next) return ordered
  const part = (p: CarePoint) => (p.districtId === district ? 0 : next.includes(p.districtId) ? 1 : 2)
  return ordered.sort((a, b) => part(a) - part(b))
}

/** The place to start from: the first by what is near the district, or the first of all without one. */
export function nearestFor(district: string | null, points: CarePoint[] = CARE_POINTS): CarePoint | undefined {
  return nearSort(points, district)[0]
}

/** Whether a point is a place to get tested: every layer but pharmacies (redesign spec 5.1). */
export function canTest(point: CarePoint): boolean {
  return point.layer !== 'pharmacy'
}
