/**
 * Every sentence of clinical advice the app shows, in one register. Each is general guidance, not a
 * diagnosis, and names the public page that backs it: a publisher on SOURCE_HOSTS (2026-11-18
 * design, decision 2). A sentence its page does not support is reworded to match the page, not kept.
 * The launch check refuses a text without such a source.
 */
export interface Source {
  name: string
  url: string
}
export interface ClinicalText {
  id: string
  text: string
  source: Source
  /** For a re-test schedule: days after contact. */
  days?: number[]
}

/** The publishers a source may come from: the host is one of these or ends in "." and one of these. */
export const SOURCE_HOSTS: readonly string[] = ['moph.go.th', 'who.int', 'cdc.gov', 'aidsid.or.th', 'trcarc.org', 'mahidol.ac.th', 'chula.ac.th']

// Each page was read on 18 Nov 2026; the line each sentence rests on is in the plan's ledger.
const CDC_PEP: Source = { name: 'CDC: แนวทางการให้ยา PEP', url: 'https://www.cdc.gov/hivnexus/hcp/pep/index.html' }
const CDC_HIV_TEST: Source = { name: 'CDC: การตรวจเอชไอวี', url: 'https://www.cdc.gov/hiv/testing/index.html' }
const CDC_PREP: Source = { name: 'CDC: PrEP', url: 'https://www.cdc.gov/hiv/prevention/prep.html' }
const WHO_HIV: Source = { name: 'WHO: เอชไอวีและเอดส์', url: 'https://www.who.int/news-room/fact-sheets/detail/hiv-aids' }
const WHO_MPOX: Source = { name: 'WHO: ฝีดาษวานร', url: 'https://www.who.int/news-room/fact-sheets/detail/mpox' }
const CDC_GC: Source = { name: 'CDC: แนวทางรักษาหนองใน', url: 'https://www.cdc.gov/std/treatment-guidelines/gonorrhea-adults.htm' }
const CDC_CT: Source = { name: 'CDC: แนวทางรักษาคลามิเดีย', url: 'https://www.cdc.gov/std/treatment-guidelines/chlamydia.htm' }
const WHO_STI: Source = { name: 'WHO: โรคติดต่อทางเพศสัมพันธ์', url: 'https://www.who.int/news-room/fact-sheets/detail/sexually-transmitted-infections-(stis)' }
const CDC_SYPH: Source = { name: 'CDC: แนวทางรักษาซิฟิลิส', url: 'https://www.cdc.gov/std/treatment-guidelines/syphilis.htm' }
const CDC_SYPH_ABOUT: Source = { name: 'CDC: เกี่ยวกับซิฟิลิส', url: 'https://www.cdc.gov/syphilis/about/index.html' }

const text = (id: string, words: string, source: Source, days?: number[]): ClinicalText => (days ? { id, text: words, source, days } : { id, text: words, source })

const REGISTER: ClinicalText[] = [
  text('advice.unnamed.h72.title', "ควรไปวันนี้", CDC_PEP),
  text('advice.unnamed.h72.go', "ไปจุดบริการวันนี้ ถ้าไปได้", CDC_PEP),
  text('advice.unnamed.h72.tell', "บอกเจ้าหน้าที่ว่าความเสี่ยงเกิดขึ้นไม่เกิน 72 ชั่วโมง เพราะการป้องกันบางอย่างต้องเริ่มภายในช่วงนี้", CDC_PEP),
  text('advice.unnamed.title', "มีคนชวนคุณไปตรวจสุขภาพ", CDC_CT),
  text('advice.unnamed.tier1', "ไปตรวจที่จุดบริการใกล้คุณเร็วๆ นี้", CDC_CT),
  text('advice.unnamed.tier2', "ไปตรวจที่จุดบริการในวันที่สะดวก", CDC_CT),
  text('advice.unnamed.recent', "ถ้าเพิ่งมีความเสี่ยงไม่เกิน 72 ชั่วโมง ให้ไปวันนี้และบอกเจ้าหน้าที่", CDC_PEP),
  text('advice.hiv.h72.title', "เอชไอวี: ยังอยู่ในช่วง 72 ชั่วโมง", CDC_PEP),
  text('advice.hiv.h72.pep', "ไปรับยาป้องกันหลังสัมผัส (PEP) ให้เร็วที่สุด ภายใน 72 ชั่วโมงหลังความเสี่ยง", CDC_PEP),
  text('advice.hiv.h72.baseline', "ตรวจเลือดตั้งต้นที่จุดบริการเดียวกัน โดยไม่ต้องรอผลก่อนเริ่มยา", CDC_PEP),
  text('advice.hiv.h72.retest', "ตรวจซ้ำที่ 6 สัปดาห์ และ 3 เดือน", CDC_PEP),
  text('advice.hiv.title', "เอชไอวี", CDC_HIV_TEST),
  text('advice.hiv.test', "ตรวจเอชไอวีตอนนี้ แล้วตรวจซ้ำที่ 6 สัปดาห์ และ 3 เดือน", CDC_HIV_TEST),
  text('advice.hiv.window', "ผลที่ตรวจไม่เจอในช่วงแรกยังไม่ใช่ข้อสรุป ให้ตรวจซ้ำตามนัด", CDC_HIV_TEST),
  text('advice.hiv.prep', "ถามเจ้าหน้าที่เรื่อง PrEP ถ้ามีความเสี่ยงต่อเนื่อง", CDC_PREP),
  text('advice.mpox.title', "ฝีดาษวานร", WHO_MPOX),
  text('advice.mpox.watch21', "สังเกตอาการ 21 วันนับจากวันที่สัมผัสครั้งล่าสุด เช่น ไข้ ผื่น หรือตุ่ม", WHO_MPOX),
  text('advice.mpox.ifSymptomsIsolate', "ถ้ามีอาการ ให้ไปพบแพทย์ และเลี่ยงการสัมผัสใกล้ชิดกับผู้อื่น รวมถึงคนในบ้าน", WHO_MPOX),
  text('advice.mpox.vaccine', "วัคซีนหลังสัมผัสควรได้ภายใน 4 วัน และยังให้ได้ถึง 14 วันถ้ายังไม่มีอาการ ถามจุดบริการเรื่องสิทธิและราคาก่อนไป", WHO_MPOX),
  text('advice.mpox.watch', "สังเกตอาการ 21 วัน เช่น ไข้ ผื่น หรือตุ่ม", WHO_MPOX),
  text('advice.mpox.ifSymptoms', "ถ้ามีอาการ ให้ไปพบแพทย์", WHO_MPOX),
  text('advice.gc.title', "หนองในและคลามิเดีย", CDC_GC),
  text('advice.gc.treat', "ไปรับการตรวจและรักษาที่คลินิก แม้ยังไม่มีอาการ", CDC_GC),
  text('advice.gc.noSelfMeds', "ไม่ซื้อยาปฏิชีวนะกินเอง หนองในดื้อยามากขึ้น การรักษาที่ได้ผลต้องทำที่คลินิก", WHO_STI),
  text('advice.gc.abstain', "งดมีเพศสัมพันธ์ 7 วันหลังรับยา และจนกว่าคู่จะได้รับการรักษาด้วย", CDC_GC),
  text('advice.gc.test', "ไปตรวจที่คลินิกและบอกว่าได้รับแจ้งจากคู่ แพทย์อาจให้ยาไปพร้อมกันโดยไม่ต้องรอผล", CDC_GC),
  text('advice.syph.title', "ซิฟิลิส", CDC_SYPH),
  text('advice.syph.treat', "ถ้าสัมผัสไม่เกิน 90 วัน ให้ไปรับการรักษาที่คลินิก แม้ผลเลือดปกติ เพราะช่วงแรกอาจยังตรวจไม่พบ", CDC_SYPH),
  text('advice.syph.blood', "เจาะเลือดตรวจซิฟิลิสตอนนี้", CDC_SYPH),
  text('advice.syph.abstain', "คุณติดซ้ำได้ถ้าคู่ยังไม่ได้ตรวจและรักษา ชวนคู่ไปตรวจด้วย", CDC_SYPH_ABOUT),
  text('advice.syph.sores', "แผลหรือผื่นอาจหายไปเอง แต่ยังต้องรักษา ให้ไปพบแพทย์", CDC_SYPH_ABOUT),
  text('help.pep', "ยาป้องกันหลังสัมผัส (PEP) ต้องเริ่มให้เร็วที่สุด และไม่เกิน 72 ชั่วโมง", CDC_PEP),
  text('help.mpoxVaccine', "ควรได้ภายใน 4 วันหลังสัมผัส และยังให้ได้ถึง 14 วันถ้ายังไม่มีอาการ สิทธิและราคาต่างกันตามจุดบริการ ให้ถามก่อนไป", WHO_MPOX),
  text('recipient.hiv.plhiv', "กินยาต่อเนื่องตามปกติ เมื่อตรวจไม่เจอเชื้อ คุณไม่ถ่ายทอดเชื้อทางเพศสัมพันธ์ ไม่ต้องทำอะไรเพิ่มจากข้อความนี้", WHO_HIV),
  text('recipient.hiv.prep', "กินต่อเนื่องและตรวจตามนัดปกติ บอกเจ้าหน้าที่ในนัดถัดไปว่าได้รับข้อความนี้", CDC_PREP),
  text('recipient.hiv.within72', "ไปรับยา PEP ให้เร็วที่สุด และตรวจเลือดตั้งต้นที่จุดบริการเดียวกัน", CDC_PEP),
  text('recipient.hiv.later', "ตรวจตอนนี้ แล้วตรวจซ้ำที่ 6 สัปดาห์ และ 3 เดือน", CDC_HIV_TEST),
  text('recipient.pregnancy', "ถ้าคุณตั้งครรภ์หรือให้นมบุตร ให้บอกเจ้าหน้าที่ เพราะการเลือกยาอาจต่างออกไป", CDC_PEP),
  text('recipient.fullPanel', "ขอตรวจโรคติดต่อทางเพศสัมพันธ์แบบครบชุด และบอกเจ้าหน้าที่ว่าได้รับแจ้งจากคู่", CDC_CT),
  text('retest.syphilis', "ตรวจเลือดอีกครั้งเมื่อครบ 90 วันหลังสัมผัส ถ้ายังไม่ได้รับการรักษา", CDC_SYPH, [90]),
  text('retest.gono_chlam', "ตรวจซ้ำประมาณ 3 เดือนหลังรักษา", CDC_GC, [90]),
  text('retest.mpox', "เฝ้าอาการ 21 วันหลังสัมผัส", WHO_MPOX, [21]),
  text('retest.hiv', "ตรวจซ้ำ 6 สัปดาห์และ 3 เดือนหลังสัมผัส", CDC_HIV_TEST, [42, 90]),
  text('retest.none', "ตรวจซ้ำ 6 สัปดาห์และ 3 เดือนหลังสัมผัส", CDC_HIV_TEST, [42, 90]),
]

const BASE: Record<string, ClinicalText> = Object.fromEntries(REGISTER.map((t) => [t.id, t]))
/** The register as the app reads it. Tests may lay other entries over it. */
export let CLINICAL: Record<string, ClinicalText> = BASE

export function setClinicalForTest(over: Record<string, ClinicalText> | null): void {
  CLINICAL = over ? { ...BASE, ...over } : BASE
}

export function clinical(id: string): ClinicalText {
  const entry = CLINICAL[id]
  if (!entry) throw new Error(`no clinical text "${id}"`)
  return entry
}

/** The pages behind these sentences, each once, in the order the sentences first use them. */
export function sourcesOf(...ids: string[]): Source[] {
  const seen = new Map<string, Source>()
  for (const id of ids) {
    const { source } = clinical(id)
    if (!seen.has(source.url)) seen.set(source.url, source)
  }
  return [...seen.values()]
}
