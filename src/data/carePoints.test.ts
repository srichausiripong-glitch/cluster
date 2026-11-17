import { expect, it, vi } from 'vitest'
import { DISTRICT_IDS } from '../domain/districts'
import { FIXTURE_POINTS, FIXTURE_UNVERIFIED } from '../test/carePoints'
import { ALL_CARE_POINTS, CARE_POINTS, canTest, isVerified, orderedCarePoints, setCarePoints, type CarePoint } from './carePoints'

const point = (over: Partial<CarePoint>): CarePoint => ({
  id: 'x',
  name: 'จุดบริการ',
  kind: 'clinic',
  layer: 'sti',
  klass: 'A',
  districtId: 'ratchathewi',
  lat: 13.766536,
  lon: 100.538162,
  address: 'ถนนตัวอย่าง',
  free: true,
  community: false,
  source: 'https://example.org',
  fetched: '2026-11-17',
  verified: null,
  ...over,
})

it('holds every candidate point with a source and a real place in Bangkok', () => {
  const ids = new Set<string>()
  for (const p of ALL_CARE_POINTS) {
    expect(ids.has(p.id), p.id).toBe(false)
    ids.add(p.id)
    expect(p.source, p.id).toMatch(/^https:\/\//)
    expect(p.lat, p.id).toBeGreaterThan(13.4)
    expect(p.lat, p.id).toBeLessThan(14.0)
    expect(p.lon, p.id).toBeGreaterThan(100.3)
    expect(p.lon, p.id).toBeLessThan(100.95)
    expect(p.address.length, p.id).toBeGreaterThan(0)
    expect(p.name.endsWith('ตัวอย่าง'), p.id).toBe(false)
  }
})
it('shows services, hours and cost only for class A (spec 5.2)', () => {
  for (const p of ALL_CARE_POINTS.filter((c) => c.klass === 'B')) {
    expect(p.services, p.id).toBeUndefined()
    expect(p.hours, p.id).toBeUndefined()
    expect(p.cost, p.id).toBeUndefined()
  }
})
it('requires a phone call to confirm a place that gives PEP', () => {
  for (const p of ALL_CARE_POINTS.filter((c) => c.pep && c.verified)) expect(p.verified?.method, p.id).toBe('phone')
})
it('gives every registry point the day its data was copied', () => {
  for (const p of ALL_CARE_POINTS) expect(p.fetched, p.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})
// Two levels of trust replace "every point confirmed before launch" (redesign spec 5.8, 5.12).
it('ships every point, verified or not', async () => {
  vi.resetModules() // the setup has already replaced the list; a fresh copy shows what ships
  const fresh = await import('./carePoints')
  expect(fresh.CARE_POINTS.map((p) => p.id)).toEqual(fresh.ALL_CARE_POINTS.map((p) => p.id))
})
it('orders verified points first', () => {
  setCarePoints([...FIXTURE_UNVERIFIED, ...FIXTURE_POINTS])
  const order = orderedCarePoints().map((p) => isVerified(p))
  expect(order.indexOf(false)).toBeGreaterThan(order.lastIndexOf(true))
})

it('places each care point in the district its coordinates fall in', () => {
  expect(CARE_POINTS.find((p) => p.id === 'cp4')?.districtId).toBe('bang_rak')
  expect(CARE_POINTS.find((p) => p.id === 'cp8')?.districtId).toBe('chatuchak')
})
it('puts every point of the real registry inside a district', () => {
  for (const p of ALL_CARE_POINTS) expect(DISTRICT_IDS, p.id).toContain(p.districtId)
})

it('puts every registry point in one of the four layers, and counts every layer but pharmacies as a place to test', () => {
  for (const p of ALL_CARE_POINTS) expect(['sti', 'health_centre', 'hospital', 'pharmacy'], p.id).toContain(p.layer)
  expect(canTest(point({ layer: 'pharmacy' }))).toBe(false)
  expect(canTest(point({ layer: 'hospital' }))).toBe(true)
})
