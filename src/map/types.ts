/** x0, y0, x1, y1 … in metres east and south of ORIGIN (lat 13.75, lon 100.55). */
export type Line = number[]
export type Ring = number[]
/** Rings to fill, and the stretches of their edge that are not a tile's cut line. */
export interface Shape {
  r: Ring[]
  e: Line[]
}
export type RoadClass = 'hw' | 'pri' | 'sec' | 'ter' | 'res' | 'srv' | 'foot'
export type LabelKind = 'road' | 'soi' | 'station' | 'district' | 'town' | 'park' | 'water' | 'civic' | 'worship'
/** A name on the base map. `a` is the angle of a name written along a road or a canal, in radians. */
export interface Label {
  t: string
  x: number
  y: number
  a?: number
  k: LabelKind
}
export interface CityData {
  water: Shape[]
  waterline: Line[]
  green: Ring[][]
  runway: Line[]
  border: Line[]
  rail: Line[]
  hw: Line[]
  pri: Line[]
  sec: Line[]
  ter: Line[]
  labels: Label[]
  districts: { name: string; zone: string; rings: Ring[] }[]
}
export interface TileData {
  water: Shape[]
  canal: Line[]
  green: Ring[][]
  /** District level: built-up blocks. */
  blocks?: Ring[][]
  /** Street level: buildings, with their height in metres. */
  buildings?: (Shape & { h: number })[]
  roads: Partial<Record<RoadClass, Line[]>>
  bridges: Partial<Record<RoadClass, Line[]>>
  /** `u` is 1 for a line under the ground. */
  rail: { p: Line; u: 0 | 1 }[]
  labels: Label[]
}
/** A map file and the area it covers: west, north, east, south in metres. */
export interface TileRef {
  file: string
  box: [number, number, number, number]
}
export interface Manifest {
  origin: { lat: number; lon: number; kx: number; ky: number }
  credit: string
  date: string
  city: string
  district: TileRef[]
  street: TileRef[]
  /** Care point id -> metres to the nearest real clinic or hospital. */
  clearance: Record<string, number>
}
export interface ZoneData {
  id: string
  name: string
  label: [number, number]
  rings: Ring[]
  edges: Line[]
}
