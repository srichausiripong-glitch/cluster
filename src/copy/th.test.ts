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
  expect(th.draftClinical).toBe('ร่าง รอแพทย์ลงนาม')
  expect(th.map.step).toMatchObject({ new: 'เพิ่งรายงาน', followup: 'ช่วงติดตามผู้สัมผัส', expiring: 'ใกล้หมดอายุ', mixed: 'ผสม' })
  // Redesign spec 5.5: a district below the threshold reads "ยังไม่ถึงเกณฑ์" whether it had none or a few.
  expect(th.map.state.below_threshold).toBe('ยังไม่ถึงเกณฑ์')
  expect(th.report.cta).toBe('ส่งสัญญาณ')
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

it('says the symptoms way can go to the map, apart from confirmed results', () => {
  expect(th.report.wayHint.symptoms).toBe('ส่งขึ้นแผนที่ของเขตได้ แยกจากผลยืนยัน และพาไปหาที่ตรวจ')
})
it('never calls an area a โซน either', () => {
  expect(JSON.stringify(th)).not.toContain('โซน')
})
it('lists on the privacy page that the phone keeps when it may next send a check-in or symptoms', () => {
  expect(th.privacy.phone).toContain('"มีอาการ"')
  expect(th.privacy.phone).toContain('ลบเองเมื่อถึงสัปดาห์นั้น')
})
