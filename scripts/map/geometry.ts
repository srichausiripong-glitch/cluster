// Small geometry helpers for baking the map files. No dependency, so the tests can use them too.

export interface LatLon {
  lat: number
  lon: number
}
const key = (p: LatLon) => `${p.lat},${p.lon}`
export const isClosed = (way: LatLon[]) => way.length > 3 && key(way[0]) === key(way[way.length - 1])

/** Joins ways end to end, whatever their direction. Returns closed rings first, then what stayed open. */
export function stitch(ways: LatLon[][]): LatLon[][] {
  const closed: LatLon[][] = []
  const pool: LatLon[][] = []
  for (const way of ways) if (way && way.length > 1) (isClosed(way) ? closed : pool).push(way.slice())
  const chains: LatLon[][] = []
  while (pool.length) {
    let cur = pool.pop()!
    let grew = true
    while (grew && !isClosed(cur)) {
      grew = false
      for (let i = 0; i < pool.length; i++) {
        const way = pool[i]
        const a = key(way[0])
        const b = key(way[way.length - 1])
        const start = key(cur[0])
        const end = key(cur[cur.length - 1])
        if (a === end) cur = cur.concat(way.slice(1))
        else if (b === start) cur = way.concat(cur.slice(1))
        else if (b === end) cur = cur.concat(way.slice().reverse().slice(1))
        else if (a === start) cur = way.slice().reverse().concat(cur.slice(1))
        else continue
        pool.splice(i, 1)
        grew = true
        break
      }
    }
    chains.push(cur)
  }
  return [...closed.filter(isClosed), ...chains.filter(isClosed), ...chains.filter((c) => !isClosed(c))]
}

/** Douglas-Peucker: drops points that lie within `tolerance` of the line through their neighbours. */
export function simplify(points: [number, number][], tolerance: number): [number, number][] {
  if (points.length < 3) return points
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    const [ax, ay] = points[a]
    const dx = points[b][0] - ax
    const dy = points[b][1] - ay
    const len = Math.hypot(dx, dy)
    let max = 0
    let at = -1
    for (let i = a + 1; i < b; i++) {
      const d = len === 0 ? Math.hypot(points[i][0] - ax, points[i][1] - ay) : Math.abs(dy * (points[i][0] - ax) - dx * (points[i][1] - ay)) / len
      if (d > max) {
        max = d
        at = i
      }
    }
    if (max > tolerance && at > 0) {
      keep[at] = 1
      stack.push([a, at], [at, b])
    }
  }
  return points.filter((_, i) => keep[i])
}

/** A ring starts and ends at one point; it is cut at its farthest point so both halves keep their shape. */
export function simplifyRing(points: [number, number][], tolerance: number): [number, number][] {
  let far = 0
  let best = 0
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - points[0][0], points[i][1] - points[0][1])
    if (d > best) {
      best = d
      far = i
    }
  }
  return simplify(points.slice(0, far + 1), tolerance).concat(simplify(points.slice(far), tolerance).slice(1))
}

/** Even-odd test of a point against rings given as flat x, y lists. The app's own, so both agree. */
export { inRings as pointInRings } from '../../src/map/geo.ts'

export function lengthOf(line: number[]): number {
  let sum = 0
  for (let i = 2; i < line.length; i += 2) sum += Math.hypot(line[i] - line[i - 2], line[i + 1] - line[i - 1])
  return sum
}

/** Centre and area of a ring of points. */
export function centroid(points: [number, number][]): [number, number, number] {
  let a = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < points.length - 1; i++) {
    const f = points[i][0] * points[i + 1][1] - points[i + 1][0] * points[i][1]
    a += f
    cx += (points[i][0] + points[i + 1][0]) * f
    cy += (points[i][1] + points[i + 1][1]) * f
  }
  return a ? [cx / (3 * a), cy / (3 * a), Math.abs(a / 2)] : [points[0][0], points[0][1], 0]
}
