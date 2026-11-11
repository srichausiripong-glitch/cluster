import { expect, it } from 'vitest'
import { isoWeek } from '../domain/weeks'
import {
  acceptSlip, advanceWeek, claimCodeOnPhone, consentCityCount, createSlip, currentWeek, flagPositive, issueClinicCode,
  publishWeek, resetDemo, saveCard, seedDemo, sendWeeklyBatch, tallyFastTrack, untallyFastTrack, wipePhone,
} from './actions'
import { clinic, demo, ledger, operator, phone, pub, STORE_KEYS } from './stores'

const week = () => isoWeek(new Date())
const city = () => pub.get().files.at(-1)!.areas.find((x) => x.areaId === 'bkk')!

it('keeps nothing on the phone by default', () => {
  resetDemo()
  expect(phone.get()).toEqual({ card: null, reminders: [] })
})
it('sends the operator counts only, and only for people who consented', () => {
  resetDemo()
  const a = issueClinicCode()
  const b = issueClinicCode()
  flagPositive(a, 'syphilis')
  consentCityCount(a, 'syphilis')
  flagPositive(b, 'syphilis') // b did not consent
  sendWeeklyBatch(week())
  expect(operator.get().batches[0].counts).toEqual({ syphilis: 1 })
  expect(JSON.stringify(operator.get())).not.toContain(a)
  expect(ledger.get().entries.some((e) => e.party === 'clinic' && e.action === 'issueClinicCode')).toBe(true)
})
it('never lets an HIV or mpox result into the weekly batch, even when the result is changed after consent', () => {
  resetDemo()
  const a = issueClinicCode()
  flagPositive(a, 'syphilis')
  consentCityCount(a, 'syphilis')
  flagPositive(a, 'hiv')
  const b = issueClinicCode()
  flagPositive(b, 'mpox')
  consentCityCount(b, 'mpox')
  sendWeeklyBatch(week())
  expect(operator.get().batches[0].counts).toEqual({})
})
it('counts a code only when the clinic result matches the group the person agreed to', () => {
  resetDemo()
  const a = issueClinicCode()
  consentCityCount(a, 'syphilis') // consent first: the phone does not know the result
  sendWeeklyBatch(week())
  expect(operator.get().batches[0].counts).toEqual({})
  flagPositive(a, 'gono_chlam') // a different group from the one agreed to
  sendWeeklyBatch(week())
  expect(operator.get().batches[0].counts).toEqual({})
  flagPositive(a, 'syphilis')
  sendWeeklyBatch(week())
  expect(operator.get().batches[0].counts).toEqual({ syphilis: 1 })
})
it('lets staff clear a result recorded by mistake', () => {
  resetDemo()
  const a = issueClinicCode()
  flagPositive(a, 'syphilis')
  flagPositive(a, null)
  expect(clinic.get().codes[0].positiveGroup).toBeNull()
})
it('lets the phone check a clinic code without learning its result, and shows that the check reached the clinic', () => {
  resetDemo()
  const a = issueClinicCode()
  flagPositive(a, 'syphilis')
  expect(claimCodeOnPhone(a)).toEqual({ ok: true })
  expect(claimCodeOnPhone('nope')).toEqual({ ok: false })
  expect(phone.get()).toEqual({ card: null, reminders: [] })
  expect(clinic.get().codes[0].appChecked).toBe(true)
  expect(ledger.get().entries.some((e) => e.party === 'clinic' && e.action === 'answerCheck')).toBe(true)
})
it('publishes the city as shown at the threshold and hidden below it', () => {
  seedDemo('threshold')
  publishWeek(week())
  expect(city()).toMatchObject({ state: 'shown', density: 'thin' })
  seedDemo('pilot')
  publishWeek(week())
  expect(city().state).toBe('below_threshold')
})
it('loads a preset as a whole world: other clinics, this clinic\'s week, and a published file', () => {
  seedDemo('threshold')
  expect(demo.get().seed).toBe('threshold')
  expect(pub.get().files).toHaveLength(1)
  expect(city().state).toBe('shown')
  expect(clinic.get().codes.length).toBeGreaterThan(0)
})
it('adds the live clinic\'s batch to the preset clinics instead of replacing them', () => {
  seedDemo('threshold')
  const before = operator.get().batches.length
  const a = issueClinicCode()
  flagPositive(a, 'syphilis')
  consentCityCount(a, 'syphilis')
  sendWeeklyBatch(week())
  publishWeek(week())
  expect(operator.get().batches).toHaveLength(before + 1)
  expect(city().state).toBe('shown')
})
it('keeps one published file per week however often it is published', () => {
  seedDemo('pilot')
  publishWeek(week())
  publishWeek(week())
  expect(pub.get().files).toHaveLength(1)
})
it('lets the presenter move forward week by week: the signal ages, expires, and expired totals are deleted', () => {
  seedDemo('threshold')
  advanceWeek()
  expect(currentWeek()).not.toBe(week())
  expect(city()).toMatchObject({ state: 'shown', step: 'mixed' })
  for (let i = 0; i < 3; i++) advanceWeek() // week 5: gonorrhoea reports have expired, 7 syphilis remain
  expect(city().state).toBe('below_threshold')
  for (let i = 0; i < 8; i++) advanceWeek() // week 13: syphilis reports have expired too
  expect(city().state).toBe('no_data')
  expect(operator.get().batches).toHaveLength(0)
  expect(pub.get().files.length).toBeGreaterThan(1)
})
it('undoes a fast-track tally pressed by mistake', () => {
  resetDemo()
  tallyFastTrack('AB123')
  tallyFastTrack('AB123')
  untallyFastTrack('AB123')
  expect(clinic.get().fastTrackTally.AB123).toBe(1)
  untallyFastTrack('AB123')
  untallyFastTrack('AB123')
  expect(clinic.get().fastTrackTally.AB123 ?? 0).toBe(0)
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
  for (const key of Object.values(STORE_KEYS)) expect(localStorage.getItem(key)).toBeNull()
})
it('falls back to an empty store when stored data has an older shape', () => {
  localStorage.setItem(STORE_KEYS.operator, JSON.stringify({ connectionLog: [], batches: [{ clinicId: 'x', week: '2026-W46' }], harmReports: [], suppressedAreas: [] }))
  expect(operator.get().batches).toEqual([])
  localStorage.setItem(STORE_KEYS.clinic, JSON.stringify({ staff: 'x', codes: [{ id: 'ABC123' }], fastTrackTally: {}, slips: [] }))
  expect(clinic.get().codes).toEqual([])
})
