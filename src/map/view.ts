import type { CarePoint } from '../store/seed'
import type { Zone } from './areas'
import { CITY_FRAME, LEVELS, PPM, toXY, type Level, type XY } from './geo'
import type { Manifest } from './types'

export interface Inset {
  top: number
  right: number
  bottom: number
  left: number
}
/** Space the map screen's own controls take: chips at the top; the care point card and half the send button at the bottom. */
export const MAP_INSET: Inset = { top: 108, right: 10, bottom: 116, left: 10 }
export interface Size {
  w: number
  h: number
  inset: Inset
}
/** The point `cx, cy` (metres) is drawn at the centre of the free window. */
export interface View {
  level: Level
  ppm: number
  cx: number
  cy: number
}
/** west, north, east, south: x0, y0, x1, y1. */
export type Box = [number, number, number, number]
/** Two markers nearer than this on screen become one. */
export const MARKER_GAP = 34

const free = (size: Size) => ({ w: Math.max(1, size.w - size.inset.left - size.inset.right), h: Math.max(1, size.h - size.inset.top - size.inset.bottom) })
const anchor = (size: Size): XY => [size.inset.left + free(size).w / 2, size.inset.top + free(size).h / 2]

/** The city level: the city frame fitted into the free window. */
export function cityView(size: Size): View {
  const [x0, y0] = toXY(CITY_FRAME.north, CITY_FRAME.west)
  const [x1, y1] = toXY(CITY_FRAME.south, CITY_FRAME.east)
  const { w, h } = free(size)
  return { level: 'city', ppm: Math.min(w / (x1 - x0), h / (y1 - y0)), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }
}

export function toScreen(view: View, size: Size, p: XY): XY {
  const [ax, ay] = anchor(size)
  return [ax + (p[0] - view.cx) * view.ppm, ay + (p[1] - view.cy) * view.ppm]
}
export function fromScreen(view: View, size: Size, s: XY): XY {
  const [ax, ay] = anchor(size)
  return [view.cx + (s[0] - ax) / view.ppm, view.cy + (s[1] - ay) / view.ppm]
}

export function step(level: Level, by: 1 | -1): Level {
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, LEVELS.indexOf(level) + by))]
}

/** Areas that have map data at a level. The city level covers everything. */
export function coverage(manifest: Manifest, level: Level): Box[] {
  return level === 'city' ? [[-Infinity, -Infinity, Infinity, Infinity]] : manifest[level].map((ref) => ref.box)
}
const inBox = ([x, y]: XY, [x0, y0, x1, y1]: Box) => x >= x0 && x <= x1 && y >= y0 && y <= y1
export function deepestAt(manifest: Manifest, p: XY): Level {
  if (coverage(manifest, 'street').some((box) => inBox(p, box))) return 'street'
  if (coverage(manifest, 'district').some((box) => inBox(p, box))) return 'district'
  return 'city'
}
/** The point of the level's data nearest to `p`. */
function nearestCovered(manifest: Manifest, level: Level, p: XY): XY {
  let best: XY = p
  let least = Infinity
  for (const [x0, y0, x1, y1] of coverage(manifest, level)) {
    const q: XY = [Math.min(x1, Math.max(x0, p[0])), Math.min(y1, Math.max(y0, p[1]))]
    const d = Math.hypot(q[0] - p[0], q[1] - p[1])
    if (d < least) {
      least = d
      best = q
    }
  }
  return best
}

/** The view at `level` centred as near `focus` as the data allows. The city level is always the fitted view. */
export function viewAt(manifest: Manifest, size: Size, level: Level, focus: XY): View {
  if (level === 'city') return cityView(size)
  const [cx, cy] = nearestCovered(manifest, level, focus)
  return { level, ppm: PPM[level], cx, cy }
}

/** Dragging: the centre stays on the data of its level; at city level within 35% of the screen from the fitted view. */
export function clampView(manifest: Manifest, size: Size, view: View): View {
  if (view.level !== 'city') {
    const [cx, cy] = nearestCovered(manifest, view.level, [view.cx, view.cy])
    return { ...view, cx, cy }
  }
  const fit = cityView(size)
  const slackX = (size.w * 0.35) / fit.ppm
  const slackY = (size.h * 0.35) / fit.ppm
  return { ...fit, cx: Math.min(fit.cx + slackX, Math.max(fit.cx - slackX, view.cx)), cy: Math.min(fit.cy + slackY, Math.max(fit.cy - slackY, view.cy)) }
}

export type Marker = { kind: 'one'; point: CarePoint; x: number; y: number } | { kind: 'many'; points: CarePoint[]; x: number; y: number }

/** Care points nearer than `gap` pixels on screen share one marker, placed at their mean. */
export function markers(points: CarePoint[], view: View, size: Size, gap = MARKER_GAP): Marker[] {
  const groups = [...points]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((point) => {
      const [x, y] = toScreen(view, size, toXY(point.lat, point.lon))
      return { points: [point], spots: [[x, y]] as XY[], x, y }
    })
  // Merging moves a marker, which can bring it within reach of another: repeat until nothing moves.
  for (let merged = true; merged; ) {
    merged = false
    search: for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        if (Math.hypot(groups[i].x - groups[j].x, groups[i].y - groups[j].y) >= gap) continue
        const a = groups[i]
        a.points.push(...groups[j].points)
        a.spots.push(...groups[j].spots)
        a.x = a.spots.reduce((sum, s) => sum + s[0], 0) / a.spots.length
        a.y = a.spots.reduce((sum, s) => sum + s[1], 0) / a.spots.length
        groups.splice(j, 1)
        merged = true
        break search
      }
    }
  }
  return groups.map((g) => (g.points.length === 1 ? { kind: 'one', point: g.points[0], x: g.x, y: g.y } : { kind: 'many', points: g.points.sort((a, b) => a.id.localeCompare(b.id)), x: g.x, y: g.y }))
}

/** A marker's space on screen: a pin stands 46 px above its point and is 38 px wide; a grouped marker is a 38 px disc centred on its point. */
export function markerBox(m: Marker): Box {
  return m.kind === 'one' ? [m.x - 19, m.y - 46, m.x + 19, m.y] : [m.x - 19, m.y - 19, m.x + 19, m.y + 19]
}

export interface NameBox {
  id: string
  name: string
  x: number
  y: number
  w: number
  h: number
}
/** Thai vowels and tone marks above or below a letter take no width. */
const advances = (name: string) => [...name].filter((ch) => !/[ัิ-ฺ็-๎]/.test(ch)).length
const touch = (a: Box, b: Box, pad: number) => a[0] < b[2] + pad && a[2] > b[0] - pad && a[1] < b[3] + pad && a[3] > b[1] - pad

/** Zone name boxes, centred on each zone's label point. A box that would touch a marker, another box or the edge of the map is left out. */
export function nameBoxes(zones: Zone[], view: View, size: Size, taken: Marker[]): NameBox[] {
  const placed: NameBox[] = []
  const boxOf = (b: NameBox): Box => [b.x - b.w / 2, b.y - b.h / 2, b.x + b.w / 2, b.y + b.h / 2]
  for (const zone of zones) {
    const [x, y] = toScreen(view, size, zone.label)
    const box: NameBox = { id: zone.id, name: zone.name, x, y, w: advances(zone.name) * 7.2 + 14, h: 23 }
    const b = boxOf(box)
    if (b[0] < 2 || b[2] > size.w - 2) continue
    if (taken.some((m) => touch(b, markerBox(m), 2)) || placed.some((p) => touch(b, boxOf(p), 2))) continue
    placed.push(box)
  }
  return placed
}
