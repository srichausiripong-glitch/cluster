import type { MapSource } from '../map/source'
import type { CityData, Manifest, TileData } from '../map/types'
import { CARE_POINTS } from '../store/seed'

/** A small manifest for tests: district-level data over the inner city, street-level data in one tile near Victory Monument. */
export const STUB_MANIFEST: Manifest = {
  origin: { lat: 13.75, lon: 100.55, kx: 111320 * Math.cos((13.75 * Math.PI) / 180), ky: 110574 },
  credit: '© ผู้ร่วมสร้าง OpenStreetMap · OpenMapTiles',
  date: '2026-11-01',
  city: 'city.json',
  district: [{ file: 'district/stub.json', box: [-4541, -4423, 2379, 6192] }],
  street: [{ file: 'street/stub.json', box: [-2714, -2632, -335, -276] }],
  clearance: Object.fromEntries(CARE_POINTS.map((p) => [p.id, 100])),
}
const EMPTY_CITY: CityData = { water: [], waterline: [], green: [], runway: [], border: [], rail: [], hw: [], pri: [], sec: [], ter: [], labels: [], districts: [] }
const EMPTY_TILE: TileData = { water: [], canal: [], green: [], roads: {}, bridges: {}, rail: [], labels: [] }

/** A map source that answers at once with empty map data. Pass `over` to make one part fail or differ. */
export function stubSource(over: Partial<MapSource> = {}): MapSource {
  return { manifest: () => Promise.resolve(STUB_MANIFEST), city: () => Promise.resolve(EMPTY_CITY), tile: () => Promise.resolve(EMPTY_TILE), ...over }
}
