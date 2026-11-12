/**
 * Every sentence of clinical advice the app shows, in one register. A sentence stays a draft, and
 * its block carries the label "ร่าง รอแพทย์ลงนาม", until a physician signs it here with name,
 * licence number and date (v1 spec 7.2). The launch check refuses to deploy while any is a draft.
 */
export interface ClinicalText {
  id: string
  text: string
  status: 'draft' | 'signed'
  signer?: string
  license?: string
  date?: string
  /** For a re-test schedule: days after contact. */
  days?: number[]
}

const draft = (id: string, text: string, days?: number[]): ClinicalText => (days ? { id, text, status: 'draft', days } : { id, text, status: 'draft' })

const REGISTER: ClinicalText[] = [
  draft('advice.unnamed.h72.title', "ควรไปวันนี้"),
  draft('advice.unnamed.h72.go', "ไปจุดบริการวันนี้ ถ้าไปได้"),
  draft('advice.unnamed.h72.tell', "บอกเจ้าหน้าที่ว่าความเสี่ยงเกิดขึ้นไม่เกิน 72 ชั่วโมง เพราะการป้องกันบางอย่างต้องเริ่มภายในช่วงนี้"),
  draft('advice.unnamed.title', "มีคนชวนคุณไปตรวจสุขภาพ"),
  draft('advice.unnamed.tier1', "ไปตรวจที่จุดบริการใกล้คุณเร็วๆ นี้"),
  draft('advice.unnamed.tier2', "สังเกตอาการ และไปตรวจตามวันที่สะดวกภายในไม่กี่สัปดาห์"),
  draft('advice.unnamed.recent', "ถ้าเพิ่งมีความเสี่ยงไม่เกิน 72 ชั่วโมง ให้ไปวันนี้และบอกเจ้าหน้าที่"),
  draft('advice.hiv.h72.title', "เอชไอวี: ยังอยู่ในช่วง 72 ชั่วโมง"),
  draft('advice.hiv.h72.pep', "ไปรับยาป้องกันหลังสัมผัส (PEP) ให้เร็วที่สุด ภายใน 72 ชั่วโมงหลังความเสี่ยง"),
  draft('advice.hiv.h72.baseline', "ตรวจเลือดตั้งต้นที่จุดบริการเดียวกัน"),
  draft('advice.hiv.h72.retest', "ตรวจซ้ำที่ 1 เดือน และ 3 เดือน"),
  draft('advice.hiv.title', "เอชไอวี"),
  draft('advice.hiv.test', "ตรวจเอชไอวีตอนนี้ แล้วตรวจซ้ำที่ 1 เดือน และ 3 เดือน"),
  draft('advice.hiv.window', "ผลที่ตรวจไม่เจอในช่วงแรกยังไม่ใช่ข้อสรุป ให้ตรวจซ้ำตามนัด"),
  draft('advice.hiv.prep', "ถามเจ้าหน้าที่เรื่อง PrEP ถ้ามีความเสี่ยงต่อเนื่อง"),
  draft('advice.mpox.title', "ฝีดาษวานร"),
  draft('advice.mpox.watch21', "สังเกตอาการ 21 วันนับจากวันที่สัมผัสครั้งล่าสุด เช่น ไข้ ผื่น หรือตุ่ม"),
  draft('advice.mpox.ifSymptomsIsolate', "ถ้ามีอาการ ให้ไปพบแพทย์ และเลี่ยงการสัมผัสใกล้ชิดกับผู้อื่น รวมถึงคนในบ้าน"),
  draft('advice.mpox.vaccine', "วัคซีนหลังสัมผัสได้ผลดีที่สุดภายใน 4 วัน และยังมีประโยชน์ถึง 14 วัน ถามจุดบริการเรื่องสิทธิและราคาก่อนไป"),
  draft('advice.mpox.watch', "สังเกตอาการ 21 วัน เช่น ไข้ ผื่น หรือตุ่ม"),
  draft('advice.mpox.ifSymptoms', "ถ้ามีอาการ ให้ไปพบแพทย์"),
  draft('advice.gc.title', "หนองในและคลามิเดีย"),
  draft('advice.gc.treat', "ไปรับการตรวจและรักษาที่คลินิก แม้ยังไม่มีอาการ"),
  draft('advice.gc.noSelfMeds', "ไม่ซื้อยาปฏิชีวนะกินเอง การรักษาที่ได้ผลต้องทำที่คลินิก"),
  draft('advice.gc.abstain', "งดมีเพศสัมพันธ์จนกว่าจะรักษาครบ 7 วัน"),
  draft('advice.gc.test', "ไปตรวจที่คลินิก ถ้ายังไม่ได้รับการรักษา ให้ตรวจตอนนี้และตรวจซ้ำอีกครั้งใน 14 วัน"),
  draft('advice.syph.title', "ซิฟิลิส"),
  draft('advice.syph.treat', "ไปรับการรักษาที่คลินิกเลย แม้ผลเลือดปกติ เพราะช่วงแรกอาจยังตรวจไม่พบ"),
  draft('advice.syph.blood', "เจาะเลือดตอนนี้ และตรวจซ้ำที่ 12 สัปดาห์"),
  draft('advice.syph.abstain', "งดมีเพศสัมพันธ์จนกว่าแพทย์จะบอกว่าพ้นระยะ"),
  draft('advice.syph.sores', "ถ้ามีแผลหรือผื่น ให้ไปพบแพทย์โดยไม่ต้องรอ"),
  draft('help.pep', "ยาป้องกันหลังสัมผัส (PEP) ต้องเริ่มให้เร็วที่สุด และไม่เกิน 72 ชั่วโมง"),
  draft('help.mpoxVaccine', "ได้ผลดีที่สุดภายใน 4 วันหลังสัมผัส และยังมีประโยชน์ถึง 14 วัน สิทธิและราคาต่างกันตามจุดบริการ ให้ถามก่อนไป"),
  draft('recipient.hiv.plhiv', "กินยาต่อเนื่องตามปกติ เมื่อตรวจไม่เจอเชื้อ คุณไม่ถ่ายทอดเชื้อทางเพศสัมพันธ์ ไม่ต้องทำอะไรเพิ่มจากข้อความนี้"),
  draft('recipient.hiv.prep', "กินต่อเนื่องและตรวจตามนัดปกติ บอกเจ้าหน้าที่ในนัดถัดไปว่าได้รับข้อความนี้"),
  draft('recipient.hiv.within72', "ไปรับยา PEP ให้เร็วที่สุด และตรวจเลือดตั้งต้นที่จุดบริการเดียวกัน"),
  draft('recipient.hiv.later', "ตรวจตอนนี้ แล้วตรวจซ้ำที่ 1 เดือน และ 3 เดือน"),
  draft('recipient.pregnancy', "ถ้าคุณตั้งครรภ์ ให้นมบุตร หรือมีเด็กที่อาจเกี่ยวข้อง ให้บอกเจ้าหน้าที่ทันที เพราะคำแนะนำต่างออกไป"),
  draft('recipient.fullPanel', "ขอตรวจโรคติดต่อทางเพศสัมพันธ์แบบครบชุด และบอกเจ้าหน้าที่ว่าได้รับแจ้งจากคู่"),
  draft('retest.syphilis', "ตรวจซ้ำ 12 สัปดาห์หลังสัมผัส", [84]),
  draft('retest.gono_chlam', "ตรวจซ้ำ 14 วันหลังสัมผัส", [14]),
  draft('retest.mpox', "เฝ้าอาการ 21 วันหลังสัมผัส", [21]),
  draft('retest.hiv', "ตรวจซ้ำ 1 เดือนและ 3 เดือนหลังสัมผัส", [30, 90]),
  draft('retest.none', "ตรวจซ้ำ 1 เดือนหลังสัมผัส", [30]),
]

const BASE: Record<string, ClinicalText> = Object.fromEntries(REGISTER.map((t) => [t.id, t]))
/** The register as the app reads it. Tests may lay signed entries over it. */
export let CLINICAL: Record<string, ClinicalText> = BASE

export function setClinicalForTest(over: Record<string, ClinicalText> | null): void {
  CLINICAL = over ? { ...BASE, ...over } : BASE
}

export function clinical(id: string): ClinicalText {
  const entry = CLINICAL[id]
  if (!entry) throw new Error(`no clinical text "${id}"`)
  return entry
}

/** Whether every one of these sentences has been signed. */
export function isSigned(...ids: string[]): boolean {
  return ids.every((id) => clinical(id).status === 'signed')
}
