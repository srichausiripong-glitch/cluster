import { expect, it } from 'vitest'
import { weeklyCode } from './fastTrack'

it('gives every recipient the same code in a week, and a different one per week and per clinic-code status', () => {
  expect(weeklyCode('syphilis', true, '2026-W46')).toMatch(/^[A-Z]{2}[0-9]{3}$/)
  expect(weeklyCode('syphilis', true, '2026-W46')).toBe(weeklyCode('syphilis', true, '2026-W46'))
  expect(weeklyCode('syphilis', true, '2026-W46')).not.toBe(weeklyCode('syphilis', false, '2026-W46'))
  expect(weeklyCode('syphilis', true, '2026-W46')).not.toBe(weeklyCode('syphilis', true, '2026-W47'))
})
