import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { breath, EDGE, HATCH, PALETTE, ROADS, SAMPLE_PX, SHADE_GROUND, TONE_SHADE, STREET_SHADE, SYMPTOM_GAP, SYMPTOM_LINE } from './style'

it('shows a higher level as a deeper shade, never an opaque one, and lighter at street level', () => {
  expect(TONE_SHADE.thin).toBeLessThan(TONE_SHADE.medium)
  expect(TONE_SHADE.medium).toBeLessThan(TONE_SHADE.dense)
  expect(TONE_SHADE.dense).toBeLessThan(0.7)
  expect(STREET_SHADE).toBeLessThan(1)
})
it('draws each signal age as a line that shows at least three repeats in the legend', () => {
  for (const [name, edge] of Object.entries(EDGE)) if (edge.dash) expect(SAMPLE_PX / edge.dash.reduce((a, b) => a + b, 0), name).toBeGreaterThanOrEqual(3)
  expect(EDGE.new.dash).toBeUndefined()
})
it('breathes gently, at one pace for every level, and not at all when asked to keep still', () => {
  expect(breath(123456, true)).toBe(1)
  for (let t = 0; t < 4000; t += 50) expect(Math.abs(breath(t, false) - 1)).toBeLessThanOrEqual(0.13 + 1e-9)
  expect(breath(0, false)).toBeCloseTo(breath(2 * Math.PI * 520, false), 6)
  expect(breath.length).toBe(2)
})
it('draws every road as a casing wider than its fill, wider for a higher class', () => {
  for (const spec of Object.values(ROADS)) {
    spec.forEach(([, casing, fill]) => expect(casing).toBeGreaterThan(fill))
    for (let i = 1; i < spec.length; i++) if (spec[i][0] !== 'hw') expect(spec[i][2]).toBeGreaterThan(spec[i - 1][2])
  }
})
it('paints with the same colours as the tokens', () => {
  // The path is from the project root: under Vitest's jsdom environment import.meta.url is not a file URL.
  const tokens = readFileSync('src/design/tokens.css', 'utf8')
  const token = (name: string) => tokens.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`))?.[1]
  expect(PALETTE).toEqual({ ink: token('ink'), surface: token('surface'), care: token('care'), yellow: token('yellow'), signal: token('signal'), signalEdge: token('signal-edge'), signalSoft: token('signal-soft'), red: token('red'), redEdge: token('red-edge'), orange: token('orange'), green: token('green'), land: token('land'), landOut: token('land-out'), water: token('water'), park: token('park') })
})
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const lum = (c: number[]) => {
  const [r, g, b] = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v * (1 - t) + b[i] * t)
/** The shade as the map shows it: the warm ground lightened with white, then the violet at a strength. */
const shadeOf = (alpha: number) => mix(mix(rgb(PALETTE.land), rgb(PALETTE.surface), SHADE_GROUND), rgb(PALETTE.signal), alpha)
it('marks an area below the threshold more lightly than the lightest signal', () => {
  const land = lum(rgb(PALETTE.land))
  // Slanted lines one `gap` apart along the ground are gap / √2 apart across: the share of the ground they darken.
  const hatch = ((HATCH.width * Math.SQRT2) / HATCH.gap) * HATCH.alpha * (land - lum(rgb(PALETTE.signalSoft)))
  expect(hatch).toBeLessThan(land - lum(shadeOf(TONE_SHADE.thin)))
})
it('keeps the three shades apart from the ground and from each other, with the ink readable on the deepest', () => {
  const land = rgb(PALETTE.land)
  const [thin, medium, dense] = (['thin', 'medium', 'dense'] as const).map((d) => shadeOf(TONE_SHADE[d]))
  expect(contrast(thin, land)).toBeGreaterThanOrEqual(1.3)
  expect(contrast(medium, thin)).toBeGreaterThanOrEqual(1.3)
  expect(contrast(dense, medium)).toBeGreaterThanOrEqual(1.3)
  // Even the lightest shade reads violet, not peach: more blue than red than green, as the violet is.
  expect(thin[2]).toBeGreaterThan(thin[0])
  expect(thin[0]).toBeGreaterThan(thin[1])
  // The symptoms hatch and the names are ink: at least 4.5:1 on the deepest shade.
  expect(contrast(rgb(PALETTE.ink), dense)).toBeGreaterThanOrEqual(4.5)
})
it('hatches symptoms tighter for a higher level, never so tight that the lines become a fill', () => {
  expect(SYMPTOM_GAP.thin).toBeGreaterThan(SYMPTOM_GAP.medium)
  expect(SYMPTOM_GAP.medium).toBeGreaterThan(SYMPTOM_GAP.dense)
  expect(SYMPTOM_GAP.dense).toBeGreaterThanOrEqual(4 * SYMPTOM_LINE.width)
})
