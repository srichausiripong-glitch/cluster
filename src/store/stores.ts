import type { DiseaseGroup, Party, PublishedFile, ReportSource } from '../domain/types'
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
export interface ClinicCode {
  id: string
  issuedAt: string
  positiveGroup: DiseaseGroup | null
  cityConsent: boolean
  week: string
}
export interface ClinicState {
  staff: string
  codes: ClinicCode[]
  fastTrackTally: Record<string, number>
  slips: { id: string; at: string }[]
}
export interface WeeklyBatch {
  clinicId: string
  week: string
  counts: Partial<Record<DiseaseGroup, number>>
}
export interface OperatorState {
  connectionLog: { at: string; path: string }[]
  batches: WeeklyBatch[]
  harmReports: { at: string; kind: string }[]
  suppressedAreas: string[]
}
export interface PublicState {
  files: PublishedFile[]
}
export interface LedgerEntry {
  at: string
  party: Party
  action: string
  detail: string
}
export interface LedgerState {
  entries: LedgerEntry[]
}

const has = (value: unknown, ...keys: string[]) => keys.every((k) => k in (value as object))
const arr = (value: unknown, key: string) => Array.isArray((value as Record<string, unknown>)[key])

export const phone = createPartyStore<PhoneState>('cluster.phone', { card: null, reminders: [] }, (v) => has(v, 'card') && arr(v, 'reminders'))
export const clinic = createPartyStore<ClinicState>(
  'cluster.clinic',
  { staff: 'เจ้าหน้าที่ตัวอย่าง', codes: [], fastTrackTally: {}, slips: [] },
  (v) => arr(v, 'codes') && arr(v, 'slips') && has(v, 'fastTrackTally'),
)
export const operator = createPartyStore<OperatorState>(
  'cluster.operator',
  { connectionLog: [], batches: [], harmReports: [], suppressedAreas: [] },
  (v) => arr(v, 'connectionLog') && arr(v, 'batches') && arr(v, 'harmReports') && arr(v, 'suppressedAreas'),
)
export const pub = createPartyStore<PublicState>('cluster.public', { files: [] }, (v) => arr(v, 'files'))
export const ledger = createPartyStore<LedgerState>('cluster.ledger', { entries: [] }, (v) => arr(v, 'entries'))
