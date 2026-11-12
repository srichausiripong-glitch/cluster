import { expect, it } from 'vitest'
import { saveCard, wipePhone } from './actions'
import { phone, STORE_KEYS } from './stores'

it('keeps nothing on the phone by default', () => {
  wipePhone()
  expect(phone.get()).toEqual({ card: null, reminders: [] })
})
it('stores a card only when asked, and wipes it', () => {
  wipePhone()
  saveCard({ group: 'syphilis', source: 'clinic_code', sentAt: '2026-11-11T00:00:00.000Z', hasClinicCode: true })
  expect(phone.get().card?.group).toBe('syphilis')
  wipePhone()
  expect(phone.get()).toEqual({ card: null, reminders: [] })
})
it('falls back to an empty store when stored data has an older shape', () => {
  localStorage.setItem(STORE_KEYS.phone, JSON.stringify({ cards: [] }))
  expect(phone.get()).toEqual({ card: null, reminders: [] })
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
