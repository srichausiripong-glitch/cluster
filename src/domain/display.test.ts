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
// Owner, 25 Nov 2026 (changing the 23 Nov traffic-light design): every colour from one report, each
// banded by its own raw count; the bar still rises with the random reports expected over the row's cells.
it('shows red from one positive, orange from one symptom, green from one tested', () => {
  const area = (kind: ReportKind, n: number) => zone(file([row('bang_rak', kind, NOW, n)]), 'bang_rak')
  expect(area('syphilis', 1)).toEqual({ areaId: 'bang_rak', state: 'shown', density: 'thin', step: 'new', testing: null, symptoms: null })
  expect(area('symptoms', 1)).toMatchObject({ state: 'shown', symptoms: 'thin', density: null })
  expect(area('tested', 1)).toMatchObject({ state: 'shown', testing: 'low', density: null, step: null })
})
it('never shows a positive as green', () => {
  expect(zone(file([row('bang_rak', 'syphilis', NOW, 2)]), 'bang_rak')).toMatchObject({ state: 'shown', testing: null, symptoms: null })
})
it('bands each row by its own raw count: under 5, 5 to 14, 15 and up', () => {
  const band = (kind: ReportKind, n: number) => zone(file([row('bang_rak', kind, NOW, n)]), 'bang_rak')
  expect([4, 5, 14, 15].map((n) => band('syphilis', n).density)).toEqual(['thin', 'medium', 'medium', 'dense'])
  expect([4, 5, 15].map((n) => band('tested', n).testing)).toEqual(['low', 'medium', 'high'])
  expect([1, 5, 15].map((n) => band('symptoms', n).symptoms)).toEqual(['thin', 'medium', 'dense'])
})
it('raises the bar with the random reports expected, so noise alone paints nothing', () => {
  // 100,000 envelopes in NOW: one random report expected per cell. Red counts two cells that week
  // (gonorrhoea/chlamydia and syphilis), so λ = 2 and red needs round(1 + 2 + 2√2) = 6; green has λ = 1 and needs 4.
  const run = (kind: ReportKind, n: number) => zone(file([row('bang_rak', kind, NOW, n)], { [NOW]: 100000 }), 'bang_rak')
  expect(run('syphilis', 5).density).toBeNull()
  expect(run('syphilis', 6).density).toBe('medium')
  expect(run('tested', 3).testing).toBeNull()
  expect(run('tested', 4).testing).toBe('low')
})
it('raises the city bar by fifty districts of random reports', () => {
  // 2,000 envelopes give the city λ = 50 × 2 × 0.02 = 2 for red: it needs 6, not 1.
  const city = (n: number) => zone(file([row('bang_rak', 'syphilis', NOW, n)], { [NOW]: 2000 }), 'bkk')
  expect(city(5).density).toBeNull()
  expect(city(6).density).toBe('medium')
})
it('drops reports that have expired', () => {
  expect(zone(file([row('chatuchak', 'gono_chlam', '2026-W41', 12)]), 'chatuchak').state).toBe('below_threshold')
  expect(zone(file([row('chatuchak', 'gono_chlam', '2026-W43', 12)]), 'chatuchak')).toMatchObject({ state: 'shown', step: 'expiring' })
})
it('shows the age as mixed when no single step leads', () => {
  expect(zone(file([row('ratchathewi', 'gono_chlam', NOW, 6), row('ratchathewi', 'gono_chlam', '2026-W45', 6)]), 'ratchathewi')).toMatchObject({ state: 'shown', step: 'mixed' })
})
it('counts only tested reports as green, never positives', () => {
  const area = zone(file([row('bang_kapi', 'tested', NOW, 30), row('bang_kapi', 'syphilis', '2026-W40', 20)]), 'bang_kapi')
  expect(area.testing).toBe('high')
  expect(zone(file([row('bang_kapi', 'syphilis', '2026-W40', 20)]), 'bang_kapi').testing).toBeNull()
})
it('counts testing over the last twelve weeks only', () => {
  expect(zone(file([row('bang_kapi', 'tested', '2026-W34', 40)]), 'bang_kapi').testing).toBeNull()
  expect(zone(file([row('bang_kapi', 'tested', '2026-W35', 40)]), 'bang_kapi').testing).toBe('high')
})
it('says a suspended district is suspended and shows nothing else for it', () => {
  expect(zone(file([row('bang_rak', 'syphilis', NOW, 40), row('bang_rak', 'tested', NOW, 90)], {}, ['bang_rak']), 'bang_rak')).toEqual({ areaId: 'bang_rak', state: 'suspended', density: null, step: null, testing: null, symptoms: null })
})
it('builds the city from all fifty districts with the same rule', () => {
  // 3,000 envelopes: a district's red has λ = 0.06 and needs round(1 + 0.06 + 2√0.06) = 2; the city has
  // λ = 3 and needs 7. Seven districts with one positive each stay uncoloured, the city shows.
  const seven = DISTRICT_IDS.slice(0, 7)
  const areas = file(seven.map((d) => row(d, 'syphilis', NOW, 1)), { [NOW]: 3000 })
  expect(zone(areas, seven[0]).state).toBe('below_threshold')
  expect(zone(areas, 'bkk')).toMatchObject({ state: 'shown', density: 'medium', step: 'new' })
})
it('publishes the 50 districts in list order and the city last', () => {
  expect(file([]).map((a) => a.areaId)).toEqual([...DISTRICT_IDS, 'bkk'])
})
it('expects q × envelopes ÷ (50 districts × 4 kinds) random reports in one cell', () => {
  expect(expectedRandom(10000, 0.002)).toBeCloseTo(0.1)
})
it('gives a district with no report and one below the bar the same entry', () => {
  // 3,000 envelopes raise a district's red bar to 2, so one positive stays below it.
  const areas = file([row('bang_rak', 'gono_chlam', NOW, 1)], { [NOW]: 3000 })
  const strip = (area: PublishedArea) => ({ ...area, areaId: '' })
  expect(strip(zone(areas, 'bang_rak'))).toEqual(strip(zone(areas, 'chatuchak')))
  expect(zone(areas, 'chatuchak')).toMatchObject({ state: 'below_threshold', density: null, symptoms: null, testing: null })
})
it("keeps the city's below-threshold and no-data apart", () => {
  expect(zone(file([], { [NOW]: 1000 }), 'bkk').state).toBe('no_data')
  expect(zone(file([row('bang_rak', 'gono_chlam', NOW, 1)], { [NOW]: 1000 }), 'bkk').state).toBe('below_threshold')
})
it('shows symptoms on their own, never in the confirmed signal or the testing level', () => {
  expect(zone(file([row('bang_rak', 'symptoms', NOW, 8)], { [NOW]: 1000 }), 'bang_rak')).toMatchObject({ state: 'shown', density: null, symptoms: 'medium', testing: null, step: null })
})
it('lets symptoms count for four weeks, not five', () => {
  const at = (back: number) => zone(file([row('bang_rak', 'symptoms', shiftWeek(NOW, -back), 8)], { [NOW]: 1000 }), 'bang_rak').symptoms
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
