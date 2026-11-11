// The map's three canvas layers. Ground: land, parks and the marks of areas without a signal.
// Dots: the signal, redrawn on its own while the newest zone breathes. Lines: water, buildings,
// roads, rail, the edge of each signal and the names of the base map.
// Zones and care points are not drawn here: they are real buttons in the SVG layer above.
import type { AreaState, PublishedArea } from '../domain/types'
import { CITY_EDGES, ZONES } from './areas'
import { breath, DOT_GAP, DOT_R, EDGE, ROADS, type Palette } from './style'
import type { CityData, Label, Line, RoadClass, Shape, TileData } from './types'
import { toScreen, type Box, type Size, type View } from './view'

export interface Scene {
  view: View
  size: Size
  dpr: number
  palette: Palette
  city: CityData | null
  tiles: TileData[]
  /** Published state by area id: the six zones in phase 2, 'bkk' in phase 1. */
  areas: Map<string, PublishedArea>
  phase: 1 | 2
  showSignal: boolean
  /** Screen boxes that names on the base map keep clear of: markers and zone name boxes. */
  avoid?: Box[]
}

type Ctx = CanvasRenderingContext2D
const FONT = '"Anuphan Variable", "Noto Sans Thai", sans-serif'

/** Draw in metres: one unit is one metre. Widths are given in screen pixels and divided by the scale. */
function world(ctx: Ctx, s: Scene) {
  const [ox, oy] = toScreen(s.view, s.size, [0, 0])
  ctx.setTransform(s.dpr * s.view.ppm, 0, 0, s.dpr * s.view.ppm, s.dpr * ox, s.dpr * oy)
}
const screen = (ctx: Ctx, s: Scene) => ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0)

function trace(ctx: Ctx, a: number[]) {
  ctx.moveTo(a[0], a[1])
  for (let i = 2; i < a.length; i += 2) ctx.lineTo(a[i], a[i + 1])
}
function outline(ctx: Ctx, rings: number[][]) {
  ctx.beginPath()
  for (const ring of rings) {
    trace(ctx, ring)
    ctx.closePath()
  }
}
function stroke(ctx: Ctx, s: Scene, list: number[][] | undefined, px: number, color: string, o: { alpha?: number; dash?: number[]; cap?: CanvasLineCap } = {}) {
  if (!list || !list.length) return
  ctx.beginPath()
  for (const a of list) trace(ctx, a)
  ctx.lineWidth = px / s.view.ppm
  ctx.strokeStyle = color
  ctx.lineJoin = 'round'
  ctx.lineCap = o.cap ?? 'round'
  ctx.setLineDash((o.dash ?? []).map((d) => d / s.view.ppm))
  ctx.globalAlpha = o.alpha ?? 1
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 1
}
/** Tile pieces overlap at their edges, so shapes are filled by winding: an overlap stays filled. */
function fill(ctx: Ctx, ringLists: number[][][], color: string, alpha = 1) {
  if (!ringLists.length) return
  ctx.beginPath()
  for (const rings of ringLists) {
    for (const ring of rings) {
      trace(ctx, ring)
      ctx.closePath()
    }
  }
  ctx.fillStyle = color
  ctx.globalAlpha = alpha
  ctx.fill('nonzero')
  ctx.globalAlpha = 1
}

interface Painted {
  rings: number[][]
  edges: number[][]
  area: PublishedArea | undefined
}
/** What carries a signal: each zone in the phase 2 preview; the whole city as one area in phase 1. */
function painted(s: Scene): Painted[] {
  if (s.phase === 1) return [{ rings: ZONES.flatMap((z) => z.rings), edges: CITY_EDGES, area: s.areas.get('bkk') }]
  return ZONES.map((z) => ({ rings: z.rings, edges: z.edges, area: s.areas.get(z.id) }))
}
/** The part of the screen an area covers, or null when it is out of view. */
function onScreen(s: Scene, rings: number[][]): Box | null {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i += 2) {
      if (ring[i] < x0) x0 = ring[i]
      if (ring[i] > x1) x1 = ring[i]
      if (ring[i + 1] < y0) y0 = ring[i + 1]
      if (ring[i + 1] > y1) y1 = ring[i + 1]
    }
  }
  const [a, b] = toScreen(s.view, s.size, [x0, y0])
  const [c, d] = toScreen(s.view, s.size, [x1, y1])
  const box: Box = [Math.max(0, a), Math.max(0, b), Math.min(s.size.w, c), Math.min(s.size.h, d)]
  return box[0] < box[2] && box[1] < box[3] ? box : null
}

// ---- ground -----------------------------------------------------------------------------------
/** An area without a signal is marked quietly: thin slanted lines below the threshold, a faint grid where no clinic reports, nothing where there is no data. */
function quiet(ctx: Ctx, s: Scene, rings: number[][], state: AreaState) {
  if (state !== 'below_threshold' && state !== 'no_partner') return
  const box = onScreen(s, rings)
  if (!box) return
  ctx.save()
  outline(ctx, rings)
  ctx.clip()
  screen(ctx, s)
  ctx.beginPath()
  if (state === 'below_threshold') {
    const reach = box[3] - box[1]
    for (let x = Math.floor((box[0] - reach) / 9) * 9; x < box[2]; x += 9) {
      ctx.moveTo(x, box[1])
      ctx.lineTo(x + reach, box[3])
    }
    ctx.strokeStyle = s.palette.signalSoft
    ctx.lineWidth = 1.2
  } else {
    for (let x = Math.floor(box[0] / 12) * 12; x < box[2]; x += 12) {
      ctx.moveTo(x, box[1])
      ctx.lineTo(x, box[3])
    }
    for (let y = Math.floor(box[1] / 12) * 12; y < box[3]; y += 12) {
      ctx.moveTo(box[0], y)
      ctx.lineTo(box[2], y)
    }
    ctx.strokeStyle = s.palette.ink
    ctx.globalAlpha = 0.22
    ctx.lineWidth = 1
  }
  ctx.stroke()
  ctx.restore()
  world(ctx, s)
}

export function paintGround(ctx: Ctx, s: Scene): void {
  const p = s.palette
  screen(ctx, s)
  ctx.fillStyle = p.landOut
  ctx.fillRect(0, 0, s.size.w, s.size.h)
  world(ctx, s)
  // South of the baked tiles there is only the Gulf of Thailand.
  ctx.fillStyle = p.water
  ctx.fillRect(-200000, 55500, 400000, 60000)
  // The city's ground stays warm: a signal is dots on it, never a wash over it.
  fill(ctx, ZONES.map((z) => z.rings), p.land)
  if (s.view.level === 'city') {
    if (s.city) fill(ctx, s.city.green, p.park, 0.75)
  } else {
    for (const tile of s.tiles) fill(ctx, tile.green, p.park)
  }
  if (s.showSignal) for (const { rings, area } of painted(s)) quiet(ctx, s, rings, area?.state ?? 'no_data')
  if (s.view.level === 'district') for (const tile of s.tiles) if (tile.blocks) fill(ctx, tile.blocks, p.ink, 0.07)
}

// ---- dots -------------------------------------------------------------------------------------
/**
 * The signal: violet dots on a slanted grid, bigger for a higher level. The grid is fixed to the
 * map, so the dots travel with it when it is dragged. `timeMs` moves the dots of a zone that was
 * just reported; null draws everything still.
 */
export function paintDots(ctx: Ctx, s: Scene, timeMs: number | null): void {
  screen(ctx, s)
  ctx.clearRect(0, 0, s.size.w, s.size.h)
  if (!s.showSignal) return
  const street = s.view.level === 'street'
  const d = (street ? 14 : DOT_GAP) * Math.SQRT2
  const [ox, oy] = toScreen(s.view, s.size, [0, 0])
  for (const { rings, area } of painted(s)) {
    if (area?.state !== 'shown' || !area.density) continue
    const box = onScreen(s, rings)
    if (!box) continue
    const r = DOT_R[area.density] * (street ? 1.5 : 1) * (area.step === 'new' && timeMs !== null ? breath(timeMs, false) : 1)
    ctx.save()
    world(ctx, s)
    outline(ctx, rings)
    ctx.clip()
    screen(ctx, s)
    ctx.beginPath()
    for (let k = Math.floor((box[1] - oy) / (d / 2)) - 1; k <= Math.ceil((box[3] - oy) / (d / 2)) + 1; k++) {
      const y = oy + k * (d / 2)
      const shift = k & 1 ? d / 2 : 0
      for (let i = Math.floor((box[0] - ox - shift) / d) - 1; i <= Math.ceil((box[2] - ox - shift) / d) + 1; i++) {
        const x = ox + shift + i * d
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, Math.PI * 2)
      }
    }
    ctx.fillStyle = s.palette.signal
    ctx.globalAlpha = street ? 0.5 : 0.92
    ctx.fill()
    ctx.restore()
  }
}

// ---- lines ------------------------------------------------------------------------------------
function water(ctx: Ctx, s: Scene, shapes: Shape[], edgePx: number, alpha = 0.9) {
  fill(ctx, shapes.map((shape) => shape.r), s.palette.water)
  stroke(ctx, s, shapes.flatMap((shape) => shape.e), edgePx, s.palette.ink, { alpha })
}
/** Roads, low class to high: every casing first, then every fill, so junctions join cleanly. Bridges go on top. */
function roadNet(ctx: Ctx, s: Scene, ground: Partial<Record<RoadClass, Line[]>>, bridges: Partial<Record<RoadClass, Line[]>>, spec: [RoadClass, number, number, number][]) {
  for (const set of [ground, bridges]) {
    for (const [k, casing, , alpha] of spec) stroke(ctx, s, set[k], casing, s.palette.ink, { alpha, cap: set === bridges ? 'butt' : 'round' })
    for (const [k, , inner] of spec) stroke(ctx, s, set[k], inner, k === 'hw' ? s.palette.yellow : s.palette.surface)
  }
}
function rails(ctx: Ctx, s: Scene, list: { p: Line; u: 0 | 1 }[], px: number) {
  stroke(ctx, s, list.filter((r) => r.u).map((r) => r.p), px * 0.8, s.palette.ink, { alpha: 0.5, dash: [5, 4], cap: 'butt' })
  const open = list.filter((r) => !r.u).map((r) => r.p)
  stroke(ctx, s, open, px, s.palette.ink)
  stroke(ctx, s, open, px * 0.42, s.palette.surface, { dash: [px * 1.6, px * 1.6], cap: 'butt' })
}
const gather = (tiles: TileData[], from: 'roads' | 'bridges') => {
  const all: Partial<Record<RoadClass, Line[]>> = {}
  for (const tile of tiles) for (const [k, list] of Object.entries(tile[from]) as [RoadClass, Line[]][]) (all[k] ??= []).push(...list)
  return all
}

function cityLines(ctx: Ctx, s: Scene, city: CityData) {
  const p = s.palette
  if (s.view.level === 'city') {
    water(ctx, s, city.water, 0.7, 0.55)
    stroke(ctx, s, city.waterline, 0.9, p.water)
    stroke(ctx, s, city.border, 1, p.ink, { alpha: 0.32, dash: [5, 4], cap: 'butt' })
    stroke(ctx, s, city.ter, 0.5, p.ink, { alpha: 0.2 })
    stroke(ctx, s, city.sec, 0.7, p.ink, { alpha: 0.38 })
    stroke(ctx, s, city.rail, 0.8, p.ink, { alpha: 0.55, dash: [3, 2.5], cap: 'butt' })
    stroke(ctx, s, city.runway, 2.4, p.ink, { alpha: 0.45, cap: 'butt' })
    stroke(ctx, s, city.pri, 2.3, p.ink)
    stroke(ctx, s, city.pri, 1.05, p.surface)
    stroke(ctx, s, city.hw, 3.7, p.ink)
    stroke(ctx, s, city.hw, 1.9, p.yellow)
    return
  }
  // Below city level this is what shows where the prototype has no deeper map: water and the main roads.
  water(ctx, s, city.water, 1)
  roadNet(ctx, s, { ter: city.ter, sec: city.sec, pri: city.pri, hw: city.hw }, {}, ROADS[s.view.level].filter(([k]) => k !== 'res' && k !== 'srv'))
}

function tileLines(ctx: Ctx, s: Scene) {
  const p = s.palette
  const street = s.view.level === 'street'
  for (const tile of s.tiles) water(ctx, s, tile.water, street ? 1.2 : 1)
  const canals = s.tiles.flatMap((tile) => tile.canal)
  stroke(ctx, s, canals, street ? 6 : 2.6, p.ink, { alpha: street ? 1 : 0.8 })
  stroke(ctx, s, canals, street ? 3.8 : 1.5, p.water)
  if (street) {
    // Buildings: a hard shadow, longer for a taller one, then the block itself.
    const buildings = s.tiles.flatMap((tile) => tile.buildings ?? []).sort((a, b) => a.h - b.h)
    for (const b of buildings) {
      const lift = Math.max(2, Math.min(9, b.h / 9)) / s.view.ppm
      ctx.save()
      ctx.translate(lift, lift)
      fill(ctx, [b.r], p.ink, 0.3)
      ctx.restore()
    }
    for (const b of buildings) {
      fill(ctx, [b.r], '#fffdf4')
      stroke(ctx, s, b.e, 1.1, p.ink)
    }
    const ground = gather(s.tiles, 'roads')
    const bridges = gather(s.tiles, 'bridges')
    stroke(ctx, s, [...(ground.foot ?? []), ...(bridges.foot ?? [])], 1.1, p.ink, { alpha: 0.45, dash: [3, 3], cap: 'butt' })
    roadNet(ctx, s, ground, bridges, ROADS.street)
  } else {
    roadNet(ctx, s, gather(s.tiles, 'roads'), gather(s.tiles, 'bridges'), ROADS.district)
  }
  rails(ctx, s, s.tiles.flatMap((tile) => tile.rail), street ? 4.6 : 2.2)
}

/** The edge of each area, in the line of its state. Only the inner half is kept, so two neighbours' edges sit side by side. */
function areaEdges(ctx: Ctx, s: Scene) {
  const p = s.palette
  if (s.phase === 1) stroke(ctx, s, ZONES.flatMap((z) => z.edges), 1, p.ink, { alpha: 0.3, dash: [2, 4], cap: 'butt' })
  for (const { rings, edges, area } of painted(s)) {
    const state = area?.state ?? 'no_data'
    let line: { width: number; dash?: number[]; cap?: CanvasLineCap; color: string; alpha?: number }
    if (!s.showSignal) line = { width: 1, dash: [2, 4], cap: 'butt', color: p.ink, alpha: 0.35 }
    else if (state === 'shown') line = { ...EDGE[area?.step ?? 'mixed'], color: p.signalEdge }
    else if (state === 'below_threshold') line = { width: 1.8, dash: [4, 5], cap: 'butt', color: p.signalEdge, alpha: 0.75 }
    else if (state === 'no_partner') line = { width: 1.4, color: p.ink, alpha: 0.45 }
    else line = { width: 1.4, dash: [0.1, 5], cap: 'round', color: p.ink, alpha: 0.5 }
    ctx.save()
    outline(ctx, rings)
    ctx.clip()
    stroke(ctx, s, edges, line.width * 2, line.color, { dash: line.dash, cap: line.cap ?? 'butt', alpha: line.alpha })
    ctx.restore()
  }
}

// ---- names of the base map --------------------------------------------------------------------
interface Text {
  size: number
  weight?: number
  alpha?: number
  spacing?: string
  halo?: string
  haloW?: number
  angle?: number
  pad?: number
}
/** Writes a name unless it would land on another name, a marker, or off the screen. */
function write(ctx: Ctx, s: Scene, taken: Box[], str: string, x: number, y: number, t: Text): boolean {
  ctx.font = `${t.weight ?? 600} ${t.size}px ${FONT}`
  ctx.letterSpacing = t.spacing ?? '0px'
  const w = ctx.measureText(str).width + (t.pad ?? 6)
  const h = t.size * 1.5
  const a = t.angle ?? 0
  const hx = (Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * h) / 2
  const hy = (Math.abs(Math.sin(a)) * w + Math.abs(Math.cos(a)) * h) / 2
  const box: Box = [x - hx, y - hy, x + hx, y + hy]
  if (box[2] < 0 || box[0] > s.size.w || box[3] < 0 || box[1] > s.size.h) return false
  if (taken.some((other) => box[0] < other[2] && box[2] > other[0] && box[1] < other[3] && box[3] > other[1])) return false
  taken.push(box)
  ctx.save()
  ctx.translate(x, y)
  if (a) ctx.rotate(a)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (t.halo) {
    ctx.lineWidth = t.haloW ?? 3.5
    ctx.strokeStyle = t.halo
    ctx.lineJoin = 'round'
    ctx.strokeText(str, 0, 0)
  }
  ctx.fillStyle = s.palette.ink
  ctx.globalAlpha = t.alpha ?? 1
  ctx.fillText(str, 0, 0)
  ctx.restore()
  return true
}
function dot(ctx: Ctx, s: Scene, x: number, y: number, r: number, ring: boolean) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = ring ? s.palette.surface : s.palette.ink
  ctx.fill()
  if (ring) {
    ctx.lineWidth = 1.8
    ctx.strokeStyle = s.palette.ink
    ctx.stroke()
  }
}

function names(ctx: Ctx, s: Scene) {
  const p = s.palette
  const taken: Box[] = [...(s.avoid ?? [])]
  const at = (l: Label) => toScreen(s.view, s.size, [l.x, l.y])
  if (s.view.level === 'city') {
    for (const l of s.city?.labels ?? []) {
      const [x, y] = at(l)
      if (l.k === 'water') write(ctx, s, taken, l.t, x, y, { size: 12, alpha: 0.6, spacing: '0.08em' })
      else write(ctx, s, taken, l.t, x, y, { size: 10.5, alpha: 0.75, halo: p.landOut, pad: 14 })
    }
    return
  }
  const street = s.view.level === 'street'
  const labels = s.tiles.flatMap((tile) => tile.labels)
  const of = (...kinds: Label['k'][]) => labels.filter((l) => kinds.includes(l.k))
  for (const l of of('station')) {
    const [x, y] = at(l)
    if (x < -20 || x > s.size.w + 20 || y < -20 || y > s.size.h + 20) continue
    if (!street) {
      dot(ctx, s, x, y, 3.6, true)
      continue
    }
    // At street level a station is a yellow name plate, like a sign.
    ctx.font = `700 11.5px ${FONT}`
    ctx.letterSpacing = '0px'
    const w = ctx.measureText(l.t).width + 16
    const box: Box = [x - w / 2 - 2, y - 13, x + w / 2 + 4, y + 13]
    if (taken.some((o) => box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1])) continue
    taken.push(box)
    ctx.fillStyle = p.ink
    ctx.beginPath()
    ctx.roundRect(x - w / 2 + 2, y - 9, w, 22, 11)
    ctx.fill()
    ctx.fillStyle = p.yellow
    ctx.strokeStyle = p.ink
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.roundRect(x - w / 2, y - 11, w, 22, 11)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = p.ink
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(l.t, x, y + 0.5)
  }
  for (const l of of('district')) write(ctx, s, taken, l.t, ...at(l), { size: 12, weight: 700, spacing: '0.06em', halo: p.surface, haloW: 4, pad: 16 })
  for (const l of of('road')) write(ctx, s, taken, l.t, ...at(l), { size: street ? 11.5 : 10, weight: street ? 700 : 600, angle: l.a, halo: p.surface, haloW: 3.2, pad: 9 })
  for (const l of of('soi')) write(ctx, s, taken, l.t, ...at(l), { size: 10, angle: l.a, halo: p.surface, haloW: 3.2, pad: 8 })
  for (const l of of('water')) write(ctx, s, taken, l.t, ...at(l), { size: 10, weight: 500, alpha: 0.65, angle: l.a, halo: p.surface, haloW: 3, pad: 8 })
  if (!street) {
    for (const l of of('station')) {
      const [x, y] = at(l)
      write(ctx, s, taken, l.t, x, y - 11, { size: 9.5, alpha: 0.8, halo: p.surface, haloW: 3, pad: 4 })
    }
    return
  }
  for (const l of of('park', 'civic', 'worship')) {
    const [x, y] = at(l)
    if (write(ctx, s, taken, l.t, x, y + 9, { size: 10, weight: 500, alpha: 0.7, halo: '#fffdf4', haloW: 3, pad: 8 })) dot(ctx, s, x, y, 2.2, false)
  }
}

export function paintLines(ctx: Ctx, s: Scene): void {
  screen(ctx, s)
  ctx.clearRect(0, 0, s.size.w, s.size.h)
  world(ctx, s)
  if (s.city) cityLines(ctx, s, s.city)
  if (s.view.level !== 'city') tileLines(ctx, s)
  areaEdges(ctx, s)
  screen(ctx, s)
  names(ctx, s)
}
