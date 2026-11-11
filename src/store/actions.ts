import { th } from '../copy/th'
import { publishArea } from '../domain/publication'
import type { DiseaseGroup, Party, SignalReport } from '../domain/types'
import { isoWeek } from '../domain/weeks'
import type { SignalCard } from './stores'
import { clinic, demo, ledger, operator, phone, pub } from './stores'

const CLINIC_ID = 'clinic-demo'
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
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

/** The same kind of code for every tester, whatever the result (spec 5.4). */
export function issueClinicCode(): string {
  const id = Array.from({ length: 3 }, () => LETTERS[randomInt(LETTERS.length)]).join('') + String(randomInt(1000)).padStart(3, '0')
  clinic.update((s) => ({ ...s, codes: [...s.codes, { id, issuedAt: now(), positiveGroup: null, cityConsent: false, week: isoWeek(new Date()) }] }))
  log('clinic', 'issueClinicCode', `ออกรหัส ${id} ให้ผู้มาตรวจ`)
  return id
}

export function flagPositive(codeId: string, group: DiseaseGroup): void {
  clinic.update((s) => ({ ...s, codes: s.codes.map((c) => (c.id === codeId ? { ...c, positiveGroup: group } : c)) }))
  log('clinic', 'flagPositive', `บันทึกผลบวก ${th.group[group]} ของรหัส ${codeId}`)
}

/** The phone asks whether a code is usable. Nothing is written to the phone. */
export function claimCodeOnPhone(codeId: string): { ok: boolean; positiveGroup: DiseaseGroup | null } {
  const code = clinic.get().codes.find((c) => c.id === codeId.trim().toUpperCase())
  if (!code) return { ok: false, positiveGroup: null }
  log('phone', 'claimCode', 'ใช้รหัสคลินิกในแอป โดยไม่เก็บรหัสลงเครื่อง')
  return { ok: true, positiveGroup: code.positiveGroup }
}

/** Consent to be counted in the city-level signal is recorded where the result lives: at the clinic. */
export function consentCityCount(codeId: string): void {
  clinic.update((s) => ({ ...s, codes: s.codes.map((c) => (c.id === codeId ? { ...c, cityConsent: true } : c)) }))
  log('clinic', 'consentCityCount', 'ผู้ใช้ยินยอมให้นับรวมเป็นสัญญาณของกรุงเทพฯ')
}

/** Only counts leave the clinic: positives who consented, per disease group, for one week. */
export function sendWeeklyBatch(week: string): void {
  const counts: Partial<Record<DiseaseGroup, number>> = {}
  for (const code of clinic.get().codes) {
    if (code.week === week && code.positiveGroup && code.cityConsent) counts[code.positiveGroup] = (counts[code.positiveGroup] ?? 0) + 1
  }
  operator.update((s) => ({
    ...s,
    batches: [...s.batches.filter((b) => !(b.clinicId === CLINIC_ID && b.week === week)), { clinicId: CLINIC_ID, week, counts }],
  }))
  log('clinic', 'sendWeeklyBatch', 'ส่งยอดรวมประจำสัปดาห์ ไม่มีชื่อและไม่มีรหัส')
  log('operator', 'receiveBatch', 'รับยอดรวมจากคลินิก')
}

export function publishWeek(week: string): void {
  const reports: SignalReport[] = operator.get().batches.flatMap((batch) =>
    (Object.entries(batch.counts) as [DiseaseGroup, number][]).flatMap(([group, n]) => Array.from({ length: n }, () => ({ group, week: batch.week }))),
  )
  const area = publishArea('bkk', reports, week, true)
  pub.update((s) => ({ files: [...s.files, { week, areas: [area] }].slice(-12) }))
  log('operator', 'publishWeek', 'คำนวณไฟล์ประจำสัปดาห์ตามเกณฑ์ 10')
  log('public', 'fileUpdated', `ไฟล์ที่เผยแพร่: กรุงเทพฯ ${th.map.state[area.state]}`)
}

export function tallyFastTrack(code: string): void {
  clinic.update((s) => ({ ...s, fastTrackTally: { ...s.fastTrackTally, [code]: (s.fastTrackTally[code] ?? 0) + 1 } }))
  log('clinic', 'tallyFastTrack', 'นับผู้มารับบริการด้วยรหัสรายสัปดาห์ โดยไม่ผูกกับบุคคล')
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

/** `pilot` stays under the threshold; `threshold` is exactly 12 reports this week (thin band). */
export function seedDemo(scenario: 'empty' | 'pilot' | 'threshold'): void {
  resetDemo()
  if (scenario === 'empty') return
  const week = isoWeek(new Date())
  const counts = scenario === 'pilot' ? { syphilis: 3, gono_chlam: 3 } : { syphilis: 7, gono_chlam: 5 }
  operator.update((s) => ({ ...s, batches: [{ clinicId: CLINIC_ID, week, counts }] }))
  log('operator', 'seed', scenario === 'pilot' ? 'ข้อมูลสาธิต: ยอดรวมยังไม่ถึงเกณฑ์' : 'ข้อมูลสาธิต: ยอดรวมถึงเกณฑ์ 10')
}
