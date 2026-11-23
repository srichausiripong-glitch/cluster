import { expect, it } from 'vitest'
import { bandOf, reaches, SIGNAL_MIN, TESTED_MIN } from './publication'

// Owner, 23 Nov 2026 (traffic-light map design).
it('bands a raw count: under 5, 5 to 14, 15 and up', () => {
  expect([1, 4, 5, 14, 15, 90].map(bandOf)).toEqual(['thin', 'thin', 'medium', 'medium', 'dense', 'dense'])
})
it('asks for the minimum plus the random reports expected and twice their spread, rounded', () => {
  expect([SIGNAL_MIN, TESTED_MIN]).toEqual([3, 1])
  expect(reaches(3, SIGNAL_MIN, 0)).toBe(true)
  expect(reaches(2, SIGNAL_MIN, 0)).toBe(false)
  expect(reaches(1, TESTED_MIN, 0.001)).toBe(true)
  // λ = 2: round(3 + 2 + 2√2) = 8.
  expect(reaches(7, SIGNAL_MIN, 2)).toBe(false)
  expect(reaches(8, SIGNAL_MIN, 2)).toBe(true)
})
