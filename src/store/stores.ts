import type { DiseaseGroup, MapLayer, PendingReport, ReportSource } from '../domain/types'
import { createPartyStore } from './partyStore'

export interface SignalCard {
  group: DiseaseGroup
  source: ReportSource
  sentAt: string
  /** The sender said the result came from a clinic or a lab. Nobody checks it. */
  hasLabResult: boolean
}
/**
 * What the phone keeps (amendment 7): by default only this week's envelope time; a report waits
 * here until its envelope goes; a card and reminders only when the person asks.
 */
export interface PhoneState {
  card: SignalCard | null
  reminders: { date: string }[]
  pending: PendingReport | null
  /** The first week "tested" may go to the map again: four weeks after the last one. */
  testedNextWeek: string | null
  /** The server week this phone last sent its envelope in. */
  sentWeek: string | null
  /** When in the server week this phone sends its envelope, as a time in ms. */
  sendAt: { week: string; at: number } | null
  /** The first week "symptoms" may go to the map again: four weeks after the last one. Optional so stores kept before it stay valid. */
  symptomsNextWeek?: string | null
  /** The district this phone checks in for, so the next check-in is one press. Absent until the first; optional for the same reason. */
  myDistrict?: string
  /** The map layers this person switched on or off; the rest keep their defaults. Optional for stores kept before it. */
  layers?: Partial<Record<MapLayer, boolean>>
}
/** The key carries a version: a change of stored shape starts from empty instead of breaking the page. */
export const STORE_KEYS = {
  phone: 'cluster.v3.phone',
} as const

// The prototype kept every party's data in this browser. The real app keeps only the phone's own.
try {
  for (const name of ['phone', 'clinic', 'operator', 'public', 'ledger', 'demo']) localStorage.removeItem(`cluster.${name}`)
  for (const name of ['phone', 'clinic', 'operator', 'public', 'ledger', 'demo']) localStorage.removeItem(`cluster.v2.${name}`)
} catch {
  // storage unavailable: nothing to clean up
}

type Rec = Record<string, unknown>
const has = (value: unknown, ...keys: string[]) => keys.every((k) => k in (value as object))
const arr = (value: unknown, key: string) => Array.isArray((value as Rec)[key])

export const EMPTY_PHONE: PhoneState = { card: null, reminders: [], pending: null, testedNextWeek: null, sentWeek: null, sendAt: null }
export const phone = createPartyStore<PhoneState>(STORE_KEYS.phone, EMPTY_PHONE, (v) => has(v, 'card', 'pending', 'testedNextWeek', 'sentWeek', 'sendAt') && arr(v, 'reminders'))
