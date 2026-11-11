import { expect, it } from 'vitest'
import { weeklyCode, weeklyCodes } from './fastTrack'

it('gives every recipient the same code in a week, and a different one per week and per clinic-code status', () => {
  expect(weeklyCode('syphilis', true, '2026-W46')).toMatch(/^[A-Z]{2}[0-9]{3}$/)
  expect(weeklyCode('syphilis', true, '2026-W46')).toBe(weeklyCode('syphilis', true, '2026-W46'))
  expect(weeklyCode('syphilis', true, '2026-W46')).not.toBe(weeklyCode('syphilis', false, '2026-W46'))
  expect(weeklyCode('syphilis', true, '2026-W46')).not.toBe(weeklyCode('syphilis', true, '2026-W47'))
})
it('gives a notice that names the disease its own code, so one named notice does not decode the unnamed ones', () => {
  expect(weeklyCode('hiv', true, '2026-W46', true)).not.toBe(weeklyCode('hiv', true, '2026-W46', false))
  expect(weeklyCode('hiv', true, '2026-W46')).toBe(weeklyCode('hiv', true, '2026-W46', false))
})
it('lists every code of a week for the clinic, four per disease group', () => {
  const all = weeklyCodes('2026-W46')
  expect(all).toHaveLength(16)
  expect(all.find((e) => e.code === weeklyCode('syphilis', false, '2026-W46', true))).toMatchObject({ group: 'syphilis', withClinicCode: false, named: true })
})
