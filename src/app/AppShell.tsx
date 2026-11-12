import { LifeBuoy, List, Map as MapIcon, UserRound } from 'lucide-react'
import { Route, Routes } from 'react-router-dom'
import { th } from '../copy/th'
import { Logo } from '../design/Logo'
import { CareList } from './CareList'
import { HarmReport } from './HarmReport'
import { HelpNow } from './HelpNow'
import { MapScreen } from './MapScreen'
import { NotifyFlow } from './NotifyFlow'
import { QuickExit } from './QuickExit'
import { ReportFlow } from './ReportFlow'
import { SelfCare } from './SelfCare'
import { GoNav } from './Go'
import { useEnvelope } from '../envelope/useEnvelope'

const NAV = [
  { path: '/app', label: th.nav.map, icon: MapIcon, end: true },
  { path: '/app/list', label: th.nav.list, icon: List, end: false },
  { path: '/app/me', label: th.nav.me, icon: UserRound, end: false },
  { path: '/app/help', label: th.nav.help, icon: LifeBuoy, end: false },
]

export function AppShell() {
  useEnvelope()

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
        {NAV.map(({ path, label, icon: Icon, end }) => (
          <GoNav key={path} to={path} end={end} className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 text-[12px] text-ink ${isActive ? 'font-bold' : 'font-medium'}`}>
            {({ isActive }) => (
              <>
                {/* The current tab is told by a filled shape round its icon, not by colour alone. */}
                <span data-active-pill={isActive ? '' : undefined} className={`grid h-7 w-12 place-items-center rounded-full border-2 ${isActive ? 'border-ink bg-care shadow-pop' : 'border-transparent'}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
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
