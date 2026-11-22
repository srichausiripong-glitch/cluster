import { expect, it } from 'vitest'
import type { PublishedArea } from '../domain/types'
import { fakeCtx } from '../test/fakeCtx'
import { paintGround, paintLines, paintSignal, type Scene } from './paint'
import { AREAS } from './areas'
import { PPM } from './geo'
import { EDGE, PALETTE, SHADE_GROUND, SIGNAL_SHADE, STREET_SHADE } from './style'
import type { TileData } from './types'
import { cityView, MAP_INSET, type View } from './view'

const size = { w: 390, h: 714, inset: MAP_INSET }
const area = (areaId: string, state: PublishedArea['state'], density: PublishedArea['density'] = null, step: PublishedArea['step'] = null): PublishedArea => ({ areaId, state, density, step, testing: null, symptoms: null })
const scene = (areas: PublishedArea[], over: Partial<Scene> = {}): Scene => ({ view: cityView(size), size, dpr: 1, palette: PALETTE, city: null, tiles: [], areas: new Map(areas.map((a) => [a.areaId, a])), phase: 2, showSignal: true, ...over })
/** The strength of every violet fill the signal layer asked for, in order. */
const shades = (f: ReturnType<typeof fakeCtx>) => f.calls.filter((c) => c.name === 'fill' && c.at?.fillStyle === PALETTE.signal).map((c) => c.at!.globalAlpha as number)
const round = (n: number) => Math.round(n * 1000) / 1000

// A confirmed level shades its district whole (2026-11-18 design, decision 4): the data has district totals only.
it('fills a district whole at the strength of its level, and nothing for a district without one', () => {
  const f = fakeCtx()
  paintSignal(f.ctx, scene([area('bang_rak', 'shown', 'dense', 'followup'), area('chatuchak', 'shown', 'thin', 'expiring'), area('pathum_wan', 'shown', 'medium', 'mixed'), area('bang_kapi', 'below_threshold'), area('bangkok_yai', 'no_data'), area('bang_khae', 'suspended')]), null)
  expect(shades(f).sort()).toEqual([SIGNAL_SHADE.thin, SIGNAL_SHADE.medium, SIGNAL_SHADE.dense])
  expect(f.calls.filter((c) => c.name === 'arc')).toHaveLength(0)
  // Under each shade the warm ground is lightened first, so violet over yellow does not turn peach.
  const fills = f.calls.filter((c) => c.name === 'fill').map((c) => c.at!)
  expect(fills.filter((a) => a.fillStyle === PALETTE.surface).map((a) => a.globalAlpha)).toEqual([SHADE_GROUND, SHADE_GROUND, SHADE_GROUND])
  fills.forEach((a, i) => a.fillStyle === PALETTE.signal && expect(fills[i - 1].fillStyle).toBe(PALETTE.surface))
})
it('draws no shade when the signal layer is off', () => {
  const off = fakeCtx()
  paintSignal(off.ctx, scene([area('bang_rak', 'shown', 'dense', 'new')], { showSignal: false }), null)
  expect(shades(off)).toEqual([])
})
it('lightens the shade at street level so the roads stay readable', () => {
  const bangRak = AREAS.find((a) => a.id === 'bang_rak')!.label
  const f = fakeCtx()
  paintSignal(f.ctx, scene([area('bang_rak', 'shown', 'dense', 'followup')], { view: { level: 'street', ppm: PPM.street, cx: bangRak[0], cy: bangRak[1] } }), null)
  expect(shades(f).map(round)).toEqual([round(SIGNAL_SHADE.dense * STREET_SHADE)])
})
it('breathes only the shade of a zone that was just reported', () => {
  const f = fakeCtx()
  paintSignal(f.ctx, scene([area('bang_rak', 'shown', 'dense', 'new'), area('ratchathewi', 'shown', 'medium', 'followup')]), 817)
  const drawn = shades(f)
  expect(drawn).toContain(SIGNAL_SHADE.medium)
  expect(drawn.some((a) => a !== SIGNAL_SHADE.dense && Math.abs(a - SIGNAL_SHADE.dense) <= SIGNAL_SHADE.dense * 0.13)).toBe(true)
})
it('uses the whole city as the one area in phase 1', () => {
  const f = fakeCtx()
  paintSignal(f.ctx, scene([area('bkk', 'shown', 'medium', 'new')], { phase: 1 }), null)
  expect(shades(f)).toEqual([SIGNAL_SHADE.medium])
})
it('keeps the shade off the ground, which stays warm under it', () => {
  const f = fakeCtx()
  paintGround(f.ctx, scene([area('bang_rak', 'shown', 'dense', 'new')]))
  const fills = f.sets.filter((s) => s.prop === 'fillStyle').map((s) => s.value)
  expect(fills).not.toContain(PALETTE.signal)
  expect(fills).toContain(PALETTE.land)
})
it('marks the city below the threshold with soft violet lines, and a suspended district with a plain black edge and no pattern', () => {
  const ground = fakeCtx()
  paintGround(ground.ctx, scene([area('bkk', 'below_threshold')], { phase: 1 }))
  expect(ground.sets.filter((s) => s.prop === 'strokeStyle').map((s) => s.value)).toEqual([PALETTE.signalSoft])
  const lines = fakeCtx()
  paintLines(lines.ctx, scene([area('bang_khae', 'suspended')]))
  expect(lines.sets.filter((s) => s.prop === 'strokeStyle').map((s) => s.value)).toContain(PALETTE.ink)
})
it('draws the edge of each signal in the dash of its age', () => {
  const f = fakeCtx()
  const s = scene([area('ratchathewi', 'shown', 'medium', 'followup')])
  paintLines(f.ctx, s)
  const dashes = f.calls.filter((c) => c.name === 'setLineDash').map((c) => (c.args[0] as number[]).map((d) => Math.round(d * s.view.ppm * 10) / 10))
  expect(dashes).toContainEqual(EDGE.followup.dash)
})

// ---- only what is on the screen ----------------------------------------------------------------
const tile = (over: Partial<TileData>): TileData => ({ water: [], canal: [], green: [], roads: {}, bridges: {}, rail: [], labels: [], ...over })
const street: View = { level: 'street', ppm: PPM.street, cx: 0, cy: 0 }
const district: View = { level: 'district', ppm: PPM.district, cx: 0, cy: 0 }
/** Every point a paint asked the canvas to trace, in metres. */
const traced = (f: ReturnType<typeof fakeCtx>) => f.calls.filter((c) => c.name === 'moveTo' || c.name === 'lineTo').map((c) => `${c.args[0]},${c.args[1]}`)

it('draws only the roads, canals and buildings that are on the screen', () => {
  const f = fakeCtx()
  const buildings = [{ h: 12, r: [[10.5, 10.5, 30.5, 10.5, 30.5, 30.5], [7000.5, 10.5, 7030.5, 10.5, 7030.5, 30.5]], e: [[10.5, 10.5, 30.5, 10.5], [7000.5, 10.5, 7030.5, 10.5]] }]
  paintLines(f.ctx, scene([], { view: street, tiles: [tile({ roads: { res: [[-50.5, 0.5, 50.5, 0.5], [5000.5, 5000.5, 5100.5, 5000.5]] }, canal: [[0.5, -40.5, 0.5, 40.5], [9000.5, 0.5, 9000.5, 40.5]], buildings })] }))
  const points = traced(f)
  for (const near of ['-50.5,0.5', '0.5,-40.5', '10.5,10.5']) expect(points, near).toContain(near)
  for (const far of ['5000.5,5000.5', '9000.5,0.5', '7000.5,10.5']) expect(points, far).not.toContain(far)
})
it('leaves the built-up blocks that are out of view undrawn', () => {
  const f = fakeCtx()
  paintGround(f.ctx, scene([], { view: district, tiles: [tile({ blocks: [[[0.5, 0.5, 100.5, 0.5, 100.5, 100.5], [40000.5, 0.5, 40100.5, 0.5, 40100.5, 100.5]]] })] }))
  expect(traced(f)).toContain('0.5,0.5')
  expect(traced(f)).not.toContain('40000.5,0.5')
})
it('keeps a shape that reaches across the whole screen, though none of its corners is in view', () => {
  const f = fakeCtx()
  paintGround(f.ctx, scene([], { view: street, tiles: [tile({ green: [[[-9000.5, -9000.5, 9000.5, -9000.5, 9000.5, 9000.5, -9000.5, 9000.5]]] })] }))
  expect(traced(f)).toContain('-9000.5,-9000.5')
})
it('keeps a line whose ends are both off the screen when it crosses the screen', () => {
  const f = fakeCtx()
  paintLines(f.ctx, scene([], { view: street, tiles: [tile({ roads: { pri: [[-8000.5, -3.5, 8000.5, 3.5]] } })] }))
  expect(traced(f)).toContain('-8000.5,-3.5')
})
it('does not measure a name that is far off the screen', () => {
  const f = fakeCtx()
  paintLines(f.ctx, scene([], { view: street, tiles: [tile({ labels: [{ t: 'ถนนใกล้', x: 0, y: 0, k: 'road' }, { t: 'ถนนไกล', x: 6000, y: 0, k: 'road' }] })] }))
  const measured = f.calls.filter((c) => c.name === 'measureText').map((c) => c.args[0])
  expect(measured).toContain('ถนนใกล้')
  expect(measured).not.toContain('ถนนไกล')
})

it('paints each of the 50 districts as its own area', () => {
  const f = fakeCtx()
  paintSignal(f.ctx, scene([area('bang_rak', 'shown', 'dense', 'new')]), null)
  expect(shades(f)).toHaveLength(1)
})
it('leaves a district below the threshold unmarked, and hatches only the city', () => {
  const district = fakeCtx()
  paintGround(district.ctx, scene([area('bang_rak', 'below_threshold'), area('bang_kapi', 'shown', 'thin', 'new')]))
  expect(district.sets.filter((s) => s.prop === 'strokeStyle').map((s) => s.value)).not.toContain(PALETTE.signalSoft)
  const city = fakeCtx()
  paintGround(city.ctx, scene([area('bkk', 'below_threshold')], { phase: 1 }))
  expect(city.sets.filter((s) => s.prop === 'strokeStyle').map((s) => s.value)).toContain(PALETTE.signalSoft)
})

it('draws no signal edge around a district below the threshold', () => {
  const f = fakeCtx()
  paintLines(f.ctx, scene([area('bang_rak', 'below_threshold')]))
  expect(f.sets.filter((s) => s.prop === 'strokeStyle').map((s) => s.value)).not.toContain(PALETTE.signalEdge)
})

it('leaves district names to the name boxes at district level, and still writes them at street level', () => {
  const t = tile({ labels: [{ t: 'บางรัก', x: 0, y: 0, k: 'district' }] })
  const measured = (view: View) => {
    const f = fakeCtx()
    paintLines(f.ctx, scene([], { view, tiles: [t] }))
    return f.calls.filter((c) => c.name === 'measureText').map((c) => c.args[0])
  }
  expect(measured(district)).not.toContain('บางรัก')
  expect(measured(street)).toContain('บางรัก')
})

// ---- round 2: the symptoms hatch --------------------------------------------------------------
const sick = (level: PublishedArea['symptoms'], base = area('bang_rak', 'below_threshold')): PublishedArea => ({ ...base, symptoms: level })
const bangRak = AREAS.find((a) => a.id === 'bang_rak')!.label
const onBangRak: View = { level: 'district', ppm: PPM.district, cx: bangRak[0], cy: bangRak[1] }
const inkLines = (s: Scene) => {
  const f = fakeCtx()
  paintSignal(f.ctx, s, null)
  return { inks: f.sets.filter((x) => x.prop === 'strokeStyle' && x.value === PALETTE.ink).length, moves: f.calls.filter((c) => c.name === 'moveTo').length }
}
it('hatches a district with symptoms in black lines, closer together for a higher level', () => {
  const [thin, medium, dense] = (['thin', 'medium', 'dense'] as const).map((l) => inkLines(scene([sick(l)], { view: onBangRak, showSymptoms: true })))
  expect(thin.inks).toBe(1)
  expect(medium.moves).toBeGreaterThan(thin.moves)
  expect(dense.moves).toBeGreaterThan(medium.moves)
})
it('draws no symptoms hatch when the symptoms layer is off, or for a district without a symptoms level', () => {
  expect(inkLines(scene([sick('dense')], { showSymptoms: false })).inks).toBe(0)
  expect(inkLines(scene([sick(null)], { showSymptoms: true })).inks).toBe(0)
})
it('draws the symptoms hatch over the shade', () => {
  const f = fakeCtx()
  paintSignal(f.ctx, scene([sick('thin', area('bang_rak', 'shown', 'medium', 'new'))], { view: onBangRak, showSymptoms: true }), null)
  const fill = f.calls.findIndex((c) => c.name === 'fill' && c.at?.fillStyle === PALETTE.signal)
  const hatch = f.calls.findIndex((c) => c.name === 'stroke' && c.at?.strokeStyle === PALETTE.ink)
  expect(fill).toBeGreaterThanOrEqual(0)
  expect(hatch).toBeGreaterThan(fill)
})
