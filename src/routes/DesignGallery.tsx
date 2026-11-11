import { Check } from 'lucide-react'
import { useState } from 'react'
import { SendSignalLink } from '../app/SendSignalLink'
import { ALERT, NOTE, PRIMARY_LINK, QUIET_LINK, SOFT } from '../design/look'
import { Banner } from '../design/primitives/Banner'
import { Button } from '../design/primitives/Button'
import { Card } from '../design/primitives/Card'
import { Chip } from '../design/primitives/Chip'
import { Sheet } from '../design/primitives/Sheet'
import { Stepper } from '../design/primitives/Stepper'
import { Logo } from '../design/Logo'
import { DotSwatch, EdgeSample, PinMark, QuietSwatch } from '../map/legend'

const SWATCHES = [
  ['bg', 'พื้นหน้าจอ'], ['surface', 'พื้นกล่อง'], ['ink', 'เส้นขอบ ตัวอักษร'], ['muted', 'ตัวอักษรรอง'], ['line', 'เส้นคั่นแถว'],
  ['care', 'จุดบริการ ปุ่มหลัก'], ['care-soft', 'รายการที่เลือก'], ['yellow', 'กล่องสถานะ'], ['leaf', 'ป้ายบริการฟรี'],
  ['signal', 'สัญญาณ'], ['signal-edge', 'ขอบสัญญาณ'], ['signal-1', 'สัญญาณ อ่อน'], ['veil', 'ปิดใช้งาน'],
  ['land', 'พื้นเมือง'], ['land-out', 'นอกเมือง'], ['water', 'น้ำ'], ['park', 'สวน'],
] as const

export function DesignGallery() {
  const [open, setOpen] = useState(false)
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <Logo size={28} />
      <section>
        <h2 className="mb-3 text-[20px] font-bold">สี</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SWATCHES.map(([name, label]) => (
            <li key={name} className="box p-2">
              <div className="h-12 rounded-sm border-2 border-ink" style={{ background: `var(--color-${name})` }} />
              <div className="mt-1 text-[13px] font-semibold">{label}</div>
              <div className="text-[12px] text-muted">--color-{name}</div>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-3 text-[20px] font-bold">ตัวอักษร</h2>
        <p className="text-[32px] font-bold leading-tight">เราดูแลกัน 32</p>
        <p className="text-[24px] font-bold">หัวข้อหน้า 24</p>
        <p className="text-[20px] font-bold">หัวข้อส่วน 20</p>
        <p className="text-[17px]">ข้อความเด่น 17</p>
        <p className="text-[15px]">ข้อความทั่วไป 15 ภาษาไทยต้องมีระยะบรรทัดสูงพอสำหรับสระและวรรณยุกต์</p>
        <p className="text-[13px] text-muted">ข้อความรอง 13</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-[20px] font-bold">ปุ่มและป้าย</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>ไปต่อ</Button>
          <Button variant="secondary">ไว้ก่อน</Button>
          <Button variant="ghost">ดูจุดบริการ</Button>
          <Button size="lg">ปุ่มใหญ่</Button>
          <Button disabled>ยังเลือกไม่ครบ</Button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <SendSignalLink />
          <span className={`w-44 ${PRIMARY_LINK}`}>ลิงก์หลัก</span>
          <span className={`w-36 ${QUIET_LINK}`}>ลิงก์รอง</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="care">จุดบริการ</Chip>
          <Chip tone="signal">สัญญาณ</Chip>
          <Chip>ทางการ</Chip>
          <Chip tone="free">ฟรีตามสิทธิ</Chip>
          <Chip tone="now">กล่องสถานะ</Chip>
          <Chip tone="now" small>
            <Check size={12} strokeWidth={3} aria-hidden="true" />
            ตอนนี้
          </Chip>
          <Banner tone="draft">ร่าง รอแพทย์ลงนาม</Banner>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-[20px] font-bold">กล่อง</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="box p-3">กล่องขาว ขอบดำ 2 px สำหรับเนื้อหา</p>
          <p className={`p-3 ${NOTE}`}>กล่องหมายเหตุบนพื้นครีม กดไม่ได้จึงไม่มีเงา</p>
          <p className={`p-3 ${SOFT}`}>ชมพูอ่อน: รายการที่เลือก หรือคำตอบของสิ่งที่เพิ่งทำ</p>
          <p className={`p-3 font-semibold ${ALERT}`}>เหลือง: มีบางอย่างต้องดูอีกครั้ง ไม่ใช้สีแดง</p>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-[20px] font-bold">เครื่องหมายบนแผนที่</h2>
        <div className="flex flex-wrap items-center gap-3">
          <DotSwatch density="thin" />
          <DotSwatch density="medium" />
          <DotSwatch density="dense" />
          <EdgeSample step="new" />
          <EdgeSample step="followup" />
          <EdgeSample step="expiring" />
          <EdgeSample step="mixed" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <QuietSwatch state="below_threshold" />
          <QuietSwatch state="no_data" />
          <QuietSwatch state="no_partner" />
          <PinMark kind="clinic" />
          <PinMark kind="pharmacy" />
          <PinMark kind="lab" />
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-[20px] font-bold">การ์ด ขั้นตอน และแผ่นล่าง</h2>
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
