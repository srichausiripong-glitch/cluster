import { expect, it } from 'vitest'
import { isoWeek, shiftWeek, weekIndex } from './weeks'

it('formats a date as an ISO week', () => {
  expect(isoWeek(new Date('2026-11-11T12:00:00Z'))).toBe('2026-W46')
})
it('counts weeks from the publication week, starting at 1, across a 53-week year', () => {
  expect(weekIndex('2026-W46', '2026-W46')).toBe(1)
  expect(weekIndex('2026-W46', '2026-W49')).toBe(4)
  expect(weekIndex('2026-W52', '2027-W02')).toBe(4)
})
it('shifts a week backwards and across the year boundary', () => {
  expect(shiftWeek('2026-W46', -1)).toBe('2026-W45')
  expect(shiftWeek('2026-W53', 1)).toBe('2027-W01')
})
