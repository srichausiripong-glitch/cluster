import { expect, it, vi } from 'vitest'
import { DISTRICT_IDS } from '../domain/districts'
import { FIXTURE_POINTS, FIXTURE_UNVERIFIED } from '../test/carePoints'
import { ALL_CARE_POINTS, CARE_POINTS, canTest, isVerified, nearestFor, nearSort, orderedCarePoints, setCarePoints, type CarePoint } from './carePoints'

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

// "Near" is the same district, then a neighbouring one (redesign spec 5.7).
it('orders places by the chosen district, then its neighbours, then the rest', () => {
  setCarePoints(FIXTURE_POINTS)
  const districts = nearSort(CARE_POINTS, 'bang_rak').map((p) => p.districtId)
  // cp4 stands in Bang Rak, cp2 in Pathum Wan next to it; no other fixture is in a neighbour.
  expect(districts.slice(0, 2)).toEqual(['bang_rak', 'pathum_wan'])
  expect(districts).toHaveLength(CARE_POINTS.length)
})
it('falls back to the first place when no district is known', () => {
  setCarePoints(FIXTURE_POINTS)
  expect(nearestFor(null)?.id).toBe(orderedCarePoints()[0].id)
  expect(nearestFor('bkk')?.id).toBe(orderedCarePoints()[0].id)
  expect(nearestFor('bang_rak')?.id).toBe('cp4')
})

// ---- final review --------------------------------------------------------------------------------
// "Call first" needs a number to call: the registry's numbers come from the pages it was gathered from (docs/care-points-to-verify.md).
it('gives every PEP place that ships a number to call, and every number as whole digits', () => {
  const pep = ALL_CARE_POINTS.filter((p) => p.pep)
  expect(pep.length).toBeGreaterThan(0)
  for (const p of pep) expect(p.phone, p.id).toMatch(/^0\d{8,9}$/)
  for (const p of ALL_CARE_POINTS.filter((c) => c.phone !== undefined)) expect(p.phone, p.id).toMatch(/^0\d{8,9}$/)
  expect(ALL_CARE_POINTS.filter((p) => p.phone).length).toBeGreaterThanOrEqual(22 + 63 + 3)
})
it('counts a point whose data names no verification as not confirmed, as the launch check does', () => {
  expect(isVerified({ ...FIXTURE_POINTS[0], verified: undefined } as unknown as CarePoint)).toBe(false)
  for (const p of ALL_CARE_POINTS) expect('verified' in p, p.id).toBe(true)
})
it('puts the BMA centres the registry lists where the BMA’s own list puts them, not at a guess on the street', () => {
  const at: Record<string, [number, number, string]> = {
    'bma-hc3-bangsue': [13.8024555, 100.5339661, 'bang_sue'],
    'bma-hc9-prachathipatai': [13.7611791, 100.5036559, 'phra_nakhon'],
    'bma-hc25-huaikhwang': [13.77714885, 100.5799268, 'huai_khwang'],
    'bma-hc43-minburi': [13.8133, 100.73072, 'min_buri'],
    'bma-hc61-saimai': [13.92873, 100.65929, 'sai_mai'],
  }
  for (const [id, [lat, lon, district]] of Object.entries(at)) {
    const p = ALL_CARE_POINTS.find((c) => c.id === id)!
    expect([p.lat, p.lon, p.districtId], id).toEqual([lat, lon, district])
  }
})

it('gives every BMA health centre an email or a website as well as a phone', () => {
  const centres = ALL_CARE_POINTS.filter((p) => p.id.startsWith('bma-phc-'))
  expect(centres.length).toBeGreaterThan(60)
  for (const p of centres) {
    expect(p.phone, p.id).toBeTruthy()
    expect(p.email ?? p.website, p.id).toBeTruthy()
  }
})
it('sends the four Bangkok SWING clinics to testD to book, and no other place', async () => {
  const registry = (await import('./care-points.json')).default as { id: string; booking?: string }[]
  expect(registry.filter((p) => p.booking).map((p) => [p.id, p.booking])).toEqual([
    ['swing-silom', 'https://testd.website/booking'],
    ['swing-saphan-khwai', 'https://testd.website/booking'],
    ['swing-phetkasem', 'https://testd.website/booking'],
    ['swing-udomsuk', 'https://testd.website/booking'],
  ])
})
// Owner, 22 Nov 2026: SWING's Udomsuk branch, listed on testD's booking page, sits in Bang Na.
it('places SWING Udomsuk in Bang Na, with its hours from testD', () => {
  const udomsuk = ALL_CARE_POINTS.find((p) => p.id === 'swing-udomsuk')
  expect(udomsuk?.districtId).toBe('bang_na')
  expect(udomsuk?.open).toEqual([{ days: [0, 3, 4, 5, 6], from: '13:00', to: '20:00' }])
  expect(udomsuk?.openSource).toBe('https://testd.website/booking')
})
