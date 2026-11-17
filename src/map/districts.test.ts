import { expect, it } from 'vitest'
import { ZONES } from './areas'
import { DISTRICT_LIST, DISTRICTS } from './districts'

it('puts each of the 50 districts in exactly one of the six zones the map draws', () => {
  const names = Object.values(DISTRICTS).flat()
  expect(names).toHaveLength(50)
  expect(new Set(names).size).toBe(50)
  expect(Object.keys(DISTRICTS).sort()).toEqual(ZONES.map((z) => z.id).sort())
  expect(DISTRICT_LIST.find((d) => d.name === 'บางรัก')?.zone).toBe('south')
})
