import { areaAt } from '../map/areas'
import { toXY } from '../map/geo'
import registry from './care-points.json'

/** A care point as the registry and the tests write it. Its district comes from where it stands. */
export interface CarePointData {
  id: string
  name: string
  kind: 'clinic' | 'hospital' | 'pharmacy' | 'lab'
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
  /** Who confirmed the point, when and how. Null until somebody has: such a point is not shown. */
  verified: { date: string; by: string; method: 'phone' | 'visit' | 'partner' } | null
}

export interface CarePoint extends CarePointData {
  /** The district the point stands in, from its coordinates; '' for a point outside the 50. */
  districtId: string
}

export const withDistrict = (p: CarePointData): CarePoint => ({ ...p, districtId: areaAt(toXY(p.lat, p.lon))?.id ?? '' })

/** Every candidate in the registry, confirmed or not (v1 spec 7.1). */
export const ALL_CARE_POINTS: CarePoint[] = (registry as CarePointData[]).map(withDistrict)

export const verifiedOnly = (points: CarePoint[]) => points.filter((p) => p.verified !== null)

/**
 * The points the app shows. One array kept in place, so every screen that imported it sees the
 * same list; tests put their own points into it through `setCarePoints`.
 */
export const CARE_POINTS: CarePoint[] = verifiedOnly(ALL_CARE_POINTS)

export function setCarePoints(points: CarePointData[]): void {
  CARE_POINTS.splice(0, CARE_POINTS.length, ...points.map(withDistrict))
}

/** Free and community services first; payment never changes the order (spec 5.2). */
export function orderedCarePoints(points: CarePoint[] = CARE_POINTS): CarePoint[] {
  const rank = (p: CarePoint) => (p.free && p.klass === 'A' ? 0 : p.community ? 1 : p.free ? 2 : 3)
  return [...points].sort((a, b) => rank(a) - rank(b))
}
