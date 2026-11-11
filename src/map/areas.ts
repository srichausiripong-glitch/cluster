import outline from './data/outline.json'
import data from './data/zones.json'
import { inRings, type XY } from './geo'

/** One of Bangkok's six district groups, drawn from real district outlines. Baked by scripts/map/build.ts. */
export interface Zone {
  id: string
  name: string
  /** Where the zone's name is written at city level. */
  label: XY
  /** The outlines of the zone's districts. */
  rings: number[][]
  /** The zone's own outline, as open or closed runs. */
  edges: number[][]
}

export const ZONES: Zone[] = data as Zone[]
/** The outline of the whole city, for when the city is painted as one area. */
export const CITY_EDGES: number[][] = outline

export function zoneAt(p: XY): Zone | undefined {
  return ZONES.find((zone) => inRings(p, zone.rings))
}

/** An SVG path in metres; the map layer scales it to the screen. */
export function pathOf(rings: number[][], close = true): string {
  return rings.map((ring) => `M${ring[0]} ${ring[1]}${ring.slice(2).reduce((d, v, i) => d + (i % 2 ? ` ${v}` : `L${v}`), '')}${close ? 'Z' : ''}`).join('')
}
