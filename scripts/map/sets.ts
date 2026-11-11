// Which map tiles the prototype's map is baked from. A box is [south, west, north, east].
export type Box = [number, number, number, number]
/** zoom, x, y */
export type TileId = [number, number, number]

/** The city level: the region round Bangkok, and one zoom deeper for the city's smaller roads. */
export const REGION: Box = [13.28, 100.3, 14.26, 100.93]
export const CITY: Box = [13.48, 100.32, 13.97, 100.95]
/** The district level: the inner city, about 7 by 11 km. */
export const INNER: Box = [13.694, 100.508, 13.79, 100.572]
/** The street level: a strip from Victory Monument to Silom, under the four care points of the pitch. */
export const STREET: TileId[] = [
  [14, 12767, 7559],
  [14, 12767, 7560],
  [14, 12767, 7561],
]

const xOf = (lon: number, z: number) => Math.floor(((lon + 180) / 360) * 2 ** z)
const yOf = (lat: number, z: number) => Math.floor(((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z)
export const tileAt = (z: number, lat: number, lon: number): TileId => [z, xOf(lon, z), yOf(lat, z)]
export const idOf = ([z, x, y]: TileId) => `${z}-${x}-${y}`

/** Every tile of zoom `z` that touches the box. */
export function cover(z: number, [s, w, n, e]: Box): TileId[] {
  const list: TileId[] = []
  for (let x = xOf(w, z); x <= xOf(e, z); x++) for (let y = yOf(n, z); y <= yOf(s, z); y++) list.push([z, x, y])
  return list
}

/** The area a tile covers. */
export function boundsOf([z, x, y]: TileId): Box {
  const n = 2 ** z
  const lat = (row: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * row) / n))) * 180) / Math.PI
  return [lat(y + 1), (x / n) * 360 - 180, lat(y), ((x + 1) / n) * 360 - 180]
}

export const SETS = { region: cover(10, REGION), city: cover(11, CITY), district: cover(13, INNER), street: STREET }
