import { useState } from 'react'
import { Banner } from '../design/primitives/Banner'
import { Button } from '../design/primitives/Button'
import { Card } from '../design/primitives/Card'
import { Chip } from '../design/primitives/Chip'
import { Sheet } from '../design/primitives/Sheet'
import { Stepper } from '../design/primitives/Stepper'
import { Wordmark } from '../design/Wordmark'

const SWATCHES = [
  ['bg', 'พื้นกระดาษ'], ['surface', 'พื้นการ์ด'], ['ink', 'ตัวอักษร'], ['muted', 'ตัวอักษรรอง'], ['line', 'เส้น'],
  ['care', 'จุดบริการ'], ['care-soft', 'จุดบริการ อ่อน'], ['signal-1', 'สัญญาณ บาง'], ['signal-2', 'สัญญาณ ปานกลาง'],
  ['signal-3', 'สัญญาณ หนาแน่น'], ['signal-edge', 'ขอบสัญญาณ'], ['veil', 'ม่าน'], ['land', 'แผ่นดิน'], ['water', 'น้ำ'],
] as const

export function DesignGallery() {
  const [open, setOpen] = useState(false)
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <Wordmark size={28} />
      <section>
        <h2 className="mb-3 text-[20px] font-semibold">สี</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SWATCHES.map(([name, label]) => (
            <li key={name} className="box p-2">
              <div className="h-12 rounded-sm border-2 border-ink" style={{ background: `var(--color-${name})` }} />
              <div className="mt-1 text-[13px] font-medium">{label}</div>
              <div className="text-[12px] text-muted">--color-{name}</div>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-3 text-[20px] font-semibold">ตัวอักษร</h2>
        <p className="text-[32px] font-semibold leading-tight">เราดูแลกัน 32</p>
        <p className="text-[24px] font-semibold">หัวข้อหน้า 24</p>
        <p className="text-[20px] font-semibold">หัวข้อส่วน 20</p>
        <p className="text-[17px]">ข้อความเด่น 17</p>
        <p className="text-[15px]">ข้อความทั่วไป 15 ภาษาไทยต้องมีระยะบรรทัดสูงพอสำหรับสระและวรรณยุกต์</p>
        <p className="text-[13px] text-muted">ข้อความรอง 13</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-[20px] font-semibold">ปุ่มและป้าย</h2>
        <div className="flex flex-wrap gap-3">
          <Button>ส่งสัญญาณ</Button>
          <Button variant="secondary">ไว้ก่อน</Button>
          <Button variant="ghost">ดูจุดบริการ</Button>
          <Button size="lg">ไปต่อ</Button>
          <Button disabled>ยังเลือกไม่ครบ</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip tone="care">จุดบริการ</Chip>
          <Chip tone="signal">สัญญาณ</Chip>
          <Chip>ทางการ</Chip>
          <Banner tone="draft">ร่าง รอแพทย์ลงนาม</Banner>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-[20px] font-semibold">การ์ด ขั้นตอน และแผ่นล่าง</h2>
        <Card>
          <Stepper steps={['กลุ่มโรค', 'ที่มาของผล', 'สิ่งที่จะทำ', 'ใบรับ']} current={1} />
        </Card>
        <Button variant="secondary" onClick={() => setOpen(true)}>เปิดแผ่นล่าง</Button>
        <Sheet open={open} onClose={() => setOpen(false)} title="ตัวอย่างแผ่นล่าง">
          <p className="text-muted">แผ่นล่างเลื่อนขึ้นจากขอบจอ ส่วนแผนที่ยังมองเห็นอยู่ด้านหลัง</p>
        </Sheet>
      </section>
    </main>
  )
}
