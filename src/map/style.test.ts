import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { breath, DOT_GAP, DOT_R, EDGE, PALETTE, ROADS, SAMPLE_PX } from './style'

it('shows a higher level as a bigger dot, and never lets dots touch', () => {
  expect(DOT_R.thin).toBeLessThan(DOT_R.medium)
  expect(DOT_R.medium).toBeLessThan(DOT_R.dense)
  expect(DOT_R.dense * 2).toBeLessThan(DOT_GAP)
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
  expect(PALETTE).toEqual({ ink: token('ink'), surface: token('surface'), care: token('care'), yellow: token('yellow'), signal: token('signal'), signalEdge: token('signal-edge'), signalSoft: token('signal-soft'), land: token('land'), landOut: token('land-out'), water: token('water'), park: token('park') })
})
