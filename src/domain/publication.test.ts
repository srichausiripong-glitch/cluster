import { expect, it } from 'vitest'
import { densityBand } from './publication'


it('bands density only from the threshold up', () => {
  expect(densityBand(9)).toBeNull()
  expect(densityBand(10)).toBe('thin')
  expect(densityBand(20)).toBe('medium')
  expect(densityBand(50)).toBe('dense')
})
