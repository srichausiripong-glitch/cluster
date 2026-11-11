import { LifeBuoy, List, LogOut, Map as MapIcon, UserRound } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { th } from '../copy/th'
import { Wordmark } from '../design/Wordmark'
import { logConnection } from '../store/actions'
import { CareList } from './CareList'
import { useEmbedTo } from './embed'
import { HarmReport } from './HarmReport'
import { HelpNow } from './HelpNow'
import { MapScreen } from './MapScreen'
import { NotifyFlow } from './NotifyFlow'
import { ReportFlow } from './ReportFlow'
import { SelfCare } from './SelfCare'

const NAV = [
  { path: '/app', label: th.nav.map, icon: MapIcon, end: true },
  { path: '/app/list', label: th.nav.list, icon: List, end: false },
  { path: '/app/me', label: th.nav.me, icon: UserRound, end: false },
  { path: '/app/help', label: th.nav.help, icon: LifeBuoy, end: false },
]

/** Leaves the app at once for a blank page, for when someone looks over a shoulder (spec 9.4). */
function quickExit() {
  window.location.replace('about:blank')
}

export function AppShell() {
  const location = useLocation()
  const to = useEmbedTo()
  // What a web server would log for any page view: a time and a path, nothing about health.
  useEffect(() => {
    logConnection(location.pathname)
  }, [location.pathname])

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col bg-bg">
      <header className="flex h-12 shrink-0 items-center justify-between px-3">
        <Wordmark size={18} />
        <button type="button" onClick={quickExit} className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-[13px] font-medium text-muted hover:bg-surface">
          <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
          {th.common.quickExit}
        </button>
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
      <nav aria-label="เมนูหลัก" className="grid h-14 shrink-0 grid-cols-4 border-t border-line bg-surface">
        {NAV.map(({ path, label, icon: Icon, end }) => (
          <NavLink
            key={path}
            to={to(path)}
            end={end}
            className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 text-[12px] ${isActive ? 'font-semibold text-care' : 'text-muted'}`}
          >
            <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
