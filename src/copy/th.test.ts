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
  expect(th.demoBanner).toBe('ต้นแบบ ข้อมูลจำลอง')
  expect(th.draftClinical).toBe('ร่าง รอแพทย์ลงนาม')
  expect(th.map.step).toMatchObject({ new: 'เพิ่งรายงาน', followup: 'ช่วงติดตามผู้สัมผัส', expiring: 'ใกล้หมดอายุ', mixed: 'ผสม' })
  expect(th.map.state.below_threshold).toBe('ต่ำกว่าเกณฑ์')
  expect(th.clinic.underK).toBe('น้อยกว่า 10')
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
