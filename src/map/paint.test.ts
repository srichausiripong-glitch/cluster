import { expect, it } from 'vitest'
import type { PublishedArea } from '../domain/types'
import { fakeCtx } from '../test/fakeCtx'
import { paintDots, paintGround, paintLines, type Scene } from './paint'
import { DOT_R, EDGE, PALETTE } from './style'
import { cityView, MAP_INSET } from './view'

const size = { w: 390, h: 714, inset: MAP_INSET }
const area = (areaId: string, state: PublishedArea['state'], density: PublishedArea['density'] = null, step: PublishedArea['step'] = null): PublishedArea => ({ areaId, state, density, step })
const scene = (areas: PublishedArea[], over: Partial<Scene> = {}): Scene => ({ view: cityView(size), size, dpr: 1, palette: PALETTE, city: null, tiles: [], areas: new Map(areas.map((a) => [a.areaId, a])), phase: 2, showSignal: true, ...over })
const radii = (f: ReturnType<typeof fakeCtx>) => new Set(f.calls.filter((c) => c.name === 'arc').map((c) => c.args[2] as number))

it('draws a dense zone with the largest dots and a thin one with the smallest', () => {
  const f = fakeCtx()
  paintDots(f.ctx, scene([area('south', 'shown', 'dense', 'followup'), area('north', 'shown', 'thin', 'expiring')]), null)
  expect([...radii(f)].sort()).toEqual([DOT_R.thin, DOT_R.dense])
})
it('draws no dot when the signal layer is off, or for a zone without a signal', () => {
  const off = fakeCtx()
  paintDots(off.ctx, scene([area('south', 'shown', 'dense', 'new')], { showSignal: false }), null)
  expect(radii(off).size).toBe(0)
  const quiet = fakeCtx()
  paintDots(quiet.ctx, scene([area('east', 'below_threshold'), area('thon_north', 'no_data'), area('thon_south', 'no_partner')]), null)
  expect(radii(quiet).size).toBe(0)
})
it('moves only the dots of a zone that was just reported', () => {
  const f = fakeCtx()
  paintDots(f.ctx, scene([area('south', 'shown', 'dense', 'new'), area('central', 'shown', 'medium', 'followup')]), 817)
  const drawn = [...radii(f)]
  expect(drawn).toContain(DOT_R.medium)
  expect(drawn.some((r) => r !== DOT_R.medium && Math.abs(r - DOT_R.dense) <= DOT_R.dense * 0.13 && r !== DOT_R.dense)).toBe(true)
})
it('uses the whole city as the one area in phase 1', () => {
  const f = fakeCtx()
  paintDots(f.ctx, scene([area('bkk', 'shown', 'medium', 'new')], { phase: 1 }), null)
  expect([...radii(f)]).toEqual([DOT_R.medium])
})
it('never washes a zone with violet: the ground stays warm', () => {
  const f = fakeCtx()
  paintGround(f.ctx, scene([area('south', 'shown', 'dense', 'new')]))
  const fills = f.sets.filter((s) => s.prop === 'fillStyle').map((s) => s.value)
  expect(fills).not.toContain(PALETTE.signal)
  expect(fills).not.toContain(PALETTE.signalEdge)
  expect(fills).toContain(PALETTE.land)
})
it('marks a zone below the threshold with soft violet lines and a zone without a partner with a faint black grid', () => {
  const f = fakeCtx()
  paintGround(f.ctx, scene([area('east', 'below_threshold'), area('thon_south', 'no_partner')]))
  const strokes = f.sets.filter((s) => s.prop === 'strokeStyle').map((s) => s.value)
  expect(strokes).toContain(PALETTE.signalSoft)
  expect(strokes).toContain(PALETTE.ink)
})
it('draws the edge of each signal in the dash of its age', () => {
  const f = fakeCtx()
  const s = scene([area('central', 'shown', 'medium', 'followup')])
  paintLines(f.ctx, s)
  const dashes = f.calls.filter((c) => c.name === 'setLineDash').map((c) => (c.args[0] as number[]).map((d) => Math.round(d * s.view.ppm * 10) / 10))
  expect(dashes).toContainEqual(EDGE.followup.dash)
})
