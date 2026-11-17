import type { CarePointData } from '../data/carePoints'

/**
 * Made-up care points for tests and for the map build's clearance check. Every name ends in
 * "ตัวอย่าง"; none is a real facility, and they stand on real streets. They never ship.
 */
export const FIXTURE_POINTS: CarePointData[] = [
  { id: 'cp1', name: 'ศูนย์บริการสาธารณสุขตัวอย่าง', kind: 'clinic', layer: 'health_centre', klass: 'A', lat: 13.766536, lon: 100.538162, address: 'ที่อยู่สำหรับทดสอบ', source: 'https://example.org/care', fetched: '2026-10-20', free: true, community: false, services: ['ตรวจเอชไอวี', 'ตรวจซิฟิลิส', 'ถุงยางอนามัย'], hours: 'จันทร์-ศุกร์ 08:00-16:00', cost: 'ฟรีตามสิทธิ', verified: { date: '2026-11-03', by: 'ทีมทดสอบ', method: 'phone' } },
  { id: 'cp2', name: 'คลินิกกาชาดตัวอย่าง', kind: 'clinic', layer: 'sti', klass: 'A', lat: 13.7445, lon: 100.5465, address: 'ที่อยู่สำหรับทดสอบ', source: 'https://example.org/care', fetched: '2026-10-20', free: true, community: false, services: ['ตรวจเอชไอวีและซิฟิลิส', 'PEP', 'PrEP'], hours: 'ทุกวัน 07:30-19:00', cost: 'ฟรีบางรายการ', pep: true, verified: { date: '2026-11-05', by: 'ทีมทดสอบ', method: 'phone' } },
  { id: 'cp3', name: 'โรงพยาบาลรัฐตัวอย่าง', kind: 'hospital', layer: 'hospital', klass: 'A', lat: 13.86, lon: 100.625, address: 'ที่อยู่สำหรับทดสอบ', source: 'https://example.org/care', fetched: '2026-10-20', free: true, community: false, services: ['PEP นอกเวลาทำการ', 'ตรวจและรักษา'], hours: 'ห้องฉุกเฉิน 24 ชั่วโมง', cost: 'ตามสิทธิ', pep: true, verified: { date: '2026-11-01', by: 'ทีมทดสอบ', method: 'phone' } },
  { id: 'cp4', name: 'คลินิกชุมชนสีลมตัวอย่าง', kind: 'clinic', layer: 'sti', klass: 'B', lat: 13.7275, lon: 100.5325, address: 'ที่อยู่สำหรับทดสอบ', source: 'https://example.org/care', fetched: '2026-10-20', free: true, community: true, verified: { date: '2026-11-01', by: 'ทีมทดสอบ', method: 'visit' } },
  { id: 'cp5', name: 'ร้านยาชุมชนตัวอย่าง', kind: 'pharmacy', layer: 'pharmacy', klass: 'A', lat: 13.7605, lon: 100.5285, address: 'ที่อยู่สำหรับทดสอบ', source: 'https://example.org/care', fetched: '2026-10-20', free: true, community: false, services: ['ชุดตรวจเอชไอวีด้วยตนเอง', 'ถุงยางอนามัย', 'ส่งต่อคลินิก'], hours: 'ทุกวัน 09:00-21:00', cost: 'ชุดตรวจฟรีตามสิทธิ', verified: { date: '2026-10-28', by: 'ทีมทดสอบ', method: 'phone' } },
  { id: 'cp6', name: 'ศูนย์สุขภาพฝั่งธนตัวอย่าง', kind: 'clinic', layer: 'health_centre', klass: 'A', lat: 13.735, lon: 100.475, address: 'ที่อยู่สำหรับทดสอบ', source: 'https://example.org/care', fetched: '2026-10-20', free: true, community: false, services: ['ตรวจเอชไอวี', 'ตรวจซิฟิลิส'], hours: 'จันทร์-ศุกร์ 08:00-16:00', cost: 'ฟรีตามสิทธิ', verified: { date: '2026-10-30', by: 'ทีมทดสอบ', method: 'phone' } },
  { id: 'cp7', name: 'คลินิกเอกชนรามคำแหงตัวอย่าง', kind: 'clinic', layer: 'sti', klass: 'B', lat: 13.765, lon: 100.645, address: 'ที่อยู่สำหรับทดสอบ', source: 'https://example.org/care', fetched: '2026-10-20', free: false, community: false, verified: { date: '2026-11-01', by: 'ทีมทดสอบ', method: 'visit' } },
  { id: 'cp8', name: 'แล็บตรวจเลือดตัวอย่าง', kind: 'lab', layer: 'sti', klass: 'B', lat: 13.835, lon: 100.565, address: 'ที่อยู่สำหรับทดสอบ', source: 'https://example.org/care', fetched: '2026-10-20', free: false, community: false, verified: { date: '2026-11-01', by: 'ทีมทดสอบ', method: 'visit' } },
  { id: 'cp9', name: 'ร้านยาบางแคตัวอย่าง', kind: 'pharmacy', layer: 'pharmacy', klass: 'A', lat: 13.69, lon: 100.415, address: 'ที่อยู่สำหรับทดสอบ', source: 'https://example.org/care', fetched: '2026-10-20', free: true, community: false, services: ['ชุดตรวจเอชไอวีด้วยตนเอง', 'ถุงยางอนามัย', 'ส่งต่อคลินิก'], hours: 'ทุกวัน 08:00-20:00', cost: 'ชุดตรวจฟรีตามสิทธิ', verified: { date: '2026-10-27', by: 'ทีมทดสอบ', method: 'phone' } },
]

/**
 * Made-up points nobody has confirmed (redesign spec 5.8): one with every detail its data could
 * carry, which the app must not vouch for, and one with no phone and no address. Kept out of
 * FIXTURE_POINTS, which the map build's clearance check reads.
 */
export const FIXTURE_UNVERIFIED: CarePointData[] = [
  { id: 'cu1', name: 'ศูนย์บริการสาธารณสุขทดสอบตัวอย่าง', kind: 'clinic', layer: 'health_centre', klass: 'A', lat: 13.62, lon: 100.44, phone: '020000000', address: 'ที่อยู่สำหรับทดสอบ', source: 'https://example.org/care', fetched: '2026-11-17', free: false, community: false, services: ['ตรวจเอชไอวี'], hours: 'จันทร์-ศุกร์', pep: true, verified: null },
  { id: 'cu2', name: 'โรงพยาบาลทดสอบตัวอย่าง', kind: 'hospital', layer: 'hospital', klass: 'A', lat: 13.88, lon: 100.72, address: '', source: 'https://example.org/care', fetched: '2026-11-17', free: false, community: false, verified: null },
]

/** Made-up pharmacies as the pharmacy file gives them: not confirmed, read only when 💊 is on. */
export const FIXTURE_PHARMACIES: CarePointData[] = [
  { id: 'ph1', name: 'ร้านยาราชเทวีตัวอย่าง', kind: 'pharmacy', layer: 'pharmacy', klass: 'B', lat: 13.7545, lon: 100.5395, address: '', source: 'https://www.openstreetmap.org/node/1', fetched: '2026-11-17', free: false, community: false, verified: null },
  { id: 'ph2', name: 'ร้านยาบางกะปิตัวอย่าง', kind: 'pharmacy', layer: 'pharmacy', klass: 'B', lat: 13.779, lon: 100.638, phone: '021112222', address: '', source: 'https://www.openstreetmap.org/node/2', fetched: '2026-11-17', free: false, community: false, verified: null },
]
