import { Route, Routes, useSearchParams } from 'react-router-dom'
import { Banner } from './design/primitives/Banner'
import { DesignGallery } from './routes/DesignGallery'
import { Placeholder } from './routes/Placeholder'

export default function App() {
  const [params] = useSearchParams()
  // Panes inside the pitch stage are embedded; the stage itself carries the banner once.
  const embedded = params.get('embed') === '1'
  return (
    <div className="min-h-dvh bg-bg text-ink">
      {!embedded && <Banner tone="demo">ต้นแบบ ข้อมูลจำลอง</Banner>}
      <Routes>
        <Route path="/" element={<Placeholder title="เวทีสาธิต" />} />
        <Route path="/app/*" element={<Placeholder title="แอปฝั่งผู้ใช้" />} />
        <Route path="/r" element={<Placeholder title="หน้าของผู้รับ" />} />
        <Route path="/clinic/*" element={<Placeholder title="คอนโซลคลินิก" />} />
        <Route path="/operator" element={<Placeholder title="หลังบ้านผู้เผยแพร่" />} />
        <Route path="/data" element={<Placeholder title="ข้อมูลอยู่ที่ไหน" />} />
        <Route path="/design" element={<DesignGallery />} />
      </Routes>
    </div>
  )
}
