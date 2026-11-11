import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEmbedTo } from '../app/embed'
import { th } from '../copy/th'
import { K } from '../domain/publication'
import { Chip } from '../design/primitives/Chip'
import { currentWeek } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { clinic, demo } from '../store/stores'
import { underK } from './format'

/** The clinic's week at a glance: what has been done, what is next, and each code with its state. */
export function Dashboard() {
  const to = useEmbedTo()
  const { codes, lastBatchWeek } = usePartyStore(clinic)
  usePartyStore(demo) // the demo's week can be moved forward from the stage
  const week = currentWeek()
  const mine = codes.filter((c) => c.week === week)
  const flagged = mine.filter((c) => c.positiveGroup).length
  const consented = mine.filter((c) => c.cityConsent).length
  // Figures under the threshold are never shown per clinic (spec 5.4), so they are said once, as a sentence.
  const summary =
    mine.length < K
      ? th.clinic.weekUnderK
      : th.clinic.weekSummary.replace('{issued}', String(mine.length)).replace('{flagged}', underK(flagged)).replace('{consented}', underK(consented))
  const next = [
    { to: '/clinic/issue', title: th.clinic.issue, status: null, primary: true },
    { to: '/clinic/results', title: th.clinic.nav.results, status: mine.some((c) => !c.positiveGroup) ? th.clinic.pendingSome : th.clinic.pendingNone, primary: false },
    { to: '/clinic/batch', title: th.clinic.sendBatch, status: lastBatchWeek === week ? th.clinic.batchSentShort : th.clinic.batchNotSent, primary: false },
  ]
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[24px] font-semibold">{th.clinic.nav.home}</h1>
        <p className="text-[13px] text-muted">{th.clinic.week}</p>
        <p className="mt-1">{summary}</p>
      </header>

      <section>
        <h2 className="mb-2 text-[17px] font-semibold">{th.clinic.next}</h2>
        <div className="space-y-2">
          {next.map((item) => (
            <Link
              key={item.to}
              to={to(item.to)}
              className={`flex min-h-14 items-center justify-between gap-3 rounded-md px-4 py-2 ${item.primary ? 'bg-care text-white' : 'border border-line bg-surface'}`}
            >
              <span>
                <span className="block font-semibold">{item.title}</span>
                {item.status && <span className="block text-[13px] text-muted">{item.status}</span>}
              </span>
              <ChevronRight size={20} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[17px] font-semibold">{th.clinic.codes}</h2>
        {mine.length === 0 ? (
          <p className="rounded-md border border-line bg-surface p-4 text-muted">{th.clinic.codesEmpty}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-line bg-surface">
            <table className="w-full text-left text-[15px]">
              <thead>
                <tr className="border-b border-line text-[13px] text-muted">
                  {[th.clinic.colCode, th.clinic.colResult, th.clinic.colCount].map((col) => (
                    <th key={col} scope="col" className="px-4 py-2 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...mine].reverse().slice(0, 8).map((code) => (
                  <tr key={code.id} className="border-b border-line align-top last:border-0">
                    <td className="px-4 py-3 font-semibold tracking-widest">{code.id}</td>
                    <td className="px-4 py-3">{code.positiveGroup ? th.group[code.positiveGroup] : <span className="text-muted">{th.clinic.noResult}</span>}</td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap gap-1">
                        {code.cityConsent ? <Chip tone="care">{th.clinic.consent}</Chip> : <Chip>{th.clinic.noConsent}</Chip>}
                        {code.appChecked && <Chip>{th.clinic.appChecked}</Chip>}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
