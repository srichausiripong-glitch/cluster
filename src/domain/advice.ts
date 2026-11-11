import type { Advice, DiseaseGroup, ExposureBand } from './types'

const SHOW_CODE = 'แสดงรหัสด้านล่างที่จุดบริการ ไม่ต้องอธิบายอะไร'

/**
 * Draft advice per disease group and tier, from spec section 6. Every sentence here
 * is shown under the label "ร่าง รอแพทย์ลงนาม" until a physician signs the content register.
 *
 * A link for contact within 72 hours always says "go today", whether or not it names a
 * disease. If only HIV links did, the urgency itself would name the disease.
 */
export function adviceFor(group: DiseaseGroup | null, tier: 1 | 2, band: ExposureBand, hasCode = true): Advice {
  if (group === null) {
    const code = hasCode ? [SHOW_CODE] : []
    if (band === 'h72') {
      return {
        title: 'ควรไปวันนี้',
        urgent: true,
        steps: ['ไปจุดบริการวันนี้ ถ้าไปได้', 'บอกเจ้าหน้าที่ว่าความเสี่ยงเกิดขึ้นไม่เกิน 72 ชั่วโมง เพราะการป้องกันบางอย่างต้องเริ่มภายในช่วงนี้', ...code],
      }
    }
    return {
      title: 'มีคนชวนคุณไปตรวจสุขภาพ',
      urgent: false,
      steps: [
        tier === 1 ? 'ไปตรวจที่จุดบริการใกล้คุณเร็วๆ นี้' : 'สังเกตอาการ และไปตรวจตามวันที่สะดวกภายในไม่กี่สัปดาห์',
        ...code,
        'ถ้าเพิ่งมีความเสี่ยงไม่เกิน 72 ชั่วโมง ให้ไปวันนี้และบอกเจ้าหน้าที่',
      ],
    }
  }
  if (group === 'hiv') {
    if (band === 'h72') {
      return {
        title: 'เอชไอวี: ยังอยู่ในช่วง 72 ชั่วโมง',
        urgent: true,
        steps: ['ไปรับยาป้องกันหลังสัมผัส (PEP) ให้เร็วที่สุด ภายใน 72 ชั่วโมงหลังความเสี่ยง', 'ตรวจเลือดตั้งต้นที่จุดบริการเดียวกัน', 'ตรวจซ้ำที่ 1 เดือน และ 3 เดือน'],
      }
    }
    return {
      title: 'เอชไอวี',
      urgent: false,
      steps: ['ตรวจเอชไอวีตอนนี้ แล้วตรวจซ้ำที่ 1 เดือน และ 3 เดือน', 'ผลที่ตรวจไม่เจอในช่วงแรกยังไม่ใช่ข้อสรุป ให้ตรวจซ้ำตามนัด', 'ถามเจ้าหน้าที่เรื่อง PrEP ถ้ามีความเสี่ยงต่อเนื่อง'],
    }
  }
  if (group === 'mpox') {
    return {
      title: 'ฝีดาษวานร',
      urgent: false,
      steps:
        tier === 1
          ? ['สังเกตอาการ 21 วันนับจากวันที่สัมผัสครั้งล่าสุด เช่น ไข้ ผื่น หรือตุ่ม', 'ถ้ามีอาการ ให้ไปพบแพทย์ และเลี่ยงการสัมผัสใกล้ชิดกับผู้อื่น รวมถึงคนในบ้าน', 'วัคซีนหลังสัมผัสได้ผลดีที่สุดภายใน 4 วัน และยังมีประโยชน์ถึง 14 วัน ถามจุดบริการเรื่องสิทธิและราคาก่อนไป']
          : ['สังเกตอาการ 21 วัน เช่น ไข้ ผื่น หรือตุ่ม', 'ถ้ามีอาการ ให้ไปพบแพทย์'],
    }
  }
  if (group === 'gono_chlam') {
    return {
      title: 'หนองในและคลามิเดีย',
      urgent: false,
      steps:
        tier === 1
          ? ['ไปรับการตรวจและรักษาที่คลินิก แม้ยังไม่มีอาการ', 'ไม่ซื้อยาปฏิชีวนะกินเอง การรักษาที่ได้ผลต้องทำที่คลินิก', 'งดมีเพศสัมพันธ์จนกว่าจะรักษาครบ 7 วัน']
          : ['ไปตรวจที่คลินิก ถ้ายังไม่ได้รับการรักษา ให้ตรวจตอนนี้และตรวจซ้ำอีกครั้งใน 14 วัน', 'ไม่ซื้อยาปฏิชีวนะกินเอง การรักษาที่ได้ผลต้องทำที่คลินิก'],
    }
  }
  // Syphilis: treat at once only for contact within three months (spec 6); older contact starts with a blood test.
  const treatNow = tier === 1 && band !== 'older'
  return {
    title: 'ซิฟิลิส',
    urgent: false,
    steps: treatNow
      ? ['ไปรับการรักษาที่คลินิกเลย แม้ผลเลือดปกติ เพราะช่วงแรกอาจยังตรวจไม่พบ', 'เจาะเลือดตอนนี้ และตรวจซ้ำที่ 12 สัปดาห์', 'งดมีเพศสัมพันธ์จนกว่าแพทย์จะบอกว่าพ้นระยะ']
      : ['เจาะเลือดตอนนี้ และตรวจซ้ำที่ 12 สัปดาห์', 'ถ้ามีแผลหรือผื่น ให้ไปพบแพทย์โดยไม่ต้องรอ'],
  }
}
