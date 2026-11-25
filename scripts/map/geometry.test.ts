import { expect, it } from 'vitest'
import { pointInRings, simplify, stitch } from './geometry.ts'

const p = (lat: number, lon: number) => ({ lat, lon })
it('joins ways end to end into one closed ring, whatever their direction', () => {
  const ring = stitch([[p(0, 0), p(0, 1)], [p(1, 1), p(0, 1)], [p(1, 1), p(1, 0), p(0, 0)]])
  expect(ring).toHaveLength(1)
  expect(ring[0][0]).toEqual(ring[0].at(-1))
  expect(ring[0]).toHaveLength(5)
})
it('drops points that do not change the shape', () => {
  expect(simplify([[0, 0], [5, 0.1], [10, 0], [10, 10]], 1)).toEqual([[0, 0], [10, 0], [10, 10]])
})
it('tells inside from outside', () => {
  const square = [[0, 0, 10, 0, 10, 10, 0, 10, 0, 0]]
  expect(pointInRings([5, 5], square)).toBe(true)
  expect(pointInRings([15, 5], square)).toBe(false)
})
