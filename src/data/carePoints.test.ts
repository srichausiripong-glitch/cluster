import { expect, it } from 'vitest'
import { zoneAt } from '../map/areas'
import { toXY } from '../map/geo'
import { ALL_CARE_POINTS, verifiedOnly, type CarePoint } from './carePoints'

const point = (over: Partial<CarePoint>): CarePoint => ({
  id: 'x',
  name: 'จุดบริการ',
  kind: 'clinic',
  klass: 'A',
  zoneId: 'central',
  lat: 13.766536,
  lon: 100.538162,
  address: 'ถนนตัวอย่าง',
  free: true,
  community: false,
  source: 'https://example.org',
  verified: null,
  ...over,
})

it('holds every candidate point with a source, a real place in Bangkok and the zone it stands in', () => {
  const ids = new Set<string>()
  for (const p of ALL_CARE_POINTS) {
    expect(ids.has(p.id), p.id).toBe(false)
    ids.add(p.id)
    expect(p.source, p.id).toMatch(/^https:\/\//)
    expect(p.lat, p.id).toBeGreaterThan(13.4)
    expect(p.lat, p.id).toBeLessThan(14.0)
    expect(p.lon, p.id).toBeGreaterThan(100.3)
    expect(p.lon, p.id).toBeLessThan(100.95)
    expect(zoneAt(toXY(p.lat, p.lon))?.id, p.id).toBe(p.zoneId)
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
it('shows only the points somebody has confirmed', () => {
  const confirmed = point({ id: 'a', verified: { date: '2026-11-20', by: 'ทีม', method: 'phone' } })
  expect(verifiedOnly([confirmed, point({ id: 'b' })])).toEqual([confirmed])
})
