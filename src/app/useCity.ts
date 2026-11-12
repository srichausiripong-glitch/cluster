import { orderedCarePoints, type CarePoint } from '../store/seed'

/** The care point shown with an area's signal: one inside the zone if there is one, else the first in the list (spec 7.3). */
export function carePointFor(areaId: string): CarePoint {
  const ordered = orderedCarePoints()
  return ordered.find((p) => p.zoneId === areaId) ?? ordered[0]
}
