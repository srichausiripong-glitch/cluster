import { th } from '../copy/th'
import { stepFor, type ZonedGroup } from '../domain/lifecycle'
import { publishArea } from '../domain/publication'
import type { DiseaseGroup, Party, SignalReport } from '../domain/types'
import { isoWeek, shiftWeek, weekIndex } from '../domain/weeks'
import type { ClinicCode, DemoState, SignalCard, WeeklyBatch } from './stores'
import { clinic, demo, ledger, operator, phone, pub } from './stores'

const CLINIC_ID = 'clinic-demo'
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
/** Only these two groups ever feed an area signal. HIV never does; mpox uses official figures (spec 3.2, 7.1). */
export const MAPPED_GROUPS: readonly DiseaseGroup[] = ['gono_chlam', 'syphilis']
const now = () => new Date().toISOString()

function randomInt(max: number): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] % max
}

/** Every action records which party's store it wrote, for the "ข้อมูลอยู่ที่ไหน" view. */
function log(party: Party, action: string, detail: string) {
  ledger.update((s) => ({ entries: [...s.entries, { at: now(), party, action, detail }].slice(-200) }))
}

/** The demo's "this week": the real week plus the weeks the presenter has skipped. */
export function currentWeek(): string {
  return shiftWeek(isoWeek(new Date()), demo.get().weekOffset)
}

const newCode = (id: string, week: string): ClinicCode => ({ id, issuedAt: now(), positiveGroup: null, cityConsent: false, consentGroup: null, appChecked: false, week })

/** The same kind of code for every tester, whatever the result (spec 5.4). */
export function issueClinicCode(): string {
  const id = Array.from({ length: 3 }, () => LETTERS[randomInt(LETTERS.length)]).join('') + String(randomInt(1000)).padStart(3, '0')
  clinic.update((s) => ({ ...s, codes: [...s.codes, newCode(id, currentWeek())] }))
  log('clinic', 'issueClinicCode', `ออกรหัส ${id} ให้ผู้มาตรวจ`)
  return id
}

/** Staff record a result against a code, or clear one recorded by mistake. */
export function flagPositive(codeId: string, group: DiseaseGroup | null): void {
  clinic.update((s) => ({ ...s, codes: s.codes.map((c) => (c.id === codeId ? { ...c, positiveGroup: group } : c)) }))
  log('clinic', 'flagPositive', group ? `บันทึกผลบวก ${th.group[group]} ของรหัส ${codeId}` : `ลบผลที่บันทึกไว้ของรหัส ${codeId}`)
}

/**
 * The phone asks the clinic whether a code exists. The answer never includes the result,
 * so no screen can be used as proof of one (spec 3). Nothing is written to the phone, but
 * the check does leave it: the clinic learns that this code was used in the app.
 */
export function claimCodeOnPhone(codeId: string): { ok: boolean } {
  const id = codeId.trim().toUpperCase()
  log('phone', 'checkCode', 'ส่งรหัสไปตรวจกับคลินิก โดยไม่เก็บรหัสลงเครื่อง')
  if (!clinic.get().codes.some((c) => c.id === id)) {
    log('clinic', 'answerCheck', 'ตอบแอปว่าไม่พบรหัส')
    return { ok: false }
  }
  clinic.update((s) => ({ ...s, codes: s.codes.map((c) => (c.id === id ? { ...c, appChecked: true } : c)) }))
  log('clinic', 'answerCheck', `ตอบแอปว่ารหัส ${id} ใช้ได้ โดยไม่บอกผล คลินิกจึงรู้ว่ารหัสนี้ถูกใช้ในแอป`)
  return { ok: true }
}

/** Consent to be counted is recorded where the result lives, with the group the person chose. */
export function consentCityCount(codeId: string, group: DiseaseGroup): void {
  clinic.update((s) => ({ ...s, codes: s.codes.map((c) => (c.id === codeId ? { ...c, cityConsent: true, consentGroup: group } : c)) }))
  log('clinic', 'consentCityCount', 'ผู้ใช้ยินยอมให้คลินิกนับรวมเป็นสัญญาณของกรุงเทพฯ ถ้ารหัสมีผลยืนยัน')
}

/**
 * Only counts leave the clinic: codes with a recorded result, in a group that may feed the
 * map, whose holder agreed to be counted for that same group, for one week.
 */
export function weeklyCounts(codes: ClinicCode[], week: string): Partial<Record<DiseaseGroup, number>> {
  const counts: Partial<Record<DiseaseGroup, number>> = {}
  for (const code of codes) {
    const group = code.positiveGroup
    if (code.week !== week || !group || !code.cityConsent || code.consentGroup !== group || !MAPPED_GROUPS.includes(group)) continue
    counts[group] = (counts[group] ?? 0) + 1
  }
  return counts
}

export function sendWeeklyBatch(week: string): void {
  const counts = weeklyCounts(clinic.get().codes, week)
  operator.update((s) => ({
    ...s,
    batches: [...s.batches.filter((b) => !(b.clinicId === CLINIC_ID && b.week === week)), { clinicId: CLINIC_ID, week, counts }],
  }))
  clinic.update((s) => ({ ...s, lastBatchWeek: week }))
  log('clinic', 'sendWeeklyBatch', 'ส่งยอดรวมประจำสัปดาห์ ไม่มีชื่อและไม่มีรหัส')
  log('operator', 'receiveBatch', 'รับยอดรวมจากคลินิก')
}

/** Turns the counts the operator holds into one report per counted person, for the threshold rule. */
export function batchReports(batches: WeeklyBatch[]): SignalReport[] {
  return batches.flatMap((batch) =>
    (Object.entries(batch.counts) as [DiseaseGroup, number][]).flatMap(([group, n]) => Array.from({ length: n }, () => ({ group, week: batch.week }))),
  )
}

/** A weekly total is worth keeping only while one of its signals has not expired. */
const alive = (batch: WeeklyBatch, week: string) =>
  (Object.entries(batch.counts) as [DiseaseGroup, number][]).some(
    ([group, n]) => n > 0 && MAPPED_GROUPS.includes(group) && stepFor(group as ZonedGroup, weekIndex(batch.week, week)) !== 'expired',
  )

/** Publishes one file per week. Totals whose signals have all expired are deleted first (spec 7.2). */
export function publishWeek(week: string): void {
  const held = operator.get().batches
  const kept = held.filter((batch) => alive(batch, week))
  if (kept.length !== held.length) {
    operator.update((s) => ({ ...s, batches: kept }))
    log('operator', 'pruneBatches', 'ลบยอดรวมที่สัญญาณหมดอายุแล้ว เหลือเฉพาะไฟล์ที่เผยแพร่ไปแล้ว')
  }
  const area = publishArea('bkk', batchReports(kept), week, true)
  pub.update((s) => ({ files: [...s.files.filter((f) => f.week !== week), { week, areas: [area] }].slice(-60) }))
  log('operator', 'publishWeek', 'คำนวณไฟล์ประจำสัปดาห์ตามเกณฑ์ 10')
  log('public', 'fileUpdated', `ไฟล์ที่เผยแพร่: กรุงเทพฯ ${th.map.state[area.state]}`)
}

/** Demo only: one week passes and the weekly file is published again, so a signal can be seen ageing and expiring. */
export function advanceWeek(): void {
  demo.update((s) => ({ ...s, weekOffset: s.weekOffset + 1 }))
  log('operator', 'advanceWeek', 'การสาธิตข้ามไปสัปดาห์ถัดไป')
  publishWeek(currentWeek())
}

export function tallyFastTrack(code: string): void {
  clinic.update((s) => ({ ...s, fastTrackTally: { ...s.fastTrackTally, [code]: (s.fastTrackTally[code] ?? 0) + 1 } }))
  log('clinic', 'tallyFastTrack', 'นับผู้มารับบริการด้วยรหัสรายสัปดาห์ โดยไม่ผูกกับบุคคล')
}

export function untallyFastTrack(code: string): void {
  if ((clinic.get().fastTrackTally[code] ?? 0) === 0) return
  clinic.update((s) => ({ ...s, fastTrackTally: { ...s.fastTrackTally, [code]: s.fastTrackTally[code] - 1 } }))
  log('clinic', 'untallyFastTrack', 'ยกเลิกการนับที่กดผิด 1 ครั้ง')
}

const slipCheck = (digits: string) => String([...digits].reduce((sum, d, i) => sum + Number(d) * (i + 3), 0) % 10)

/** A slip is self-checking, so the phone and the operator store nothing about it. */
export function createSlip(): string {
  const digits = String(randomInt(10000)).padStart(4, '0')
  log('phone', 'createSlip', 'สร้างใบนำสำหรับคลินิก โดยไม่เก็บลงเครื่อง')
  return `S${digits}${slipCheck(digits)}`
}

export function acceptSlip(id: string): boolean {
  const m = /^S(\d{4})(\d)$/.exec(id.trim().toUpperCase())
  if (!m || slipCheck(m[1]) !== m[2]) return false
  clinic.update((s) => ({ ...s, slips: [...s.slips, { id: m[0], at: now() }] }))
  log('clinic', 'acceptSlip', 'รับใบนำ รายชื่อผู้สัมผัสอยู่ในบันทึกของคลินิกเอง')
  return true
}

export function saveCard(card: SignalCard): void {
  phone.update((s) => ({ ...s, card }))
  log('phone', 'saveCard', 'ผู้ใช้เลือกเก็บการ์ดสัญญาณไว้ในเครื่อง')
}

export function addReminder(date: string): void {
  phone.update((s) => ({ ...s, reminders: [...s.reminders, { date }] }))
  log('phone', 'addReminder', 'ผู้ใช้เลือกเก็บวันเตือนไว้ในเครื่อง')
}

export function wipePhone(): void {
  phone.reset()
  log('phone', 'wipePhone', 'ลบทุกอย่างในเครื่อง')
}

export function submitHarmReport(kind: string): void {
  operator.update((s) => ({ ...s, harmReports: [...s.harmReports, { at: now(), kind }] }))
  log('operator', 'harmReport', 'รับรายงานผลกระทบแบบเลือกหัวข้อ')
}

/** What a web server logs for any page view: a time and a path, nothing about health. */
export function logConnection(path: string): void {
  operator.update((s) => ({ ...s, connectionLog: [...s.connectionLog, { at: now(), path }].slice(-20) }))
}

export function resetDemo(): void {
  for (const store of [phone, clinic, operator, pub, ledger, demo]) store.reset()
}

/** Totals from two other partner clinics, so the live clinic's own batch adds to them and never replaces them. */
const PRESET_BATCHES: Record<'pilot' | 'threshold', Omit<WeeklyBatch, 'week'>[]> = {
  pilot: [
    { clinicId: 'clinic-b', counts: { syphilis: 2, gono_chlam: 1 } },
    { clinicId: 'clinic-c', counts: { syphilis: 1, gono_chlam: 2 } },
  ],
  threshold: [
    { clinicId: 'clinic-b', counts: { syphilis: 4, gono_chlam: 3 } },
    { clinicId: 'clinic-c', counts: { syphilis: 3, gono_chlam: 2 } },
  ],
}
/** A few codes for the live clinic's own week, so its console is not empty when a preset is loaded. */
const PRESET_CODES: Pick<ClinicCode, 'id' | 'positiveGroup' | 'cityConsent' | 'consentGroup' | 'appChecked'>[] = [
  { id: 'DMA101', positiveGroup: null, cityConsent: false, consentGroup: null, appChecked: false },
  { id: 'DMB202', positiveGroup: 'syphilis', cityConsent: true, consentGroup: 'syphilis', appChecked: true },
  { id: 'DMC303', positiveGroup: 'gono_chlam', cityConsent: false, consentGroup: null, appChecked: false },
  { id: 'DMD404', positiveGroup: null, cityConsent: false, consentGroup: null, appChecked: false },
]

/**
 * Loads a whole demo world and publishes it. `pilot` stays under the threshold (6 reports);
 * `threshold` is exactly 12 reports this week (thin band). Both come from other clinics.
 */
export function seedDemo(scenario: DemoState['seed']): void {
  resetDemo()
  if (scenario === 'empty') return
  demo.update((s) => ({ ...s, seed: scenario }))
  const week = currentWeek()
  operator.update((s) => ({ ...s, batches: PRESET_BATCHES[scenario].map((batch) => ({ ...batch, week })) }))
  clinic.update((s) => ({ ...s, codes: PRESET_CODES.map((code) => ({ ...newCode(code.id, week), ...code })) }))
  log('operator', 'seed', scenario === 'pilot' ? 'ข้อมูลสาธิต: ยอดรวมจากคลินิกอื่นยังไม่ถึงเกณฑ์' : 'ข้อมูลสาธิต: ยอดรวมจากคลินิกอื่นถึงเกณฑ์ 10')
  log('clinic', 'seed', 'ข้อมูลสาธิต: รหัสของสัปดาห์นี้ที่คลินิกออกไว้แล้ว')
  publishWeek(week)
}
