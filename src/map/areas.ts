import districts from './data/districts.json'
import outline from './data/outline.json'
import { inRings, type XY } from './geo'

/** The outline of the whole city, for when the city is painted as one area. */
export const CITY_EDGES: number[][] = outline

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

/**
 * The box round the whole city, in metres: west, north, east and south of every district. The
 * district level reaches all of it (redesign spec 5.7).
 */
export const CITY_BOX: [number, number, number, number] = (() => {
  const box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const area of AREAS)
    for (const ring of area.rings)
      for (let i = 0; i < ring.length; i += 2) {
        box[0] = Math.min(box[0], ring[i])
        box[1] = Math.min(box[1], ring[i + 1])
        box[2] = Math.max(box[2], ring[i])
        box[3] = Math.max(box[3], ring[i + 1])
      }
  return box
})()

export function areaAt(p: XY): Area | undefined {
  return AREAS.find((area) => inRings(p, area.rings))
}

/** An SVG path in metres; the map layer scales it to the screen. */
export function pathOf(rings: number[][], close = true): string {
  return rings.map((ring) => `M${ring[0]} ${ring[1]}${ring.slice(2).reduce((d, v, i) => d + (i % 2 ? ` ${v}` : `L${v}`), '')}${close ? 'Z' : ''}`).join('')
}
