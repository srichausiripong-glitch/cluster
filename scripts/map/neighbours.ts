// Which districts touch, baked once from the district outlines, so the app can say what is near
// without ever asking where the phone is (redesign spec 5.7).   npm run map:neighbours
// Input: src/map/data/districts.json (outlines in metres). Output: src/map/data/neighbours.json.
import { readFile, writeFile } from 'node:fs/promises'

type Area = { id: string; edges: number[][] }
type Segment = [number, number, number, number]

/** How close two outlines must run to share a border, in metres: the outlines are simplified, so they never meet exactly. */
const NEAR = 80
/** How many points of one outline must lie that close to the other, so a single touching corner is not a border. */
const ENOUGH = 2

const IN = new URL('../../src/map/data/districts.json', import.meta.url)
const OUT = new URL('../../src/map/data/neighbours.json', import.meta.url)

/** Each side of an outline, as start and end. */
function segments(area: Area): Segment[] {
  const out: Segment[] = []
  for (const run of area.edges) for (let i = 0; i + 3 < run.length; i += 2) out.push([run[i], run[i + 1], run[i + 2], run[i + 3]])
  return out
}

/** Every corner of an outline and the middle of each side. */
function samples(area: Area): [number, number][] {
  const out: [number, number][] = []
  for (const [ax, ay, bx, by] of segments(area)) out.push([ax, ay], [(ax + bx) / 2, (ay + by) / 2])
  for (const run of area.edges) if (run.length >= 2) out.push([run[run.length - 2], run[run.length - 1]])
  return out
}

function distance([px, py]: [number, number], [ax, ay, bx, by]: Segment): number {
  const dx = bx - ax
  const dy = by - ay
  const length = dx * dx + dy * dy
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function box(area: Area): [number, number, number, number] {
  const b: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const run of area.edges)
    for (let i = 0; i + 1 < run.length; i += 2) {
      b[0] = Math.min(b[0], run[i])
      b[1] = Math.min(b[1], run[i + 1])
      b[2] = Math.max(b[2], run[i])
      b[3] = Math.max(b[3], run[i + 1])
    }
  return b
}

/** Whether enough of A's outline runs along B's. */
function runsAlong(a: Area, b: Area): boolean {
  const sides = segments(b)
  let close = 0
  for (const p of samples(a)) if (sides.some((s) => distance(p, s) <= NEAR) && ++close >= ENOUGH) return true
  return false
}

const areas = JSON.parse(await readFile(IN, 'utf8')) as Area[]
const boxes = new Map(areas.map((a) => [a.id, box(a)]))
const result: Record<string, string[]> = Object.fromEntries(areas.map((a) => [a.id, []]))
for (let i = 0; i < areas.length; i++)
  for (let j = i + 1; j < areas.length; j++) {
    const [a, b] = [areas[i], areas[j]]
    const [p, q] = [boxes.get(a.id)!, boxes.get(b.id)!]
    if (p[0] > q[2] + NEAR || q[0] > p[2] + NEAR || p[1] > q[3] + NEAR || q[1] > p[3] + NEAR) continue
    if (!runsAlong(a, b) && !runsAlong(b, a)) continue
    result[a.id].push(b.id)
    result[b.id].push(a.id)
  }
const sorted = Object.fromEntries(Object.keys(result).sort().map((id) => [id, result[id].sort()]))
await writeFile(OUT, JSON.stringify(sorted, null, 2) + '\n')
const counts = Object.values(sorted).map((list) => list.length)
console.log(`neighbours.json: ${areas.length} districts, ${Math.min(...counts)} to ${Math.max(...counts)} neighbours each`)
