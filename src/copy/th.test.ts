import { expect, it } from 'vitest'
import { adviceFor } from '../domain/advice'
import type { DiseaseGroup, ExposureBand } from '../domain/types'
import { BANNED_WORDS, th } from './th'

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out))
  return out
}

it('pins the copy the spec fixes', () => {
  expect(th.guidance).toEqual({ note: 'คำแนะนำทั่วไป ไม่ใช่การวินิจฉัย', sources: 'ที่มา:' })
  expect(th.map.step).toMatchObject({ new: 'เพิ่งรายงาน', followup: 'ช่วงติดตามผู้สัมผัส', expiring: 'ใกล้หมดอายุ', mixed: 'ผสม' })
  // Redesign spec 5.5: a district below the threshold reads "ยังไม่ถึงเกณฑ์" whether it had none or a few.
  expect(th.map.state.below_threshold).toBe('ยังไม่ถึงเกณฑ์')
  // Redesign spec 5.1–5.3, 5.7, 5.9: the status card, its flows, the district sheet, and no age limit.
  expect([th.home.ask, th.home.clear, th.home.found]).toEqual(['ตรวจล่าสุดเป็นไง?', 'ไม่เจอ', 'เจอ / มีอาการ'])
  expect([th.report.askFound, th.report.askSource, th.report.skip]).toEqual(['เจออะไร?', 'รู้จากไหน?', 'ไม่ส่ง แค่หาที่รักษา'])
  expect(th.care.anyAge).toBe('ทุกวัยตรวจได้')
  expect(th.map.sheet.from).toBe('จากรายงานผู้ใช้ · ไม่ใช่ที่ติดเชื้อ')
})
it('uses none of the banned words anywhere in the copy or the advice', () => {
  const groups: (DiseaseGroup | null)[] = [null, 'mpox', 'gono_chlam', 'syphilis', 'hiv']
  const bands: ExposureBand[] = ['h72', 'w2', 'w4', 'm3', 'older']
  const all = strings(th)
  for (const g of groups) for (const t of [1, 2] as const) for (const b of bands) strings(adviceFor(g, t, b), all)
  expect(all.length).toBeGreaterThan(40)
  for (const s of all) for (const w of BANNED_WORDS) expect(s).not.toContain(w)
})
it('calls every area a เขต once areas are districts', () => {
  expect(JSON.stringify(th)).not.toContain('ย่าน')
})
it('says on the privacy page that a report carries a kind, a district and a week, and that the phone keeps its district', () => {
  const leaves = th.privacy.leaves.join(' ')
  expect(leaves).toContain('มีอาการ')
  expect(leaves).toContain('เขตที่คุณเลือก')
  expect(th.privacy.phone).toContain('เขตที่ใช้ครั้งล่าสุด')
})
it('names the below-threshold state without saying that anyone reported', () => {
  expect(th.map.state.below_threshold).toBe('ยังไม่ถึงเกณฑ์')
  expect(th.map.stateHint.below_threshold).toBe('ยังไม่ถึงเกณฑ์ จึงไม่แสดงระดับ')
  expect(BANNED_WORDS).toContain('เขตปลอดภัย')
})

it('names symptoms as their own answer and their own layer on the map, apart from confirmed results', () => {
  expect(th.report.found.symptoms).toBe('มีอาการ ยังไม่ตรวจ')
  expect(th.layers.symptoms).toBe('มีอาการ')
  expect(th.layers.confirmed).toBe('ผลยืนยัน')
})
it('never calls an area a โซน either', () => {
  expect(JSON.stringify(th)).not.toContain('โซน')
})
it('lists on the privacy page that the phone keeps when it may next send a check-in or symptoms', () => {
  expect(th.privacy.phone).toContain('"มีอาการ"')
  expect(th.privacy.phone).toContain('ลบเองเมื่อถึงสัปดาห์นั้น')
})

it('writes no emoji character in the copy, so every emoji is a bundled picture (guard: passes from the start)', () => {
  // ©, ® and ™ count as pictographs in Unicode, but they are text symbols here (the map credit).
  for (const s of strings(th)) expect(s).not.toMatch(/(?![©®™])\p{Extended_Pictographic}/u)
})
it('calls the self-care tab ของฉัน wherever the copy points to it', () => {
  expect(th.nav.me).toBe('ของฉัน')
  expect(th.me.title).toBe('ของฉัน')
  for (const s of strings(th)) expect(s).not.toContain('"ดูแลตัวเอง"')
})
it('lists the layer switches among what the phone keeps', () => {
  expect(th.privacy.phone).toContain('ชั้นแผนที่')
})
it('has no check-in, send-signal or age-limit words left in the copy', () => {
  for (const s of strings(th)) {
    expect(s).not.toContain('เช็กอิน')
    expect(s).not.toContain('ส่งสัญญาณ')
    expect(s).not.toMatch(/อายุ\s*20|20 ปี/)
  }
})
it('puts no ปลอดภัย on a button', () => {
  for (const s of [th.notify.safeYes, th.home.clear, th.home.found, ...Object.values(th.report.found)]) expect(s).not.toContain('ปลอดภัย')
})

// What leaves the phone stays true on the privacy page (spec 3): the pharmacy file is ours, and นำทาง hands one place to Google only when pressed.
it('says on the privacy page that the pharmacy list comes from our server and that นำทาง hands the place to Google', () => {
  expect(th.privacy.leaves.join(' ')).toContain('รายชื่อร้านยา')
  expect(th.privacy.leaves.at(-1)).toContain('Google')
  expect(th.privacy.leaves.at(-1)).toContain(th.care.directions)
})

it('says on the privacy page that a place’s source link opens that site, such as OpenStreetMap, only when pressed', () => {
  expect(th.privacy.leaves.some((line) => line.includes(`"${th.care.source}"`) && line.includes('OpenStreetMap'))).toBe(true)
})

// Following a district (redesign spec 5.11): /privacy says what it keeps, where, and that the push carries nothing.
it('says on the privacy page what following a district keeps, where, and that the weekly push carries nothing', () => {
  expect(th.privacy.phone).toContain('เขตที่ติดตาม')
  expect(th.privacy.kept.join(' ')).toContain('ที่อยู่สำหรับส่งแจ้งเตือน')
  const leaves = th.privacy.leaves.join(' ')
  for (const word of ['Apple', 'Google', 'Microsoft', 'Mozilla', 'ไม่ส่งเขต']) expect(leaves, word).toContain(word)
  // A logged path now also tells starting or stopping to follow, never which district.
  expect(th.privacy.vercelLogs).toContain('ติดตามเขต')
  expect(th.privacy.leaves.at(-1)).toContain(th.care.directions)
})

it('says on the privacy page that contact links and guidance sources open their sites only when pressed', () => {
  expect(th.privacy.leaves.some((line) => line.includes('Google Maps') && line.includes('ที่มาของคำแนะนำ'))).toBe(true)
  expect(th.privacy.leaves.at(-1)).toContain(th.care.directions)
})
