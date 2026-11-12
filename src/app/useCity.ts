import { orderedCarePoints, type CarePoint } from '../data/carePoints'

/** The care point shown with an area's signal: one inside the zone if there is one, else the first in the list (spec 7.3). None while no point is confirmed. */
export function carePointFor(areaId: string): CarePoint | undefined {
  const ordered = orderedCarePoints()
  return ordered.find((p) => p.zoneId === areaId) ?? ordered.at(0)
}
