import { expect, it } from 'vitest'
import { cancelPending, layersOn, queueReport, saveCard, setMyDistrict, toggleLayer, wipePhone } from './actions'
import { EMPTY_PHONE, phone, STORE_KEYS } from './stores'

it('keeps nothing on the phone by default', () => {
  wipePhone()
  expect(phone.get()).toEqual(EMPTY_PHONE)
})
it('stores a card only when asked, and wipes it', () => {
  wipePhone()
  saveCard({ group: 'syphilis', source: 'lab_result', sentAt: '2026-11-11T00:00:00.000Z', hasLabResult: true })
  expect(phone.get().card?.group).toBe('syphilis')
  wipePhone()
  expect(phone.get()).toEqual(EMPTY_PHONE)
})
it('falls back to an empty store when stored data has an older shape', () => {
  localStorage.setItem(STORE_KEYS.phone, JSON.stringify({ cards: [] }))
  expect(phone.get()).toEqual(EMPTY_PHONE)
})
it('leaves nothing of the prototype\'s other parties in the browser', async () => {
  localStorage.setItem('cluster.v2.clinic', '{}')
  localStorage.setItem('cluster.v2.demo', '{}')
  const { vi } = await import('vitest')
  vi.resetModules()
  await import('./stores')
  expect(localStorage.getItem('cluster.v2.clinic')).toBeNull()
  expect(localStorage.getItem('cluster.v2.demo')).toBeNull()
})

// ---- round 2: layer switches, the remembered district, and a cancel that tells the truth ----------
it('turns every layer on but pharmacies for a phone that never chose', () => {
  expect(layersOn(EMPTY_PHONE)).toEqual({ confirmed: true, symptoms: true, sti: true, health_centre: true, hospital: true, pharmacy: false })
})
it('remembers a layer switched, and ignores what an older or damaged store holds', () => {
  wipePhone()
  toggleLayer('pharmacy')
  toggleLayer('sti')
  expect(layersOn(phone.get())).toMatchObject({ pharmacy: true, sti: false })
  phone.update((s) => ({ ...s, layers: { hospital: 'no' as unknown as boolean } }))
  expect(layersOn(phone.get()).hospital).toBe(true)
})
it('remembers a district only when it is one of the 50', () => {
  wipePhone()
  setMyDistrict('bang_rak')
  setMyDistrict('central')
  expect(phone.get().myDistrict).toBe('bang_rak')
})
it('will not cancel a report the weekly envelope is taking, and frees it otherwise', () => {
  wipePhone()
  queueReport({ kind: 'tested', zone: 'bang_rak', savedAt: 's1' })
  localStorage.setItem('cluster.envelope-claim', JSON.stringify({ week: '2026-W47', at: Date.now(), savedAt: 's1' }))
  expect(cancelPending()).toBe('sending')
  expect(phone.get().pending).toMatchObject({ savedAt: 's1' })
  localStorage.removeItem('cluster.envelope-claim')
  localStorage.setItem('cluster.envelope-outbox', JSON.stringify({ week: '2026-W47', savedAt: 's1', body: '{}' }))
  expect(cancelPending()).toBe('sending')
  localStorage.removeItem('cluster.envelope-outbox')
  expect(cancelPending()).toBe('cancelled')
  expect(phone.get()).toMatchObject({ pending: null, testedNextWeek: null })
  expect(cancelPending()).toBe('none')
})
it('cancels when the claim is for another report or is more than two minutes old', () => {
  wipePhone()
  queueReport({ kind: 'tested', zone: 'bang_rak', savedAt: 's1' })
  localStorage.setItem('cluster.envelope-claim', JSON.stringify({ week: '2026-W47', at: Date.now(), savedAt: 'other' }))
  expect(cancelPending()).toBe('cancelled')
  queueReport({ kind: 'tested', zone: 'bang_rak', savedAt: 's1' })
  localStorage.setItem('cluster.envelope-claim', JSON.stringify({ week: '2026-W47', at: Date.now() - 3 * 60_000, savedAt: 's1' }))
  expect(cancelPending()).toBe('cancelled')
})
