import { expect, it } from 'vitest'
import { weeklyCode } from './fastTrack'
import { composeNotice } from './notify'

const base = { hasClinicCode: true, week: '2026-W46' }

it('names HIV only for exposure within 72 hours', () => {
  expect(composeNotice({ ...base, group: 'hiv', nameDisease: true, band: 'w2' }).group).toBeNull()
  expect(composeNotice({ ...base, group: 'hiv', nameDisease: true, band: 'h72' }).group).toBe('hiv')
})
it('names no disease unless the sender chooses to', () => {
  expect(composeNotice({ ...base, group: 'syphilis', nameDisease: false, band: 'w4' }).group).toBeNull()
  expect(composeNotice({ ...base, group: 'syphilis', nameDisease: true, band: 'w4' })).toMatchObject({ v: 1, group: 'syphilis', tier: 1 })
})
it('puts a sender without a clinic code in tier 2', () => {
  expect(composeNotice({ ...base, hasClinicCode: false, group: 'syphilis', nameDisease: true, band: 'w4' }).tier).toBe(2)
})
it('carries the weekly code even when the page names no disease, so a clinic can still act on it', () => {
  const n = composeNotice({ ...base, group: 'syphilis', nameDisease: false, band: 'w4' })
  expect(n.group).toBeNull()
  expect(n.code).toBe(weeklyCode('syphilis', true, '2026-W46'))
})
it('gives a named notice a different code from an unnamed one of the same week', () => {
  const named = composeNotice({ ...base, group: 'syphilis', nameDisease: true, band: 'w4' })
  const unnamed = composeNotice({ ...base, group: 'syphilis', nameDisease: false, band: 'w4' })
  expect(named.code).toBe(weeklyCode('syphilis', true, '2026-W46', true))
  expect(named.code).not.toBe(unnamed.code)
})
it('does not name HIV for a contact older than three months', () => {
  expect(composeNotice({ ...base, group: 'hiv', nameDisease: true, band: 'older' }).group).toBeNull()
})
