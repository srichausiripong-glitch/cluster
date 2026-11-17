// Bangkok's 50 districts, the areas every report, count and map shape is about (redesign spec 5.5).
// Ids come from each district's English name; they go into envelopes and tables, so once the app is
// live they never change. Names are the Thai names without the word เขต. No imports: the server reads it.

export interface District {
  id: string
  name: string
}

/** In Thai alphabetical order, the order every list shows them in. */
export const DISTRICTS: readonly District[] = [
  { id: 'khlong_toei', name: 'คลองเตย' },
  { id: 'khlong_san', name: 'คลองสาน' },
  { id: 'khlong_sam_wa', name: 'คลองสามวา' },
  { id: 'khan_na_yao', name: 'คันนายาว' },
  { id: 'chatuchak', name: 'จตุจักร' },
  { id: 'chom_thong', name: 'จอมทอง' },
  { id: 'don_mueang', name: 'ดอนเมือง' },
  { id: 'din_daeng', name: 'ดินแดง' },
  { id: 'dusit', name: 'ดุสิต' },
  { id: 'taling_chan', name: 'ตลิ่งชัน' },
  { id: 'thawi_watthana', name: 'ทวีวัฒนา' },
  { id: 'thung_khru', name: 'ทุ่งครุ' },
  { id: 'thon_buri', name: 'ธนบุรี' },
  { id: 'bangkok_noi', name: 'บางกอกน้อย' },
  { id: 'bangkok_yai', name: 'บางกอกใหญ่' },
  { id: 'bang_kapi', name: 'บางกะปิ' },
  { id: 'bang_khun_thian', name: 'บางขุนเทียน' },
  { id: 'bang_khen', name: 'บางเขน' },
  { id: 'bang_kho_laem', name: 'บางคอแหลม' },
  { id: 'bang_khae', name: 'บางแค' },
  { id: 'bang_sue', name: 'บางซื่อ' },
  { id: 'bang_na', name: 'บางนา' },
  { id: 'bang_bon', name: 'บางบอน' },
  { id: 'bang_phlat', name: 'บางพลัด' },
  { id: 'bang_rak', name: 'บางรัก' },
  { id: 'bueng_kum', name: 'บึงกุ่ม' },
  { id: 'pathum_wan', name: 'ปทุมวัน' },
  { id: 'prawet', name: 'ประเวศ' },
  { id: 'pom_prap_sattru_phai', name: 'ป้อมปราบศัตรูพ่าย' },
  { id: 'phaya_thai', name: 'พญาไท' },
  { id: 'phra_khanong', name: 'พระโขนง' },
  { id: 'phra_nakhon', name: 'พระนคร' },
  { id: 'phasi_charoen', name: 'ภาษีเจริญ' },
  { id: 'min_buri', name: 'มีนบุรี' },
  { id: 'yan_nawa', name: 'ยานนาวา' },
  { id: 'ratchathewi', name: 'ราชเทวี' },
  { id: 'rat_burana', name: 'ราษฎร์บูรณะ' },
  { id: 'lat_krabang', name: 'ลาดกระบัง' },
  { id: 'lat_phrao', name: 'ลาดพร้าว' },
  { id: 'wang_thonglang', name: 'วังทองหลาง' },
  { id: 'watthana', name: 'วัฒนา' },
  { id: 'suan_luang', name: 'สวนหลวง' },
  { id: 'saphan_sung', name: 'สะพานสูง' },
  { id: 'samphanthawong', name: 'สัมพันธวงศ์' },
  { id: 'sathon', name: 'สาทร' },
  { id: 'sai_mai', name: 'สายไหม' },
  { id: 'nong_khaem', name: 'หนองแขม' },
  { id: 'nong_chok', name: 'หนองจอก' },
  { id: 'lak_si', name: 'หลักสี่' },
  { id: 'huai_khwang', name: 'ห้วยขวาง' },
]

export const DISTRICT_IDS: readonly string[] = DISTRICTS.map((d) => d.id)

/** The Thai name without the word เขต, or '' for an id that is not a district. */
export function districtName(id: string): string {
  return DISTRICTS.find((d) => d.id === id)?.name ?? ''
}

/** The Thai name as a sheet title shows it, "เขตบางรัก", or '' for an id that is not a district. */
export function districtLabel(id: string): string {
  const name = districtName(id)
  return name ? `เขต${name}` : ''
}
