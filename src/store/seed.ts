import type { PublishedArea } from '../domain/types'

export interface CarePoint {
  id: string
  name: string
  kind: 'clinic' | 'hospital' | 'pharmacy' | 'lab'
  /** A: state or Red Cross, may show services, hours and cost. B: private or NGO clinic, name and place only (spec 5.2). */
  klass: 'A' | 'B'
  zoneId: string
  x: number
  y: number
  free: boolean
  community: boolean
  services?: string[]
  hours?: string
  cost?: string
  pep?: boolean
  verified?: string
  link?: string
}

export const ZONE_IDS = ['north', 'central', 'east', 'south', 'thon_north', 'thon_south'] as const

/** Fictional care points. Every name ends in "ตัวอย่าง"; none is a real facility. */
export const CARE_POINTS: CarePoint[] = [
  { id: 'cp1', name: 'ศูนย์บริการสาธารณสุขตัวอย่าง', kind: 'clinic', klass: 'A', zoneId: 'central', x: 490, y: 425, free: true, community: false, services: ['ตรวจเอชไอวี', 'ตรวจซิฟิลิส', 'ถุงยางอนามัย'], hours: 'จันทร์-ศุกร์ 08:00-16:00', cost: 'ฟรีตามสิทธิ', verified: '2026-11-03' },
  { id: 'cp2', name: 'คลินิกกาชาดตัวอย่าง', kind: 'clinic', klass: 'A', zoneId: 'south', x: 560, y: 615, free: true, community: false, services: ['ตรวจเอชไอวีและซิฟิลิส', 'PEP', 'PrEP'], hours: 'ทุกวัน 07:30-19:00', cost: 'ฟรีบางรายการ', pep: true, verified: '2026-11-05' },
  { id: 'cp3', name: 'โรงพยาบาลรัฐตัวอย่าง', kind: 'hospital', klass: 'A', zoneId: 'north', x: 545, y: 262, free: true, community: false, services: ['PEP นอกเวลาทำการ', 'ตรวจและรักษา'], hours: 'ห้องฉุกเฉิน 24 ชั่วโมง', cost: 'ตามสิทธิ', pep: true, verified: '2026-11-01' },
  { id: 'cp4', name: 'คลินิกชุมชนสีลมตัวอย่าง', kind: 'clinic', klass: 'B', zoneId: 'south', x: 680, y: 780, free: true, community: true, link: 'หน้าของคลินิก' },
  { id: 'cp5', name: 'ร้านยาชุมชนตัวอย่าง', kind: 'pharmacy', klass: 'A', zoneId: 'central', x: 640, y: 435, free: true, community: false, services: ['ชุดตรวจเอชไอวีด้วยตนเอง', 'ถุงยางอนามัย', 'ส่งต่อคลินิก'], hours: 'ทุกวัน 09:00-21:00', cost: 'ชุดตรวจฟรีตามสิทธิ', verified: '2026-10-28' },
  { id: 'cp6', name: 'ศูนย์สุขภาพฝั่งธนตัวอย่าง', kind: 'clinic', klass: 'A', zoneId: 'thon_north', x: 265, y: 400, free: true, community: false, services: ['ตรวจเอชไอวี', 'ตรวจซิฟิลิส'], hours: 'จันทร์-ศุกร์ 08:00-16:00', cost: 'ฟรีตามสิทธิ', verified: '2026-10-30' },
  { id: 'cp7', name: 'คลินิกเอกชนสุขุมวิทตัวอย่าง', kind: 'clinic', klass: 'B', zoneId: 'east', x: 800, y: 530, free: false, community: false, link: 'หน้าของคลินิก' },
  { id: 'cp8', name: 'แล็บตรวจเลือดตัวอย่าง', kind: 'lab', klass: 'B', zoneId: 'north', x: 715, y: 300, free: false, community: false, link: 'หน้าของแล็บ' },
  { id: 'cp9', name: 'ร้านยาบางแคตัวอย่าง', kind: 'pharmacy', klass: 'A', zoneId: 'thon_south', x: 255, y: 655, free: true, community: false, services: ['ชุดตรวจเอชไอวีด้วยตนเอง', 'ถุงยางอนามัย', 'ส่งต่อคลินิก'], hours: 'ทุกวัน 08:00-20:00', cost: 'ชุดตรวจฟรีตามสิทธิ', verified: '2026-10-27' },
]

/** Free and community services first; payment never changes the order (spec 5.2). */
export function orderedCarePoints(points: CarePoint[] = CARE_POINTS): CarePoint[] {
  const rank = (p: CarePoint) => (p.free && p.klass === 'A' ? 0 : p.community ? 1 : p.free ? 2 : 3)
  return [...points].sort((a, b) => rank(a) - rank(b))
}

/** Invented figures, shown under the label "ทางการ" to demonstrate the base layer. */
export const OFFICIAL_FIGURES = [
  { label: 'ซิฟิลิส กรุงเทพฯ', period: 'สัปดาห์ล่าสุด', value: 'เพิ่มขึ้นเล็กน้อยจากสัปดาห์ก่อน' },
  { label: 'ฝีดาษวานร ทั้งประเทศ', period: 'เดือนนี้', value: 'ทรงตัว' },
]

/** Zone-level preview for the "ตัวอย่างเฟส 2" switch. Not produced by the demo's clinic flow. */
export const PHASE2_AREAS: PublishedArea[] = [
  { areaId: 'south', state: 'shown', density: 'dense', step: 'new' },
  { areaId: 'central', state: 'shown', density: 'medium', step: 'followup' },
  { areaId: 'north', state: 'shown', density: 'thin', step: 'expiring' },
  { areaId: 'east', state: 'below_threshold', density: null, step: null },
  { areaId: 'thon_north', state: 'no_data', density: null, step: null },
  { areaId: 'thon_south', state: 'no_partner', density: null, step: null },
]
