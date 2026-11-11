import { useEffect, useRef } from 'react'
import { Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { RecipientPage } from './app/RecipientPage'
import { ClinicShell } from './clinic/ClinicShell'
import { DataPage } from './data/DataPage'
import { OperatorPage } from './operator/OperatorPage'
import { isoWeek } from './domain/weeks'
import { Stage } from './stage/Stage'
import { publishWeek, seedDemo } from './store/actions'
import { demo } from './store/stores'
import { th } from './copy/th'
import { Banner } from './design/primitives/Banner'
import { DesignGallery } from './routes/DesignGallery'

export default function App() {
  const [params] = useSearchParams()
  // Panes inside the pitch stage are embedded; the stage itself carries the banner once.
  const embedded = params.get('embed') === '1'
  // The user app is a fixed-height shell (map, sheets, bottom nav); other pages scroll normally.
  const fixed = useLocation().pathname.startsWith('/app')

  // Deep links for the presenter and for screenshots: ?seed=pilot|threshold and ?phase=2.
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    const seed = params.get('seed')
    if (seed === 'pilot' || seed === 'threshold') {
      seedDemo(seed)
      publishWeek(isoWeek(new Date()))
    }
    if (params.get('phase') === '2') demo.set({ phase: 2 })
  }, [params])
  return (
    <div className={`flex flex-col bg-bg text-ink ${fixed ? 'h-dvh overflow-hidden' : 'min-h-dvh'}`}>
      {!embedded && <Banner tone="demo">{th.demoBanner}</Banner>}
      <Routes>
        <Route path="/" element={<Stage />} />
        <Route path="/app/*" element={<AppShell />} />
        <Route path="/r" element={<RecipientPage />} />
        <Route path="/clinic/*" element={<ClinicShell />} />
        <Route path="/operator" element={<OperatorPage />} />
        <Route path="/data" element={<DataPage />} />
        <Route path="/design" element={<DesignGallery />} />
      </Routes>
    </div>
  )
}
