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

export function ClinicShell() {
  const to = useEmbedTo()
  const { staff } = usePartyStore(clinic)
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col md:flex-row">
      <aside className="shrink-0 border-b border-line bg-surface md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 md:block">
          <Wordmark size={18} />
          <p className="text-[13px] text-muted md:mt-1">{th.clinic.title}</p>
        </div>
        <nav aria-label={th.clinic.title} className="flex gap-1 overflow-x-auto p-2 md:flex-col md:p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.path}
              to={to(item.path)}
              end={item.end}
              className={({ isActive }) => `flex min-h-11 shrink-0 items-center rounded-md px-3 text-[15px] ${isActive ? 'bg-care-soft font-semibold text-care-ink' : 'text-ink hover:bg-bg'}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-2 border-t border-line px-4 py-3 text-[13px] md:flex">
          <ShieldCheck size={18} strokeWidth={1.75} className="shrink-0 text-care" aria-hidden="true" />
          <span>
            <span className="block font-medium">{staff}</span>
            <span className="text-muted">{th.clinic.twoFactor}</span>
          </span>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="issue" element={<IssueCode />} />
          <Route path="results" element={<Results />} />
          <Route path="batch" element={<WeeklyBatch />} />
          <Route path="fast-track" element={<FastTrack />} />
          <Route path="assist" element={<AssistedNotify />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  )
}
