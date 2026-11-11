import { expect, it } from 'vitest'
import { CARE_POINTS } from '../store/seed'
import { STUB_MANIFEST } from '../test/mapStub'
import { ZONES, zoneAt } from './areas'
import { CITY_FRAME, PPM, toXY } from './geo'
import { cityView, clampView, deepestAt, MAP_INSET, MARKER_GAP, markerBox, markers, nameBoxes, step, toScreen, viewAt, type Size } from './view'

const SIZES: [number, number][] = [[320, 480], [360, 606], [375, 678], [390, 714], [448, 760], [370, 436]]
const size = (w: number, h: number): Size => ({ w, h, inset: MAP_INSET })
const phone = size(390, 714)
const at = (id: string) => {
  const p = CARE_POINTS.find((c) => c.id === id)!
  return toXY(p.lat, p.lon)
}

it('fits the city frame inside the free window at every size', () => {
  for (const [w, h] of SIZES) {
    const s = size(w, h)
    const [x0, y0] = toScreen(cityView(s), s, toXY(CITY_FRAME.north, CITY_FRAME.west))
    const [x1, y1] = toScreen(cityView(s), s, toXY(CITY_FRAME.south, CITY_FRAME.east))
    expect(x0, `${w}`).toBeGreaterThanOrEqual(MAP_INSET.left - 0.01)
    expect(x1, `${w}`).toBeLessThanOrEqual(w - MAP_INSET.right + 0.01)
    expect(y0, `${h}`).toBeGreaterThanOrEqual(MAP_INSET.top - 0.01)
    expect(y1, `${h}`).toBeLessThanOrEqual(h - MAP_INSET.bottom + 0.01)
  }
})
it('puts every care point inside the zone it belongs to', () => {
  for (const p of CARE_POINTS) expect(zoneAt(toXY(p.lat, p.lon))?.id, p.id).toBe(p.zoneId)
})
it('gathers the four inner-city care points into one marker at city level, and separates them at district level', () => {
  const city = markers(CARE_POINTS, cityView(phone), phone)
  const many = city.filter((m) => m.kind === 'many')
  expect(many).toHaveLength(1)
  expect(many[0].kind === 'many' && many[0].points.map((p) => p.id).sort()).toEqual(['cp1', 'cp2', 'cp4', 'cp5'])
  expect(city).toHaveLength(6)
  const near = markers(CARE_POINTS, viewAt(STUB_MANIFEST, phone, 'district', at('cp1')), phone)
  expect(near.every((m) => m.kind === 'one')).toBe(true)
})
it('never lets two markers sit closer than the gap, at any size', () => {
  for (const [w, h] of SIZES) {
    const list = markers(CARE_POINTS, cityView(size(w, h)), size(w, h))
    for (const a of list) for (const b of list) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y), `${w}`).toBeGreaterThanOrEqual(MARKER_GAP)
  }
})
it('shows all six zone names on a phone, and at every size keeps each name clear of the markers and of the other names', () => {
  const touch = (a: number[], b: number[]) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]
  expect(nameBoxes(ZONES, cityView(phone), phone, markers(CARE_POINTS, cityView(phone), phone))).toHaveLength(6)
  for (const [w, h] of SIZES) {
    const s = size(w, h)
    const pins = markers(CARE_POINTS, cityView(s), s)
    const boxes = nameBoxes(ZONES, cityView(s), s, pins).map((b) => [b.x - b.w / 2, b.y - b.h / 2, b.x + b.w / 2, b.y + b.h / 2])
    for (const b of boxes) {
      for (const pin of pins) expect(touch(b, markerBox(pin)), `${w}x${h}`).toBe(false)
      for (const other of boxes) if (other !== b) expect(touch(b, other), `${w}x${h}`).toBe(false)
      expect(b[0] >= 2 && b[2] <= w - 2, `${w}x${h}`).toBe(true)
    }
  }
})
it('steps one level at a time and stops at both ends', () => {
  expect([step('city', 1), step('district', 1), step('street', 1), step('city', -1), step('street', -1)]).toEqual(['district', 'street', 'street', 'city', 'district'])
})
it('knows the deepest level that has map data at a point', () => {
  expect(deepestAt(STUB_MANIFEST, at('cp1'))).toBe('street')
  expect(deepestAt(STUB_MANIFEST, toXY(13.7, 100.56))).toBe('district')
  expect(deepestAt(STUB_MANIFEST, at('cp9'))).toBe('city')
})
it('centres a deeper view as near the asked point as the data allows', () => {
  const v = viewAt(STUB_MANIFEST, phone, 'district', at('cp9'))
  expect(v.ppm).toBe(PPM.district)
  expect(v.cx).toBeGreaterThanOrEqual(-4541)
  expect(deepestAt(STUB_MANIFEST, [v.cx, v.cy])).not.toBe('city')
})
it('lets the map be dragged a little at city level, never away, and never off the data at deeper levels', () => {
  const fit = cityView(phone)
  const far = clampView(STUB_MANIFEST, phone, { ...fit, cx: fit.cx + 1e7, cy: fit.cy - 1e7 })
  expect((far.cx - fit.cx) * fit.ppm).toBeLessThanOrEqual(390 * 0.35 + 0.01)
  expect((fit.cy - far.cy) * fit.ppm).toBeLessThanOrEqual(714 * 0.35 + 0.01)
  // Below city level the whole screen stays on the data: dragged to the far corner, the screen's corner meets the data's corner.
  const street = clampView(STUB_MANIFEST, phone, { level: 'street', ppm: PPM.street, cx: 9e6, cy: 9e6 })
  expect(toScreen(street, phone, [-335, -276])[0]).toBeCloseTo(390, 3)
  expect(toScreen(street, phone, [-335, -276])[1]).toBeCloseTo(714, 3)
})
it('keeps the whole screen on the data when it goes one level in', () => {
  const v = viewAt(STUB_MANIFEST, phone, 'district', at('cp9'))
  expect(toScreen(v, phone, [-4541, -4423])[0]).toBeLessThanOrEqual(0.001)
  expect(toScreen(v, phone, [2379, 6192])[0]).toBeGreaterThanOrEqual(390 - 0.001)
  expect(toScreen(v, phone, [-4541, -4423])[1]).toBeLessThanOrEqual(0.001)
  expect(toScreen(v, phone, [2379, 6192])[1]).toBeGreaterThanOrEqual(714 - 0.001)
})
