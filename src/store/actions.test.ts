import { expect, it } from 'vitest'
import { isoWeek } from '../domain/weeks'
import {
  acceptSlip, claimCodeOnPhone, consentCityCount, createSlip, flagPositive, issueClinicCode,
  publishWeek, resetDemo, saveCard, seedDemo, sendWeeklyBatch, wipePhone,
} from './actions'
import { ledger, operator, phone, pub } from './stores'

const week = () => isoWeek(new Date())

it('keeps nothing on the phone by default', () => {
  resetDemo()
  expect(phone.get()).toEqual({ card: null, reminders: [] })
})
it('sends the operator counts only, and only for people who consented', () => {
  resetDemo()
  const a = issueClinicCode()
  const b = issueClinicCode()
  flagPositive(a, 'syphilis')
  consentCityCount(a)
  flagPositive(b, 'syphilis') // b did not consent
  sendWeeklyBatch(week())
  expect(operator.get().batches[0].counts).toEqual({ syphilis: 1 })
  expect(JSON.stringify(operator.get())).not.toContain(a)
  expect(ledger.get().entries.some((e) => e.party === 'clinic' && e.action === 'issueClinicCode')).toBe(true)
})
it('lets the phone check a clinic code without learning anything from an unknown one', () => {
  resetDemo()
  const a = issueClinicCode()
  flagPositive(a, 'syphilis')
  expect(claimCodeOnPhone(a)).toEqual({ ok: true, positiveGroup: 'syphilis' })
  expect(claimCodeOnPhone('nope')).toEqual({ ok: false, positiveGroup: null })
  expect(phone.get()).toEqual({ card: null, reminders: [] })
})
it('publishes the city as shown at the threshold and hidden below it', () => {
  seedDemo('threshold')
  publishWeek(week())
  expect(pub.get().files.at(-1)!.areas.find((x) => x.areaId === 'bkk')).toMatchObject({ state: 'shown', density: 'thin' })
  seedDemo('pilot')
  publishWeek(week())
  expect(pub.get().files.at(-1)!.areas.find((x) => x.areaId === 'bkk')!.state).toBe('below_threshold')
})
it('stores a card only when asked, and wipes it', () => {
  resetDemo()
  saveCard({ group: 'syphilis', source: 'clinic_code', sentAt: '2026-11-11T00:00:00.000Z', hasClinicCode: true })
  expect(phone.get().card?.group).toBe('syphilis')
  wipePhone()
  expect(phone.get()).toEqual({ card: null, reminders: [] })
})
it('accepts a slip made on the phone and rejects a mistyped one', () => {
  resetDemo()
  const slip = createSlip()
  expect(acceptSlip(slip)).toBe(true)
  expect(acceptSlip(slip.slice(0, -1) + (slip.endsWith('0') ? '1' : '0'))).toBe(false)
})
it('clears every party on reset', () => {
  issueClinicCode()
  resetDemo()
  for (const k of ['cluster.phone', 'cluster.clinic', 'cluster.operator', 'cluster.public', 'cluster.ledger']) {
    expect(localStorage.getItem(k)).toBeNull()
  }
})
