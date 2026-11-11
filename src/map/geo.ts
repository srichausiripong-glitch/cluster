/** Map coordinates are metres east (x) and south (y) of this point in central Bangkok. */
export const ORIGIN = { lat: 13.75, lon: 100.55 }
export const KX = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180)
export const KY = 110574
export type XY = [number, number]
export function toXY(lat: number, lon: number): XY {
  return [(lon - ORIGIN.lon) * KX, (ORIGIN.lat - lat) * KY]
}

/** The map has exactly three levels, with nothing in between (plan amendment 15.4). */
export type Level = 'city' | 'district' | 'street'
export const LEVELS: Level[] = ['city', 'district', 'street']
/** Screen pixels per metre. The city level is fitted to the screen instead. */
export const PPM = { district: 0.075, street: 0.63 }
/** What the city level always shows: every zone, without the far east and west tips of the city. */
export const CITY_FRAME = { west: 100.36, east: 100.81, south: 13.49, north: 13.96 }

/** Even-odd test of a point against rings given as flat x, y lists. */
export function inRings(p: XY, rings: number[][]): boolean {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const xi = ring[i]
      const yi = ring[i + 1]
      const xj = ring[j]
      const yj = ring[j + 1]
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside
    }
  }
  return inside
}
