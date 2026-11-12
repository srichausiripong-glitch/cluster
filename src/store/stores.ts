import type { DiseaseGroup, ReportSource } from '../domain/types'
import { createPartyStore } from './partyStore'

export interface SignalCard {
  group: DiseaseGroup
  source: ReportSource
  sentAt: string
  hasClinicCode: boolean
}
/** The phone keeps nothing unless the person opts in (spec 5.6). A claimed clinic code is never stored here. */
export interface PhoneState {
  card: SignalCard | null
  reminders: { date: string }[]
}
/** The key carries a version: a change of stored shape starts from empty instead of breaking the page. */
export const STORE_KEYS = {
  phone: 'cluster.v2.phone',
} as const

// The prototype kept every party's data in this browser. The real app keeps only the phone's own.
try {
  for (const name of ['phone', 'clinic', 'operator', 'public', 'ledger', 'demo']) localStorage.removeItem(`cluster.${name}`)
  for (const name of ['clinic', 'operator', 'public', 'ledger', 'demo']) localStorage.removeItem(`cluster.v2.${name}`)
} catch {
  // storage unavailable: nothing to clean up
}

type Rec = Record<string, unknown>
const has = (value: unknown, ...keys: string[]) => keys.every((k) => k in (value as object))
const arr = (value: unknown, key: string) => Array.isArray((value as Rec)[key])

export const phone = createPartyStore<PhoneState>(STORE_KEYS.phone, { card: null, reminders: [] }, (v) => has(v, 'card') && arr(v, 'reminders'))
