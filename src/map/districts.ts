// Bangkok's 50 districts in the six zones. The map build draws each zone from these districts'
// outlines, and the zone pickers let someone who knows their district but not their zone find it.
// The list of districts in each zone was written from memory. Check it against the Bangkok
// Metropolitan Administration's announcement before real use.
export const DISTRICTS: Record<string, readonly string[]> = {
  central: ['พระนคร', 'ดุสิต', 'ป้อมปราบศัตรูพ่าย', 'สัมพันธวงศ์', 'ดินแดง', 'ห้วยขวาง', 'พญาไท', 'ราชเทวี', 'วังทองหลาง'],
  south: ['ปทุมวัน', 'บางรัก', 'สาทร', 'บางคอแหลม', 'ยานนาวา', 'คลองเตย', 'วัฒนา', 'พระโขนง', 'สวนหลวง', 'บางนา'],
  north: ['จตุจักร', 'บางซื่อ', 'ลาดพร้าว', 'หลักสี่', 'ดอนเมือง', 'สายไหม', 'บางเขน'],
  east: ['บางกะปิ', 'สะพานสูง', 'บึงกุ่ม', 'คันนายาว', 'ลาดกระบัง', 'มีนบุรี', 'หนองจอก', 'คลองสามวา', 'ประเวศ'],
  thon_north: ['ธนบุรี', 'คลองสาน', 'จอมทอง', 'บางกอกใหญ่', 'บางกอกน้อย', 'บางพลัด', 'ตลิ่งชัน', 'ทวีวัฒนา'],
  thon_south: ['ภาษีเจริญ', 'บางแค', 'หนองแขม', 'บางขุนเทียน', 'บางบอน', 'ราษฎร์บูรณะ', 'ทุ่งครุ'],
}

/** Every district with its zone, in Thai alphabetical order, for a picker. */
export const DISTRICT_LIST: readonly { name: string; zone: string }[] = Object.entries(DISTRICTS)
  .flatMap(([zone, names]) => names.map((name) => ({ name, zone })))
  .sort((a, b) => a.name.localeCompare(b.name, 'th'))
