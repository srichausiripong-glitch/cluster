import { expect, it } from 'vitest'
import { displayFile, expectedRandom, type CountRow } from './display'
import type { ReportKind } from './types'

const Q = 0.002
const NOW = '2026-W46'
const row = (zone: string, kind: ReportKind, week: string, n: number): CountRow => ({ zone, kind, week, n })
const file = (counts: CountRow[], envelopes: Record<string, number> = {}, suspended: string[] = []) => displayFile({ counts, envelopes, nowWeek: NOW, q: Q, suspended })
const zone = (areas: ReturnType<typeof file>, id: string) => areas.find((a) => a.areaId === id)!

it('expects one random report per cell from nine thousand envelopes', () => {
  expect(expectedRandom(9000, Q)).toBeCloseTo(1, 10)
})
it('lists the six zones and then the city', () => {
  expect(file([]).map((a) => a.areaId)).toEqual(['north', 'central', 'east', 'south', 'thon_north', 'thon_south', 'bkk'])
})
it('shows a zone with twelve fresh syphilis reports and no envelopes to discount', () => {
  // A positive report counts as testing too (amendment 4.4).
  expect(zone(file([row('south', 'syphilis', NOW, 12)]), 'south')).toEqual({ areaId: 'south', state: 'shown', density: 'thin', step: 'new', testing: 'low' })
})
it('takes the random reports off and asks for the margin on top of ten', () => {
  // 9000 envelopes: one random report expected in each (kind, zone) cell; both signal kinds count, so the margin is ceil(2 × √2) = 3.
  expect(zone(file([row('south', 'syphilis', NOW, 10)], { [NOW]: 9000 }), 'south').state).toBe('below_threshold')
  expect(zone(file([row('south', 'syphilis', NOW, 13)], { [NOW]: 9000 }), 'south').state).toBe('below_threshold')
  expect(zone(file([row('south', 'syphilis', NOW, 14)], { [NOW]: 9000 }), 'south').state).toBe('shown')
})
it('never lets the estimate fall below nothing', () => {
  expect(zone(file([], { [NOW]: 9000 }), 'south').state).toBe('no_data')
  expect(zone(file([row('south', 'syphilis', NOW, 1)], { [NOW]: 9000 }), 'south').state).toBe('no_data')
})
it('drops reports that have expired', () => {
  expect(zone(file([row('north', 'gono_chlam', '2026-W41', 12)]), 'north').state).toBe('no_data')
  expect(zone(file([row('north', 'gono_chlam', '2026-W43', 12)]), 'north')).toMatchObject({ state: 'shown', step: 'expiring' })
})
it('shows the age as mixed when no single step reaches the threshold', () => {
  expect(zone(file([row('central', 'gono_chlam', NOW, 6), row('central', 'gono_chlam', '2026-W45', 6)]), 'central')).toMatchObject({ state: 'shown', step: 'mixed' })
})
it('never shows a signal from tested reports, but shows how much testing there is', () => {
  const tested = (n: number, positives = 0) => zone(file([row('east', 'tested', NOW, n), row('east', 'syphilis', '2026-W40', positives)]), 'east')
  expect(tested(300).state).toBe('no_data')
  expect(tested(9).testing).toBeNull()
  expect(tested(30, 20).testing).toBe('medium')
  expect(tested(30).testing).toBe('low')
  expect(tested(60).testing).toBe('medium')
  expect(tested(250).testing).toBe('high')
})
it('counts testing over the last twelve weeks only', () => {
  expect(zone(file([row('east', 'tested', '2026-W34', 40)]), 'east').testing).toBeNull()
  expect(zone(file([row('east', 'tested', '2026-W35', 40)]), 'east').testing).toBe('low')
})
it('says a suspended zone is suspended and shows nothing else for it', () => {
  expect(zone(file([row('south', 'syphilis', NOW, 40), row('south', 'tested', NOW, 90)], {}, ['south']), 'south')).toEqual({ areaId: 'south', state: 'suspended', density: null, step: null, testing: null })
})
it('builds the city from all six zones with the same rule', () => {
  const counts = ['north', 'central', 'east', 'south', 'thon_north'].map((z) => row(z, 'syphilis', NOW, 2))
  const areas = file(counts)
  expect(zone(areas, 'south').state).toBe('below_threshold')
  expect(zone(areas, 'bkk')).toMatchObject({ state: 'shown', density: 'thin', step: 'new' })
  // Random reports are expected in every zone, so the city's margin grows with them: 6 zones × 2 kinds × 1 = 12, margin ceil(2 × √12) = 7.
  expect(zone(file(['north', 'central', 'east', 'south', 'thon_north'].map((z) => row(z, 'syphilis', NOW, 4)), { [NOW]: 9000 }), 'bkk').state).toBe('below_threshold')
})
