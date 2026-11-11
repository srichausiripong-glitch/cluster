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
  /** The result lives here, at the clinic. The phone never learns it. */
  positiveGroup: DiseaseGroup | null
  cityConsent: boolean
  /** The group the person chose on the phone when agreeing to be counted. */
  consentGroup: DiseaseGroup | null
  /** The clinic answered a check for this code, so it knows the code was used in the app. */
  appChecked: boolean
  week: string
}
export interface ClinicState {
  staff: string
  codes: ClinicCode[]
  fastTrackTally: Record<string, number>
  slips: { id: string; at: string }[]
  /** The last week this clinic sent its totals for. */
  lastBatchWeek: string | null
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
/** Demo-only state shared across the stage's panes: which preset is loaded, the phase preview, and skipped weeks. */
export interface DemoState {
  phase: 1 | 2
  seed: 'empty' | 'pilot' | 'threshold'
  weekOffset: number
}

/** The key carries a version: a change of stored shape starts from empty instead of breaking the page. */
export const STORE_KEYS = {
  phone: 'cluster.v2.phone',
  clinic: 'cluster.v2.clinic',
  operator: 'cluster.v2.operator',
  public: 'cluster.v2.public',
  ledger: 'cluster.v2.ledger',
  demo: 'cluster.v2.demo',
} as const

try {
  for (const name of ['phone', 'clinic', 'operator', 'public', 'ledger', 'demo']) localStorage.removeItem(`cluster.${name}`)
} catch {
  // storage unavailable: nothing to clean up
}

type Rec = Record<string, unknown>
const has = (value: unknown, ...keys: string[]) => keys.every((k) => k in (value as object))
const arr = (value: unknown, key: string) => Array.isArray((value as Rec)[key])
const each = (value: unknown, key: string, ok: (item: Rec) => boolean) =>
  arr(value, key) && ((value as Rec)[key] as unknown[]).every((item) => item !== null && typeof item === 'object' && ok(item as Rec))

export const phone = createPartyStore<PhoneState>(STORE_KEYS.phone, { card: null, reminders: [] }, (v) => has(v, 'card') && arr(v, 'reminders'))
export const clinic = createPartyStore<ClinicState>(
  STORE_KEYS.clinic,
  { staff: 'เจ้าหน้าที่ตัวอย่าง', codes: [], fastTrackTally: {}, slips: [], lastBatchWeek: null },
  (v) => each(v, 'codes', (c) => typeof c.id === 'string' && typeof c.week === 'string' && 'consentGroup' in c) && arr(v, 'slips') && has(v, 'fastTrackTally', 'lastBatchWeek'),
)
export const operator = createPartyStore<OperatorState>(
  STORE_KEYS.operator,
  { connectionLog: [], batches: [], harmReports: [], suppressedAreas: [] },
  (v) => arr(v, 'connectionLog') && each(v, 'batches', (b) => typeof b.week === 'string' && b.counts !== null && typeof b.counts === 'object') && arr(v, 'harmReports') && arr(v, 'suppressedAreas'),
)
export const pub = createPartyStore<PublicState>(STORE_KEYS.public, { files: [] }, (v) => each(v, 'files', (f) => typeof f.week === 'string' && Array.isArray(f.areas)))
export const ledger = createPartyStore<LedgerState>(STORE_KEYS.ledger, { entries: [] }, (v) => arr(v, 'entries'))
export const demo = createPartyStore<DemoState>(STORE_KEYS.demo, { phase: 1, seed: 'empty', weekOffset: 0 }, (v) => has(v, 'phase', 'seed') && typeof (v as Rec).weekOffset === 'number')
