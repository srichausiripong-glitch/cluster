import { expect, it } from 'vitest'
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
