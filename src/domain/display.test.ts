import { expect, it } from 'vitest'
import { DISTRICT_IDS } from './districts'
import { displayFile, expectedRandom, type CountRow } from './display'
import type { PublishedArea, ReportKind } from './types'
import { shiftWeek } from './weeks'

const Q = 0.002
const NOW = '2026-W46'
const row = (zone: string, kind: ReportKind, week: string, n: number): CountRow => ({ zone, kind, week, n })
const file = (counts: CountRow[], envelopes: Record<string, number> = {}, suspended: string[] = []) => displayFile({ counts, envelopes, nowWeek: NOW, q: Q, suspended })
const zone = (areas: ReturnType<typeof file>, id: string) => areas.find((a) => a.areaId === id)!

it('expects one random report per cell from a hundred thousand envelopes', () => {
  expect(expectedRandom(100000, Q)).toBeCloseTo(1, 10)
})
it('shows a district with twelve fresh syphilis reports and no envelopes to discount', () => {
  // A positive report counts as testing too (amendment 4.4).
  expect(zone(file([row('bang_rak', 'syphilis', NOW, 12)]), 'bang_rak')).toEqual({ areaId: 'bang_rak', state: 'shown', density: 'thin', step: 'new', testing: 'low', symptoms: null })
})
it('takes the random reports off and asks for the margin on top of ten', () => {
  // 100000 envelopes: one random report expected in each (kind, district) cell; both signal kinds count, so the margin is ceil(2 × √2) = 3.
  expect(zone(file([row('bang_rak', 'syphilis', NOW, 10)], { [NOW]: 100000 }), 'bang_rak').state).toBe('below_threshold')
  expect(zone(file([row('bang_rak', 'syphilis', NOW, 13)], { [NOW]: 100000 }), 'bang_rak').state).toBe('below_threshold')
  expect(zone(file([row('bang_rak', 'syphilis', NOW, 14)], { [NOW]: 100000 }), 'bang_rak').state).toBe('shown')
})
it('never lets the estimate fall below nothing', () => {
  expect(zone(file([], { [NOW]: 100000 }), 'bkk').state).toBe('no_data')
  expect(zone(file([row('bang_rak', 'syphilis', NOW, 1)], { [NOW]: 100000 }), 'bkk').state).toBe('no_data')
})
it('drops reports that have expired', () => {
  expect(zone(file([row('chatuchak', 'gono_chlam', '2026-W41', 12)]), 'chatuchak').state).toBe('below_threshold')
  expect(zone(file([row('chatuchak', 'gono_chlam', '2026-W43', 12)]), 'chatuchak')).toMatchObject({ state: 'shown', step: 'expiring' })
})
it('shows the age as mixed when no single step reaches the threshold', () => {
  expect(zone(file([row('ratchathewi', 'gono_chlam', NOW, 6), row('ratchathewi', 'gono_chlam', '2026-W45', 6)]), 'ratchathewi')).toMatchObject({ state: 'shown', step: 'mixed' })
})
it('never shows a signal from tested reports, but shows how much testing there is', () => {
  const tested = (n: number, positives = 0) => zone(file([row('bang_kapi', 'tested', NOW, n), row('bang_kapi', 'syphilis', '2026-W40', positives)]), 'bang_kapi')
  expect(tested(300).state).toBe('below_threshold')
  expect(tested(9).testing).toBeNull()
  expect(tested(30, 20).testing).toBe('medium')
  expect(tested(30).testing).toBe('low')
  expect(tested(60).testing).toBe('medium')
  expect(tested(250).testing).toBe('high')
})
it('counts testing over the last twelve weeks only', () => {
  expect(zone(file([row('bang_kapi', 'tested', '2026-W34', 40)]), 'bang_kapi').testing).toBeNull()
  expect(zone(file([row('bang_kapi', 'tested', '2026-W35', 40)]), 'bang_kapi').testing).toBe('low')
})
it('says a suspended district is suspended and shows nothing else for it', () => {
  expect(zone(file([row('bang_rak', 'syphilis', NOW, 40), row('bang_rak', 'tested', NOW, 90)], {}, ['bang_rak']), 'bang_rak')).toEqual({ areaId: 'bang_rak', state: 'suspended', density: null, step: null, testing: null, symptoms: null })
})
it('builds the city from all fifty districts with the same rule', () => {
  const five = ['chatuchak', 'ratchathewi', 'bang_kapi', 'bang_rak', 'bangkok_yai']
  const areas = file(five.map((d) => row(d, 'syphilis', NOW, 2)))
  expect(zone(areas, 'bang_rak').state).toBe('below_threshold')
  expect(zone(areas, 'bkk')).toMatchObject({ state: 'shown', density: 'thin', step: 'new' })
  // Random reports are expected in every district, so the city's margin grows with them: 50 districts × 2 kinds × 1 = 100,
  // margin ceil(2 × √100) = 20; the syphilis cell expects 50 random reports, so 60 counted is an estimate of 10 and 80 is 30.
  expect(zone(file(five.map((d) => row(d, 'syphilis', NOW, 12)), { [NOW]: 100000 }), 'bkk').state).toBe('below_threshold')
  expect(zone(file(five.map((d) => row(d, 'syphilis', NOW, 16)), { [NOW]: 100000 }), 'bkk').state).toBe('shown')
})
it('publishes the 50 districts in list order and the city last', () => {
  expect(file([]).map((a) => a.areaId)).toEqual([...DISTRICT_IDS, 'bkk'])
})
it('expects q × envelopes ÷ (50 districts × 4 kinds) random reports in one cell', () => {
  expect(expectedRandom(10000, 0.002)).toBeCloseTo(0.1)
})
it('gives a district with no report and one with seven the same entry', () => {
  const areas = file([row('bang_rak', 'gono_chlam', NOW, 7)], { [NOW]: 1000 })
  const strip = (area: PublishedArea) => ({ ...area, areaId: '' })
  expect(strip(zone(areas, 'bang_rak'))).toEqual(strip(zone(areas, 'chatuchak')))
  expect(zone(areas, 'chatuchak')).toMatchObject({ state: 'below_threshold', density: null, symptoms: null, testing: null })
})
it("keeps the city's below-threshold and no-data apart", () => {
  expect(zone(file([], { [NOW]: 1000 }), 'bkk').state).toBe('no_data')
  expect(zone(file([row('bang_rak', 'gono_chlam', NOW, 5)], { [NOW]: 1000 }), 'bkk').state).toBe('below_threshold')
})
it('shows symptoms on their own, never in the confirmed signal or the testing level', () => {
  expect(zone(file([row('bang_rak', 'symptoms', NOW, 30)], { [NOW]: 1000 }), 'bang_rak')).toMatchObject({ state: 'below_threshold', density: null, symptoms: 'medium', testing: null })
})
it('lets symptoms count for four weeks, not five', () => {
  const at = (back: number) => zone(file([row('bang_rak', 'symptoms', shiftWeek(NOW, -back), 30)], { [NOW]: 1000 }), 'bang_rak').symptoms
  expect(at(3)).toBe('medium')
  expect(at(4)).toBeNull()
})
it('counts only the 50 districts in the city', () => {
  const areas = file([row('central', 'gono_chlam', NOW, 40)], { [NOW]: 1000 })
  expect(areas.find((a) => a.areaId === 'central')).toBeUndefined()
  expect(zone(areas, 'bkk').state).toBe('no_data')
})
it('suspends a district by its id', () => {
  expect(zone(file([], { [NOW]: 1000 }, ['bang_rak']), 'bang_rak')).toMatchObject({ state: 'suspended', symptoms: null })
})
