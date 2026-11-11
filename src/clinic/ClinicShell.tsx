import { ShieldCheck } from 'lucide-react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { useEmbedTo } from '../app/embed'
import { th } from '../copy/th'
import { Wordmark } from '../design/Wordmark'
import { usePartyStore } from '../store/partyStore'
import { clinic } from '../store/stores'
import { AssistedNotify } from './AssistedNotify'
import { Dashboard } from './Dashboard'
import { FastTrack } from './FastTrack'
import { IssueCode } from './IssueCode'
import { Results } from './Results'
import { WeeklyBatch } from './WeeklyBatch'

const NAV = [
  { path: '/clinic', label: th.clinic.nav.home, end: true },
  { path: '/clinic/issue', label: th.clinic.nav.issue, end: false },
  { path: '/clinic/results', label: th.clinic.nav.results, end: false },
  { path: '/clinic/batch', label: th.clinic.nav.batch, end: false },
  { path: '/clinic/fast-track', label: th.clinic.nav.fastTrack, end: false },
  { path: '/clinic/assist', label: th.clinic.nav.assist, end: false },
]

/**
 * The clinic console. A side menu on a wide screen; in a narrow one (such as the stage's
 * pane) the menu wraps onto rows, so no item is cut off, and the signed-in member of staff
 * stays visible at every width.
 */
export function ClinicShell() {
  const to = useEmbedTo()
  const { staff } = usePartyStore(clinic)
  return (
    <div className="flex w-full flex-1 flex-col md:flex-row">
      <aside className="shrink-0 border-b border-line bg-surface md:w-60 md:border-b-0 md:border-r">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 pt-3 md:block md:pt-4">
          <div className="flex items-baseline gap-2 md:block">
            <Wordmark size={18} />
            <p className="text-[13px] text-muted md:mt-1">{th.clinic.title}</p>
          </div>
          <p className="flex items-center gap-1.5 text-[12px] md:mt-3 md:text-[13px]">
            <ShieldCheck size={16} strokeWidth={1.75} className="shrink-0 text-care" aria-hidden="true" />
            <span>
              <span className="font-medium md:block">{staff}</span>
              <span className="md:hidden"> · </span>
              <span className="text-muted md:block">{th.clinic.twoFactor}</span>
            </span>
          </p>
        </div>
        <nav aria-label={th.clinic.title} className="flex flex-wrap gap-1 p-2 md:flex-col md:flex-nowrap md:p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.path}
              to={to(item.path)}
              end={item.end}
              className={({ isActive }) => `flex min-h-11 items-center rounded-md px-3 text-[15px] ${isActive ? 'bg-care-soft font-semibold text-care-ink' : 'text-ink hover:bg-bg'}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <div className="max-w-3xl">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="issue" element={<IssueCode />} />
            <Route path="results" element={<Results />} />
            <Route path="batch" element={<WeeklyBatch />} />
            <Route path="fast-track" element={<FastTrack />} />
            <Route path="assist" element={<AssistedNotify />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
