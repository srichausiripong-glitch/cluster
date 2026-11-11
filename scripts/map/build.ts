// Bakes the prototype's map files from the downloads in scripts/map/.cache. Run: npm run map:build
// Output: public/map/** (read by the app at run time) and src/map/data/zones.json (bundled, for the
// zone buttons). Coordinates are metres east and south of a fixed point in central Bangkok.
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { VectorTile } from '@mapbox/vector-tile'
import { PbfReader } from 'pbf'
import type { CityData, Label, LabelKind, Line, Manifest, RoadClass, Shape, TileData, TileRef, ZoneData } from '../../src/map/types.ts'
import { CARE_POINTS } from '../../src/store/seed.ts'
import { labelKind, roadClass } from './classify.ts'
import { isClosed, lengthOf, simplify, simplifyRing, stitch, type LatLon } from './geometry.ts'
import { boundsOf, idOf, SETS, tileAt, type TileId } from './sets.ts'

const CACHE = new URL('./.cache/', import.meta.url)
const PUBLIC = new URL('../../public/map/', import.meta.url)
const ZONES_FILE = new URL('../../src/map/data/zones.json', import.meta.url)
const OUTLINE_FILE = new URL('../../src/map/data/outline.json', import.meta.url)

const ORIGIN = { lat: 13.75, lon: 100.55 }
const KX = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180)
const KY = 110574
const xy = (p: LatLon): [number, number] => [(p.lon - ORIGIN.lon) * KX, (ORIGIN.lat - p.lat) * KY]
const round = (v: number, q: number) => Math.round(v * q) / q

// ---- reading tiles -----------------------------------------------------------------------------
interface Pt {
  x: number
  y: number
}
interface Feature {
  p: Record<string, unknown>
  type: number
  geom: Pt[][]
  extent: number
  to: (pt: Pt) => [number, number]
}
const opened = new Map<string, VectorTile>()
function* each(set: TileId[], layerName: string): Generator<Feature> {
  for (const id of set) {
    const name = idOf(id)
    if (!opened.has(name)) opened.set(name, new VectorTile(new PbfReader(readFileSync(new URL(`tiles/${name}.pbf`, CACHE)))))
    const layer = opened.get(name)!.layers[layerName]
    if (!layer) continue
    const [z, x, y] = id
    const n = 2 ** z
    const to = (pt: Pt): [number, number] => {
      const lon = ((x + pt.x / layer.extent) / n) * 360 - 180
      const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + pt.y / layer.extent)) / n))) * 180) / Math.PI
      return xy({ lat, lon })
    }
    for (let i = 0; i < layer.length; i++) {
      const f = layer.feature(i)
      yield { p: f.properties, type: f.type, geom: f.loadGeometry(), extent: layer.extent, to }
    }
  }
}
const flat = (pts: Pt[], to: Feature['to'], q: number) => pts.flatMap((pt) => to(pt).map((v) => round(v, q)))
const lines = (f: Feature, q: number): Line[] => f.geom.filter((g) => g.length > 1).map((g) => flat(g, f.to, q))
/** A polygon: rings to fill, and the stretches of its edge that are not the tile's own cut line. */
function shape(f: Feature, q: number): Shape {
  const inside = (pt: Pt) => pt.x > 0 && pt.x < f.extent && pt.y > 0 && pt.y < f.extent
  const edges: Pt[][] = []
  for (const ring of f.geom) {
    let run: Pt[] | null = null
    for (let i = 1; i < ring.length; i++) {
      if (inside(ring[i - 1]) || inside(ring[i])) {
        if (!run) edges.push((run = [ring[i - 1]]))
        run.push(ring[i])
      } else run = null
    }
  }
  return { r: f.geom.filter((g) => g.length > 3).map((g) => flat(g, f.to, q)), e: edges.map((run) => flat(run, f.to, q)) }
}
const pointOf = (f: Feature) => f.to(f.geom[0][0])
/** The area of a tile: west, north, east, south in metres. */
function boxOf(id: TileId): [number, number, number, number] {
  const [s, w, n, e] = boundsOf(id)
  const [x0, y0] = xy({ lat: n, lon: w })
  const [x1, y1] = xy({ lat: s, lon: e })
  return [Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1)]
}
const within = ([x, y]: number[], [x0, y0, x1, y1]: number[]) => x >= x0 && x <= x1 && y >= y0 && y <= y1

// ---- names -------------------------------------------------------------------------------------
const short = (name: string) => name.replace(/^ถนน/, 'ถ.').replace(/^ซอย/, 'ซ.').replace(/\s+/g, ' ').trim()

/** Names written along a road or a canal: the middle of each long stretch, turned the way it runs. */
function lineLabels(set: TileId[], layer: 'transportation_name' | 'waterway', box: number[] | null, rule: { minLen: number; sameGap: number; anyGap: number }): Label[] {
  const found: (Label & { len: number })[] = []
  for (const f of each(set, layer)) {
    const kind = labelKind(layer, f.p)
    const name = typeof f.p.name === 'string' ? f.p.name : ''
    if (!kind || !name) continue
    for (const p of lines(f, 10)) {
      const len = lengthOf(p)
      if (len < rule.minLen) continue
      const at = (dist: number): [number, number] => {
        let run = 0
        for (let i = 2; i < p.length; i += 2) {
          const seg = Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1])
          if (run + seg >= dist) {
            const t = seg ? (dist - run) / seg : 0
            return [p[i - 2] + (p[i] - p[i - 2]) * t, p[i - 1] + (p[i + 1] - p[i - 1]) * t]
          }
          run += seg
        }
        return [p[p.length - 2], p[p.length - 1]]
      }
      const reach = Math.min(len / 4, 80)
      const a = at(len / 2 - reach)
      const b = at(len / 2 + reach)
      const mid = at(len / 2)
      if (box && !within(mid, box)) continue
      let angle = Math.atan2(b[1] - a[1], b[0] - a[0])
      if (angle > Math.PI / 2) angle -= Math.PI
      if (angle < -Math.PI / 2) angle += Math.PI
      found.push({ t: short(name), x: Math.round(mid[0]), y: Math.round(mid[1]), a: round(angle, 100), k: kind, len })
    }
  }
  found.sort((p, q) => q.len - p.len)
  const kept: (Label & { len: number })[] = []
  for (const f of found) if (!kept.some((k) => Math.hypot(k.x - f.x, k.y - f.y) < (k.t === f.t ? rule.sameGap : rule.anyGap))) kept.push(f)
  return kept.map(({ len: _len, ...label }) => label)
}

/** Names that stand at a point: stations, districts, towns, parks, public offices, places of worship. */
function pointLabels(set: TileId[], box: number[] | null, kinds: LabelKind[], most: number): Label[] {
  const found: (Label & { rank: number })[] = []
  for (const layer of ['poi', 'place'] as const) {
    for (const f of each(set, layer)) {
      const kind = labelKind(layer, f.p)
      const name = typeof f.p.name === 'string' ? f.p.name.trim() : ''
      if (!kind || !name || !kinds.includes(kind)) continue
      const [x, y] = pointOf(f).map(Math.round)
      if (box && !within([x, y], box)) continue
      if (found.some((l) => l.t === name && l.k === kind && Math.hypot(l.x - x, l.y - y) < 600)) continue
      found.push({ t: name, x, y, k: kind, rank: Number(f.p.rank ?? 99) })
    }
  }
  // Every station is kept; of the rest, the best-ranked few.
  const stations = found.filter((l) => l.k === 'station')
  const rest = found.filter((l) => l.k !== 'station').sort((a, b) => a.rank - b.rank).slice(0, most)
  return [...stations, ...rest].map(({ rank: _rank, ...label }) => label)
}

// ---- one tile of the district or the street level ---------------------------------------------
function tileData(id: TileId, level: 'district' | 'street'): TileData {
  const set = [id]
  const q = level === 'street' ? 2 : 1
  const box = boxOf(id)
  const keep: RoadClass[] = level === 'street' ? ['hw', 'pri', 'sec', 'ter', 'res', 'srv', 'foot'] : ['hw', 'pri', 'sec', 'ter', 'res']
  const data: TileData = { water: [], canal: [], green: [], roads: {}, bridges: {}, rail: [], labels: [] }
  for (const f of each(set, 'water')) if (f.p.class !== 'swimming_pool') data.water.push(shape(f, q))
  for (const f of each(set, 'waterway')) if (f.p.brunnel !== 'tunnel' && (level === 'street' || f.p.class === 'river' || f.p.class === 'canal')) data.canal.push(...lines(f, q))
  for (const f of each(set, 'landcover')) if (f.p.class === 'wood' || f.p.class === 'grass') data.green.push(shape(f, q).r)
  if (level === 'district') {
    data.blocks = []
    for (const f of each(set, 'building')) data.blocks.push(shape(f, q).r)
  } else {
    data.buildings = []
    for (const f of each(set, 'building')) data.buildings.push({ ...shape(f, q), h: Number(f.p.render_height ?? 0) })
  }
  for (const f of each(set, 'transportation')) {
    if (f.p.class === 'rail' || f.p.class === 'transit') {
      if (!f.p.service) for (const p of lines(f, q)) data.rail.push({ p, u: f.p.brunnel === 'tunnel' ? 1 : 0 })
      continue
    }
    const kind = roadClass(f.p)
    if (!kind || !keep.includes(kind) || f.p.brunnel === 'tunnel') continue
    const into = f.p.brunnel === 'bridge' ? data.bridges : data.roads
    ;(into[kind] ??= []).push(...lines(f, q))
  }
  data.labels =
    level === 'district'
      ? [
          ...pointLabels(set, box, ['station', 'district'], 12),
          ...lineLabels(set, 'transportation_name', box, { minLen: 650, sameGap: 2600, anyGap: 520 }).filter((l) => l.k === 'road'),
          ...lineLabels(set, 'waterway', box, { minLen: 1200, sameGap: 3000, anyGap: 600 }),
        ]
      : [
          ...pointLabels(set, box, ['station', 'district', 'park', 'civic', 'worship'], 14),
          ...lineLabels(set, 'transportation_name', box, { minLen: 95, sameGap: 400, anyGap: 44 }),
          ...lineLabels(set, 'waterway', box, { minLen: 300, sameGap: 900, anyGap: 120 }),
        ]
  return data
}

// ---- the city level ----------------------------------------------------------------------------
const city: CityData = { water: [], waterline: [], green: [], runway: [], border: [], rail: [], hw: [], pri: [], sec: [], ter: [], labels: [], districts: [] }
for (const f of each(SETS.region, 'water')) city.water.push(shape(f, 1))
for (const f of each(SETS.region, 'waterway')) if (f.p.class === 'river' || f.p.class === 'canal') city.waterline.push(...lines(f, 1))
for (const f of each(SETS.region, 'landcover')) if (['wood', 'grass', 'wetland'].includes(String(f.p.class))) city.green.push(shape(f, 1).r)
for (const f of each(SETS.region, 'aeroway')) if (f.p.class === 'runway' && f.type === 2) city.runway.push(...lines(f, 1))
for (const f of each(SETS.region, 'boundary')) if (f.p.admin_level === 4) city.border.push(...lines(f, 1))
for (const f of each(SETS.region, 'transportation')) {
  if (f.p.brunnel === 'tunnel') continue
  if (f.p.class === 'rail' && !f.p.service) city.rail.push(...lines(f, 1))
  const kind = roadClass(f.p)
  if (kind === 'hw' || kind === 'pri') city[kind].push(...lines(f, 1))
}
for (const f of each(SETS.city, 'transportation')) {
  const kind = roadClass(f.p)
  if (f.p.brunnel !== 'tunnel' && (kind === 'sec' || kind === 'ter')) city[kind].push(...lines(f, 1))
}
city.labels = [
  ...pointLabels(SETS.region, null, ['town'], 40).filter((l) => l.t !== 'กรุงเทพมหานคร'),
  { t: 'อ่าวไทย', k: 'water', x: Math.round(xy({ lat: 13.335, lon: 100.6 })[0]), y: Math.round(xy({ lat: 13.335, lon: 100.6 })[1]) },
]

// ---- districts and the six zones ---------------------------------------------------------------
// The list of districts in each zone was written from memory. Check it against the Bangkok
// Metropolitan Administration's announcement before real use.
const GROUPS: Record<string, string[]> = {
  central: ['พระนคร', 'ดุสิต', 'ป้อมปราบศัตรูพ่าย', 'สัมพันธวงศ์', 'ดินแดง', 'ห้วยขวาง', 'พญาไท', 'ราชเทวี', 'วังทองหลาง'],
  south: ['ปทุมวัน', 'บางรัก', 'สาทร', 'บางคอแหลม', 'ยานนาวา', 'คลองเตย', 'วัฒนา', 'พระโขนง', 'สวนหลวง', 'บางนา'],
  north: ['จตุจักร', 'บางซื่อ', 'ลาดพร้าว', 'หลักสี่', 'ดอนเมือง', 'สายไหม', 'บางเขน'],
  east: ['บางกะปิ', 'สะพานสูง', 'บึงกุ่ม', 'คันนายาว', 'ลาดกระบัง', 'มีนบุรี', 'หนองจอก', 'คลองสามวา', 'ประเวศ'],
  thon_north: ['ธนบุรี', 'คลองสาน', 'จอมทอง', 'บางกอกใหญ่', 'บางกอกน้อย', 'บางพลัด', 'ตลิ่งชัน', 'ทวีวัฒนา'],
  thon_south: ['ภาษีเจริญ', 'บางแค', 'หนองแขม', 'บางขุนเทียน', 'บางบอน', 'ราษฎร์บูรณะ', 'ทุ่งครุ'],
}
const NAMES: Record<string, string> = { north: 'กรุงเทพเหนือ', central: 'กรุงเทพกลาง', east: 'กรุงเทพตะวันออก', south: 'กรุงเทพใต้', thon_north: 'กรุงธนเหนือ', thon_south: 'กรุงธนใต้' }
/** Where each zone's name is written at city level, chosen so the names clear the care points. */
const ANCHORS: Record<string, [number, number]> = { north: [13.94, 100.62], central: [13.797, 100.565], east: [13.845, 100.72], south: [13.688, 100.615], thon_north: [13.81, 100.415], thon_south: [13.63, 100.43] }

interface Member {
  type: string
  ref: number
  role: string
  geometry?: LatLon[]
}
const tidy = (way: LatLon[], tolerance: number): number[] => (isClosed(way) ? simplifyRing(way.map(xy), tolerance) : simplify(way.map(xy), tolerance)).flat().map(Math.round)
const districtRings = new Map<string, LatLon[][]>() // zone -> rings of its districts
const owners = new Map<number, { geometry: LatLon[]; zones: string[] }>() // boundary way -> zones of the districts it borders
const relations = JSON.parse(await readFile(new URL('districts.json', CACHE), 'utf8')).elements as { tags?: Record<string, string>; members: Member[] }[]
for (const rel of relations) {
  const full = (rel.tags?.['name:th'] || rel.tags?.name || '').trim()
  const name = full.replace(/^เขต/, '')
  const zone = Object.keys(GROUPS).find((g) => GROUPS[g].includes(name))
  if (!zone || full.startsWith('อำเภอ')) continue
  const outer = rel.members.filter((m) => m.type === 'way' && m.geometry && m.role !== 'inner')
  const ringsOfDistrict = stitch(outer.map((m) => m.geometry!)).filter(isClosed)
  city.districts.push({ name, zone, rings: ringsOfDistrict.map((r) => tidy(r, 10)) })
  districtRings.set(zone, [...(districtRings.get(zone) ?? []), ...ringsOfDistrict])
  for (const m of outer) {
    if (!owners.has(m.ref)) owners.set(m.ref, { geometry: m.geometry!, zones: [] })
    owners.get(m.ref)!.zones.push(zone)
  }
}
const zones: ZoneData[] = Object.keys(GROUPS).map((id) => ({
  id,
  name: NAMES[id],
  label: xy({ lat: ANCHORS[id][0], lon: ANCHORS[id][1] }).map(Math.round) as [number, number],
  rings: (districtRings.get(id) ?? []).map((r) => tidy(r, 40)),
  // An edge is on the zone's outline when exactly one of the zone's districts touches it.
  edges: stitch([...owners.values()].filter((o) => o.zones.filter((z) => z === id).length === 1).map((o) => o.geometry)).map((c) => tidy(c, 10)),
}))

// The city's own outline: the edges that only one district touches. Drawn when the whole city is one area.
const outline = stitch([...owners.values()].filter((o) => o.zones.length === 1).map((o) => o.geometry)).map((c) => tidy(c, 10))

// ---- how far each example care point is from a real clinic or hospital --------------------------
const clearance: Record<string, number> = {}
for (const point of CARE_POINTS) {
  const here = xy(point)
  let nearest = 9999
  for (const f of each([tileAt(14, point.lat, point.lon)], 'poi')) {
    const health = f.p.class === 'hospital' || ['hospital', 'clinic', 'doctors'].includes(String(f.p.subclass))
    if (!health) continue
    const [x, y] = pointOf(f)
    nearest = Math.min(nearest, Math.hypot(x - here[0], y - here[1]))
  }
  clearance[point.id] = Math.round(nearest)
}
const tooNear = Object.entries(clearance).filter(([, metres]) => metres < 60)
if (tooNear.length) {
  console.error('too near a real clinic or hospital (under 60 m):', tooNear.map(([id, m]) => `${id} ${m} m`).join(', '))
  process.exit(1)
}

// ---- write -------------------------------------------------------------------------------------
await rm(PUBLIC, { recursive: true, force: true })
await mkdir(new URL('district/', PUBLIC), { recursive: true })
await mkdir(new URL('street/', PUBLIC), { recursive: true })
await mkdir(new URL('./', ZONES_FILE), { recursive: true })
const sizes: string[] = []
const save = async (file: string, data: unknown) => {
  const text = JSON.stringify(data)
  await writeFile(new URL(file, PUBLIC), text)
  sizes.push(`${file} ${(text.length / 1e6).toFixed(2)} MB`)
  return text.length
}
let total = await save('city.json', city)
const refs = async (set: TileId[], level: 'district' | 'street'): Promise<TileRef[]> => {
  const list: TileRef[] = []
  for (const id of set) {
    const file = `${level}/${idOf(id)}.json`
    total += await save(file, tileData(id, level))
    list.push({ file, box: boxOf(id) })
  }
  return list
}
const source = existsSync(new URL('source.json', CACHE)) ? JSON.parse(await readFile(new URL('source.json', CACHE), 'utf8')) : { date: 'unknown' }
const manifest: Manifest = {
  origin: { ...ORIGIN, kx: KX, ky: KY },
  credit: '© ผู้ร่วมสร้าง OpenStreetMap · OpenMapTiles',
  date: source.date,
  city: 'city.json',
  district: await refs(SETS.district, 'district'),
  street: await refs(SETS.street, 'street'),
  clearance,
}
total += await save('index.json', manifest)
await writeFile(ZONES_FILE, `${JSON.stringify(zones)}\n`)
await writeFile(OUTLINE_FILE, `${JSON.stringify(outline)}\n`)

console.log(sizes.join('\n'))
console.log(`districts ${city.districts.length} of 50 | zones ${zones.map((z) => `${z.id}: ${z.rings.length} districts, ${z.edges.length} edge runs`).join(' | ')}`)
console.log(`clearance (m): ${Object.entries(clearance).map(([id, m]) => `${id} ${m}`).join(', ')}`)
console.log(`zones.json ${(JSON.stringify(zones).length / 1e6).toFixed(2)} MB | public/map total ${(total / 1e6).toFixed(2)} MB of 12`)
