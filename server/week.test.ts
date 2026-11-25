// @vitest-environment node
import { expect, it } from 'vitest'
import { serverDay, serverWeek } from './week'

// The live map (owner, 25 Nov 2026): one envelope a day, by the date in Bangkok.
it('gives the date in Bangkok, which turns at 17:00 UTC', () => {
  expect(serverDay(new Date('2026-11-25T16:59:59Z'))).toBe('2026-11-25')
  expect(serverDay(new Date('2026-11-25T17:00:00Z'))).toBe('2026-11-26')
  expect(serverWeek(new Date('2026-11-29T17:00:00Z'))).toBe('2026-W49')
})
