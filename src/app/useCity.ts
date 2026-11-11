import type { PublishedArea } from '../domain/types'
import { usePartyStore } from '../store/partyStore'
import { orderedCarePoints, type CarePoint } from '../store/seed'
import { pub } from '../store/stores'

const NO_DATA: PublishedArea = { areaId: 'bkk', state: 'no_data', density: null, step: null }

/** The city's entry in the latest published file. */
export function useCity(): PublishedArea {
  return usePartyStore(pub).files.at(-1)?.areas.find((a) => a.areaId === 'bkk') ?? NO_DATA
}

/** The care point shown with an area's signal: one inside the zone if there is one, else the first in the list (spec 7.3). */
export function carePointFor(areaId: string): CarePoint {
  const ordered = orderedCarePoints()
  return ordered.find((p) => p.zoneId === areaId) ?? ordered[0]
}
