import districts from './data/districts.json'
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

/** One of Bangkok's 50 districts as the map draws it: the area every count and sheet is about. Baked by scripts/map/build.ts. */
export interface Area {
  id: string
  name: string
  /** Where the district's name is written. */
  label: [number, number]
  rings: number[][]
  /** The district's outline, as closed runs. */
  edges: number[][]
}

/** In the order of the district list. */
export const AREAS: Area[] = districts as Area[]

export function areaAt(p: XY): Area | undefined {
  return AREAS.find((area) => inRings(p, area.rings))
}

/** An SVG path in metres; the map layer scales it to the screen. */
export function pathOf(rings: number[][], close = true): string {
  return rings.map((ring) => `M${ring[0]} ${ring[1]}${ring.slice(2).reduce((d, v, i) => d + (i % 2 ? ` ${v}` : `L${v}`), '')}${close ? 'Z' : ''}`).join('')
}
