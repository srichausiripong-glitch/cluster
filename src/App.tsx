import { Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { RecipientPage } from './app/RecipientPage'
import { th } from './copy/th'
import { Banner } from './design/primitives/Banner'
import { DesignGallery } from './routes/DesignGallery'
import { Placeholder } from './routes/Placeholder'

export default function App() {
  const [params] = useSearchParams()
  // Panes inside the pitch stage are embedded; the stage itself carries the banner once.
  const embedded = params.get('embed') === '1'
  // The user app is a fixed-height shell (map, sheets, bottom nav); other pages scroll normally.
  const fixed = useLocation().pathname.startsWith('/app')
  return (
    <div className={`flex flex-col bg-bg text-ink ${fixed ? 'h-dvh overflow-hidden' : 'min-h-dvh'}`}>
      {!embedded && <Banner tone="demo">{th.demoBanner}</Banner>}
      <Routes>
        <Route path="/" element={<Placeholder title="เวทีสาธิต" />} />
        <Route path="/app/*" element={<AppShell />} />
        <Route path="/r" element={<RecipientPage />} />
        <Route path="/clinic/*" element={<Placeholder title="คอนโซลคลินิก" />} />
        <Route path="/operator" element={<Placeholder title="หลังบ้านผู้เผยแพร่" />} />
        <Route path="/data" element={<Placeholder title="ข้อมูลอยู่ที่ไหน" />} />
        <Route path="/design" element={<DesignGallery />} />
      </Routes>
    </div>
  )
}
