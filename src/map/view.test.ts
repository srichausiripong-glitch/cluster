import { expect, it } from 'vitest'
import { withDistrict } from '../data/carePoints'
import { FIXTURE_POINTS, FIXTURE_UNVERIFIED } from '../test/carePoints'

const CARE_POINTS = FIXTURE_POINTS.map(withDistrict)
import { STUB_MANIFEST } from '../test/mapStub'
import { areaAt, AREAS, CITY_BOX } from './areas'
import { CITY_FRAME, PPM, toXY } from './geo'
import { cityView, clampView, deepestAt, insetFor, MAP_INSET, MARKER_GAP, markerBox, markers, nameBoxes, step, toScreen, viewAt, type Size } from './view'

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
it('puts every test care point inside the district it stands in', () => {
  const expected: Record<string, string> = { cp1: 'ratchathewi', cp2: 'pathum_wan', cp3: 'bang_khen', cp4: 'bang_rak', cp5: 'ratchathewi', cp6: 'bangkok_yai', cp7: 'bang_kapi', cp8: 'chatuchak', cp9: 'bang_khae' }
  for (const p of CARE_POINTS) expect(areaAt(toXY(p.lat, p.lon))?.id, p.id).toBe(expected[p.id])
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
it('at every size keeps each district name clear of the markers and of the other names', () => {
  const touch = (a: number[], b: number[]) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]
  expect(nameBoxes(AREAS, cityView(phone), phone, markers(CARE_POINTS, cityView(phone), phone)).length).toBeGreaterThan(0)
  for (const [w, h] of SIZES) {
    const s = size(w, h)
    const pins = markers(CARE_POINTS, cityView(s), s)
    const boxes = nameBoxes(AREAS, cityView(s), s, pins).map((b) => [b.x - b.w / 2, b.y - b.h / 2, b.x + b.w / 2, b.y + b.h / 2])
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
it('has a district level at every place in the city, and a street level only where street map exists', () => {
  expect(deepestAt(STUB_MANIFEST, at('cp1'))).toBe('street')
  expect(deepestAt(STUB_MANIFEST, at('cp9'))).toBe('district')
  expect(deepestAt(STUB_MANIFEST, toXY(14.3, 100.55))).toBe('city')
})
it('boxes every point of every district in CITY_BOX', () => {
  for (const area of AREAS)
    for (const ring of area.rings)
      for (let i = 0; i < ring.length; i += 2) {
        expect(ring[i], area.id).toBeGreaterThanOrEqual(CITY_BOX[0])
        expect(ring[i], area.id).toBeLessThanOrEqual(CITY_BOX[2])
        expect(ring[i + 1], area.id).toBeGreaterThanOrEqual(CITY_BOX[1])
        expect(ring[i + 1], area.id).toBeLessThanOrEqual(CITY_BOX[3])
      }
})
it('centres a district view on the asked place anywhere in the city', () => {
  const v = viewAt(STUB_MANIFEST, phone, 'district', at('cp9'))
  expect(v.ppm).toBe(PPM.district)
  expect(v.cx).toBeCloseTo(at('cp9')[0], 0)
  expect(v.cy).toBeCloseTo(at('cp9')[1], 0)
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
it('keeps the whole screen inside the city box at district level', () => {
  const v = viewAt(STUB_MANIFEST, phone, 'district', [-1e6, -1e6])
  const [x, y] = toScreen(v, phone, [CITY_BOX[0], CITY_BOX[1]])
  expect(x).toBeCloseTo(0, 3)
  expect(y).toBeCloseTo(0, 3)
})
it('keeps every district name box on the screen at district level', () => {
  const boxes = nameBoxes(AREAS, viewAt(STUB_MANIFEST, phone, 'district', [0, 0]), phone, [])
  expect(boxes.length).toBeGreaterThan(0)
  for (const b of boxes) {
    expect(b.y - b.h / 2).toBeGreaterThanOrEqual(2)
    expect(b.y + b.h / 2).toBeLessThanOrEqual(phone.h - 2)
  }
})
it('keeps at least a quarter of a short map free for the city, and the full space on a tall one', () => {
  // A 320 × 568 phone in Safari shows about 460 px: 348 px of map between the header and the tabs.
  const short = insetFor(348)
  expect(348 - short.top - short.bottom).toBeGreaterThanOrEqual(87)
  expect(short.top).toBeGreaterThanOrEqual(100)
  expect(insetFor(732)).toEqual(MAP_INSET)
  const s = { w: 320, h: 348, inset: short }
  const [, y0] = toScreen(cityView(s), s, toXY(CITY_FRAME.north, CITY_FRAME.west))
  const [, y1] = toScreen(cityView(s), s, toXY(CITY_FRAME.south, CITY_FRAME.east))
  expect(y0).toBeGreaterThanOrEqual(short.top - 0.01)
  expect(y1).toBeLessThanOrEqual(348 - short.bottom + 0.01)
})

it('leaves points far off the screen out of the markers', () => {
  const far = { ...CARE_POINTS[0], id: 'far', lat: 14.5, lon: 101.5 }
  expect(markers([...CARE_POINTS, far], cityView(phone), phone).some((m) => m.kind === 'one' && m.point.id === 'far')).toBe(false)
  expect(markers([...CARE_POINTS, far], cityView(phone), phone).flatMap((m) => (m.kind === 'one' ? [m.point] : m.points))).toHaveLength(CARE_POINTS.length)
})

// A district name never peeks out from under the chips, the state box or the status card (plan decision 13).
it('keeps every district name box inside the window the controls leave free', () => {
  const s = { w: 390, h: 714, inset: insetFor(714) }
  const boxes = nameBoxes(AREAS, viewAt(STUB_MANIFEST, s, 'district', [0, 0]), s, [])
  expect(boxes.length).toBeGreaterThan(0)
  for (const b of boxes) {
    expect(b.y - b.h / 2, b.id).toBeGreaterThanOrEqual(s.inset.top)
    expect(b.y + b.h / 2, b.id).toBeLessThanOrEqual(s.h - s.inset.bottom)
  }
})
it('gives an unverified dot a small box round its point, and a verified pin its tall one', () => {
  const [dot, pin] = [withDistrict(FIXTURE_UNVERIFIED[0]), CARE_POINTS[0]]
  expect(markerBox({ kind: 'one', point: dot, x: 100, y: 100 })).toEqual([89, 89, 111, 111])
  expect(markerBox({ kind: 'one', point: pin, x: 100, y: 100 })).toEqual([81, 54, 119, 100])
})
