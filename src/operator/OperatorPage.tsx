import { useState } from 'react'
import { th } from '../copy/th'
import { K, publishArea } from '../domain/publication'
import type { DiseaseGroup } from '../domain/types'
import { Button } from '../design/primitives/Button'
import { Card } from '../design/primitives/Card'
import { Wordmark } from '../design/Wordmark'
import { batchReports, currentWeek, publishWeek } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { demo, operator } from '../store/stores'

const underK = (n: number) => (n < K ? th.clinic.underK : String(n))

/** The publisher's back office: what would be published this week and why, complaints, and what is kept. */
export function OperatorPage() {
  const state = usePartyStore(operator)
  const [published, setPublished] = useState(false)
  usePartyStore(demo) // the demo's week can be moved forward from the stage
  const week = currentWeek()
  const preview = publishArea('bkk', batchReports(state.batches), week, true)
  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 p-4 md:p-6">
      <header>
        <Wordmark size={18} />
        <h1 className="mt-2 text-[24px] font-semibold">{th.operator.title}</h1>
      </header>

      <Card>
        <h2 className="font-semibold">{th.operator.preview}</h2>
        <p className="text-[13px] text-muted">{week}</p>
        <p className="mt-2 text-[17px] font-semibold">
          กรุงเทพฯ: {th.map.state[preview.state]}
          {preview.state === 'shown' && ` · ${th.map.density[preview.density ?? 'thin']} · ${th.map.step[preview.step ?? 'mixed']}`}
        </p>
        <p className="text-muted">{th.operator.why[preview.state]}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => {
              publishWeek(week)
              setPublished(true)
            }}
          >
            {th.operator.publish}
          </Button>
          {published && <span role="status">{th.operator.published}</span>}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">{th.operator.received}</h2>
        {state.batches.length === 0 ? (
          <p className="text-muted">{th.operator.receivedNone}</p>
        ) : (
          <ul className="space-y-1">
            {state.batches.map((batch) => (
              <li key={`${batch.clinicId}-${batch.week}`}>
                {batch.week}: {(Object.entries(batch.counts) as [DiseaseGroup, number][]).map(([g, n]) => `${th.group[g]} ${underK(n)}`).join(' · ') || th.data.empty}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <h2 className="mb-1 font-semibold">{th.operator.takedown}</h2>
          <p className="text-muted">{th.operator.takedownNone}</p>
          <p className="mt-2 text-[13px] text-muted">{th.operator.takedownRule}</p>
        </Card>
        <Card>
          <h2 className="mb-1 font-semibold">{th.operator.harmReports}</h2>
          {state.harmReports.length === 0 ? (
            <p className="text-muted">{th.operator.harmNone}</p>
          ) : (
            <ul className="space-y-1">
              {state.harmReports.map((report, i) => (
                <li key={`${report.at}-${i}`}>{th.harm.kinds[report.kind as keyof typeof th.harm.kinds] ?? report.kind}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section>
        <h2 className="mb-2 font-semibold">{th.operator.retention}</h2>
        <div className="overflow-x-auto rounded-md border border-line bg-surface">
          <table aria-label={th.operator.retention} className="w-full min-w-[420px] text-left text-[15px]">
            <tbody>
              {th.operator.retentionRows.map((row) => (
                <tr key={row.what} className="border-b border-line last:border-0">
                  <th scope="row" className="px-4 py-3 font-medium">
                    {row.what}
                  </th>
                  <td className="px-4 py-3 text-muted">{row.how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
