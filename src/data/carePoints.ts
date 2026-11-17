import { areaAt } from '../map/areas'
import { toXY } from '../map/geo'
import type { CareLayer } from '../domain/types'
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
export const isVerified = (p: CarePointData): boolean => p.verified !== null

/** Every point that ships, confirmed or not: the registry. */
export const ALL_CARE_POINTS: CarePoint[] = (registry as CarePointData[]).map(withDistrict)

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

/** Whether a point is a place to get tested: every layer but pharmacies (redesign spec 5.1). */
export function canTest(point: CarePoint): boolean {
  return point.layer !== 'pharmacy'
}
