import { useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { ErrorBoundary } from './app/ErrorBoundary'
import { RecipientPage } from './app/RecipientPage'
import { ClinicShell } from './clinic/ClinicShell'
import { DataPage } from './data/DataPage'
import { OperatorPage } from './operator/OperatorPage'
import { Stage } from './stage/Stage'
import { seedDemo } from './store/actions'
import { demo } from './store/stores'
import { th } from './copy/th'
import { Banner } from './design/primitives/Banner'
import { DesignGallery } from './routes/DesignGallery'

export default function App() {
  const [params, setParams] = useSearchParams()
  // Panes inside the pitch stage are embedded, and the stage carries the banner once. The banner
  // is dropped only inside a real frame, so adding ?embed=1 to a shared link cannot hide it.
  const embedded = params.get('embed') === '1' && window.self !== window.top
  // The user app is a fixed-height shell (map, sheets, bottom nav); other pages scroll normally.
  const location = useLocation()
  const fixed = location.pathname.startsWith('/app')

  // Deep links for the presenter and for screenshots: ?seed=pilot|threshold and ?phase=2.
  // They are used once and then dropped from the address, so a reload does not wipe the demo.
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    const seed = params.get('seed')
    const phase = params.get('phase')
    if (seed === 'pilot' || seed === 'threshold') seedDemo(seed)
    if (phase === '2') demo.update((s) => ({ ...s, phase: 2 }))
    if (seed !== null || phase !== null) {
      const rest = new URLSearchParams(params)
      rest.delete('seed')
      rest.delete('phase')
      setParams(rest, { replace: true })
    }
  }, [params, setParams])
  return (
    <div className={`flex flex-col bg-bg text-ink ${fixed ? 'h-dvh overflow-hidden' : 'min-h-dvh'}`}>
      {!embedded && <Banner tone="demo">{th.demoBanner}</Banner>}
      <ErrorBoundary>
        <Routes>
          {/* The address itself opens the app, as an app does. The pitch stage lives at /stage. */}
          <Route path="/" element={<Navigate to={{ pathname: '/app', search: location.search }} replace />} />
          <Route path="/stage" element={<Stage />} />
          <Route path="/app/*" element={<AppShell />} />
          <Route path="/r" element={<RecipientPage />} />
          <Route path="/clinic/*" element={<ClinicShell />} />
          <Route path="/operator" element={<OperatorPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/design" element={<DesignGallery />} />
        </Routes>
      </ErrorBoundary>
    </div>
  )
}
