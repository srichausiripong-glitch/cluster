import { expect, it } from 'vitest'
import { CARE_POINTS } from '../store/seed'
import { CITY_BOX, clampPan, fitMap, LABEL_PX, MAP_INSET, markScale, PIN_PX } from './pan'
import { EDGE_STYLE, SAMPLE_PX } from './SchematicMap'
import { ZONES } from './zones'

/** Map area of the phone app at common phone sizes, and inside the stage's phone frame. */
const SIZES: [number, number][] = [[320, 480], [360, 606], [375, 678], [390, 714], [448, 760], [370, 436]]
/** Thai vowels and tone marks above or below a consonant take no width. */
const advances = (name: string) => [...name].filter((ch) => !/[ัิ-ฺ็-๎]/.test(ch)).length

it('fits the whole city inside the free window between the chips and the bottom card', () => {
  for (const [w, h] of SIZES) {
    const fit = fitMap(w, h, MAP_INSET)
    expect(fit.x + CITY_BOX.x * fit.scale).toBeGreaterThanOrEqual(MAP_INSET.left - 0.01)
    expect(fit.x + (CITY_BOX.x + CITY_BOX.w) * fit.scale).toBeLessThanOrEqual(w - MAP_INSET.right + 0.01)
    expect(fit.y + CITY_BOX.y * fit.scale).toBeGreaterThanOrEqual(MAP_INSET.top - 0.01)
    expect(fit.y + (CITY_BOX.y + CITY_BOX.h) * fit.scale).toBeLessThanOrEqual(h - MAP_INSET.bottom + 0.01)
  }
})
it('keeps every zone name fully on screen', () => {
  for (const [w, h] of SIZES) {
    const fit = fitMap(w, h, MAP_INSET)
    for (const zone of ZONES) {
      const half = (advances(zone.name) * LABEL_PX * markScale(fit.scale) * 0.62) / 2
      const centre = fit.x + zone.labelX * fit.scale
      expect(centre - half, `${zone.name} at ${w}`).toBeGreaterThanOrEqual(2)
      expect(centre + half, `${zone.name} at ${w}`).toBeLessThanOrEqual(w - 2)
    }
  }
})
it('keeps care point pins from touching each other', () => {
  for (const [w, h] of SIZES) {
    const { scale } = fitMap(w, h, MAP_INSET)
    for (const a of CARE_POINTS) {
      for (const b of CARE_POINTS) {
        if (a.id < b.id) expect(Math.hypot(a.x - b.x, a.y - b.y) * scale, `${a.id}-${b.id} at ${w}`).toBeGreaterThan(2 * (PIN_PX * markScale(scale) + 2))
      }
    }
  }
})
it('lets the map be dragged a little, never away', () => {
  const fit = fitMap(390, 714, MAP_INSET)
  const far = clampPan(fit, 390, 714, 9999, -9999)
  expect(far.x - fit.x).toBeLessThanOrEqual(390 * 0.35 + 0.01)
  expect(fit.y - far.y).toBeLessThanOrEqual(714 * 0.35 + 0.01)
  expect(clampPan(fit, 390, 714, fit.x + 5, fit.y - 5)).toEqual({ x: fit.x + 5, y: fit.y - 5 })
})
it('draws each signal age as a line sample with at least three full repeats', () => {
  for (const [step, style] of Object.entries(EDGE_STYLE)) {
    if (!style.dash) continue
    const period = style.dash.split(' ').reduce((sum, part) => sum + Number(part), 0)
    expect(SAMPLE_PX / period, step).toBeGreaterThanOrEqual(3)
  }
})
it('shrinks pins and names a little on a very small map, and never on a phone-sized one', () => {
  expect(markScale(fitMap(390, 714, MAP_INSET).scale)).toBe(1)
  expect(markScale(fitMap(360, 606, MAP_INSET).scale)).toBe(1)
  const small = markScale(fitMap(370, 450, MAP_INSET).scale) // the stage's phone frame in an 800 px tall window
  expect(small).toBeLessThan(1)
  expect(small).toBeGreaterThanOrEqual(0.72)
})
it('keeps every zone name clear of the care point pins', () => {
  for (const [w, h] of [...SIZES, [370, 450] as [number, number]]) {
    const { scale } = fitMap(w, h, MAP_INSET)
    const mark = markScale(scale)
    for (const zone of ZONES) {
      const halfW = (advances(zone.name) * Math.max(10, LABEL_PX * mark) * 0.62) / 2 / scale
      const height = (Math.max(10, LABEL_PX * mark) * 0.9) / scale
      for (const point of CARE_POINTS) {
        const r = (PIN_PX * mark + 2) / scale
        const dx = Math.max(0, Math.abs(point.x - zone.labelX) - halfW)
        const dy = Math.max(0, point.y < zone.labelY - height ? zone.labelY - height - point.y : point.y - zone.labelY)
        expect(Math.hypot(dx, dy), `${zone.name} / ${point.id} at ${w}x${h}`).toBeGreaterThanOrEqual(r - 2 / scale)
      }
    }
  }
})
