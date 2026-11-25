import { expect, it } from 'vitest'
import { composeNotice } from './notify'

const base = { hasLabResult: true, week: '2026-W46' }

it('names HIV only for exposure within 72 hours', () => {
  expect(composeNotice({ ...base, group: 'hiv', nameDisease: true, band: 'w2' }).group).toBeNull()
  expect(composeNotice({ ...base, group: 'hiv', nameDisease: true, band: 'h72' }).group).toBe('hiv')
})
it('names no disease unless the sender chooses to', () => {
  expect(composeNotice({ ...base, group: 'syphilis', nameDisease: false, band: 'w4' }).group).toBeNull()
  expect(composeNotice({ ...base, group: 'syphilis', nameDisease: true, band: 'w4' })).toMatchObject({ v: 2, group: 'syphilis', tier: 1 })
})
it('puts a sender without a lab result in tier 2', () => {
  expect(composeNotice({ ...base, hasLabResult: false, group: 'syphilis', nameDisease: true, band: 'w4' }).tier).toBe(2)
})
it('makes a version 2 notice with no code in it', () => {
  const n = composeNotice({ ...base, group: 'syphilis', nameDisease: false, band: 'w4' })
  expect(n).toEqual({ v: 2, group: null, tier: 1, band: 'w4', week: '2026-W46' })
})
it('does not name HIV for a contact older than three months', () => {
  expect(composeNotice({ ...base, group: 'hiv', nameDisease: true, band: 'older' }).group).toBeNull()
})
