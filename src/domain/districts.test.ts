import { expect, it } from 'vitest'
import { DISTRICT_IDS, DISTRICTS, districtLabel, districtName } from './districts'

it('lists the 50 districts once each, in Thai alphabetical order, with ascii ids', () => {
  expect(DISTRICTS).toHaveLength(50)
  expect(new Set(DISTRICT_IDS).size).toBe(50)
  for (const id of DISTRICT_IDS) expect(id).toMatch(/^[a-z]+(_[a-z]+)*$/)
  expect([...DISTRICTS].sort((a, b) => a.name.localeCompare(b.name, 'th'))).toEqual(DISTRICTS)
  expect(DISTRICTS).toContainEqual({ id: 'bang_rak', name: 'บางรัก' })
  expect(DISTRICTS).toContainEqual({ id: 'watthana', name: 'วัฒนา' })
})

it('names a district with and without the word เขต, and nothing for an id that is not a district', () => {
  expect(districtName('bang_rak')).toBe('บางรัก')
  expect(districtLabel('bang_rak')).toBe('เขตบางรัก')
  expect(districtLabel('central')).toBe('')
})
