import { Route, Routes } from 'react-router-dom'
import { th } from '../copy/th'
import { Emoji } from '../design/Emoji'
import { Logo } from '../design/Logo'
import { CareList } from './CareList'
import { HarmReport } from './HarmReport'
import { HelpNow } from './HelpNow'
import { MapScreen } from './MapScreen'
import { NotifyFlow } from './NotifyFlow'
import { QuickExit } from './QuickExit'
import { ReportFlow } from './ReportFlow'
import { SelfCare } from './SelfCare'
import { GoNav, useGo } from './Go'
import { useEnvelope } from '../envelope/useEnvelope'
import { startLiveMap } from '../map/live'
import { reloadIfNewVersion } from './version'
import { useEffect } from 'react'

const NAV = [
  { path: '/app', label: th.nav.map, emoji: 'map', end: true },
  { path: '/app/list', label: th.nav.list, emoji: 'clipboard', end: false },
  { path: '/app/me', label: th.nav.me, emoji: 'smile', end: false },
  { path: '/app/help', label: th.nav.help, emoji: 'sos', end: false },
] as const

export function AppShell() {
  useEnvelope()
  useEffect(() => startLiveMap(), [])
  // An old tab reloads into the new version when it comes back into view.
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible') void reloadIfNewVersion()
    }
    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  }, [])
  // The weekly notification, tapped while the app is open: the followed district's sheet, in place of this page (redesign spec 5.11).
  const go = useGo()
  useEffect(() => {
    const worker = typeof navigator === 'undefined' ? undefined : navigator.serviceWorker
    if (!worker) return
    const open = (event: MessageEvent) => {
      if (event.data === 'cluster-follow') go('/app#follow')
    }
    worker.addEventListener('message', open)
    return () => worker.removeEventListener('message', open)
  }, [go])

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col bg-bg">
      <header className="flex h-[3.25rem] shrink-0 items-center justify-between border-b-[2.5px] border-ink px-3">
        <Logo size={18} />
        <QuickExit />
      </header>
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <Routes>
          <Route index element={<MapScreen />} />
          <Route path="list" element={<CareList />} />
          <Route path="help" element={<HelpNow />} />
          <Route path="report" element={<ReportFlow />} />
          <Route path="notify" element={<NotifyFlow />} />
          <Route path="me" element={<SelfCare />} />
          <Route path="harm" element={<HarmReport />} />
          <Route path="*" element={<MapScreen />} />
        </Routes>
      </div>
      <nav aria-label="เมนูหลัก" className="grid h-[3.75rem] shrink-0 grid-cols-4 border-t-[2.5px] border-ink bg-surface">
        {NAV.map(({ path, label, emoji, end }) => (
          <GoNav key={path} to={path} end={end} className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 text-[12px] text-ink ${isActive ? 'font-bold' : 'font-medium'}`}>
            {({ isActive }) => (
              <>
                {/* The current tab is told by a filled shape round its icon, not by colour alone. */}
                <span data-active-pill={isActive ? '' : undefined} className={`grid h-7 w-12 place-items-center rounded-full border-2 ${isActive ? 'border-ink bg-care shadow-pop' : 'border-transparent'}`}>
                  <Emoji name={emoji} size={22} />
                </span>
                {label}
              </>
            )}
          </GoNav>
        ))}
      </nav>
    </div>
  )
}
