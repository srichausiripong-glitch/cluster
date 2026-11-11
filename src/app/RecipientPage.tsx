import { CalendarPlus, Clock } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { th } from '../copy/th'
import { adviceFor } from '../domain/advice'
import { buildIcs } from '../domain/ics'
import { decodeNotice } from '../domain/link'
import type { DiseaseGroup } from '../domain/types'
import { Banner } from '../design/primitives/Banner'
import { Button } from '../design/primitives/Button'
import { Card } from '../design/primitives/Card'
import { Wordmark } from '../design/Wordmark'
import { orderedCarePoints } from '../store/seed'

/** Days until the suggested re-test, per disease group (spec 6). Draft, like all clinical content. */
const RETEST_DAYS: Record<DiseaseGroup | 'none', number[]> = { syphilis: [84], gono_chlam: [14], mpox: [21], hiv: [30, 90], none: [30] }
const HIV_BRANCHES = ['plhiv', 'prep', 'within72', 'later'] as const

function downloadCalendar(days: number[]) {
  const events = days.map((n) => ({ date: new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10) }))
  const url = URL.createObjectURL(new Blob([buildIcs(events)], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'reminder.ics'
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Where a self-sent link lands. The same page for every link; what it shows comes only
 * from the URL fragment, which no server receives. A fetch reveals nothing; detail appears
 * on an explicit tap, and the page can be reopened (spec 5.5).
 */
export function RecipientPage() {
  const notice = decodeNotice(useLocation().hash)
  const [revealed, setRevealed] = useState(false)
  const [branch, setBranch] = useState<(typeof HIV_BRANCHES)[number] | null>(null)
  const showDetail = notice === null || revealed
  const advice = notice ? adviceFor(notice.group, notice.tier, notice.band) : adviceFor(null, 2, 'w4')

  return (
    <main className="mx-auto w-full max-w-md space-y-4 p-4">
      <Wordmark size={18} />
      <h1 className="text-[24px] font-semibold">{th.recipient.genericTitle}</h1>
      <p className="text-muted">{th.recipient.intro}</p>

      {!showDetail && (
        <Button size="lg" className="w-full" onClick={() => setRevealed(true)}>
          {th.recipient.reveal}
        </Button>
      )}

      {showDetail && (
        <>
          <section className={`step-in rounded-md p-4 ${advice.urgent ? 'bg-urgent text-white' : 'border border-line bg-surface'}`}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {advice.urgent && <Clock size={20} strokeWidth={1.75} aria-hidden="true" />}
              {notice?.group && <h2 className="text-[20px] font-semibold">{advice.title}</h2>}
              <span className={advice.urgent ? 'rounded-sm border border-dashed border-white/70 px-2 py-0.5 text-[12px]' : ''}>
                {advice.urgent ? th.draftClinical : <Banner tone="draft">{th.draftClinical}</Banner>}
              </span>
            </div>
            {notice && (
              <p className={`text-[13px] ${advice.urgent ? 'text-white/85' : 'text-muted'}`}>
                {th.recipient.tier[notice.tier]} · {th.recipient.band}: {th.notify.bands[notice.band]}
              </p>
            )}
            <h3 className="mb-1 mt-3 text-[13px] font-medium">{th.recipient.todo}</h3>
            <ol className="list-decimal space-y-1 pl-5">
              {advice.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          {notice?.group === 'hiv' && (
            <Card>
              <h2 className="mb-2 font-semibold">{th.recipient.hivAsk}</h2>
              <div className="space-y-2">
                {HIV_BRANCHES.map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={branch === key}
                    onClick={() => setBranch(key)}
                    className={`flex min-h-11 w-full items-center rounded-md border px-3 py-2 text-left font-medium ${branch === key ? 'border-care bg-care-soft' : 'border-line bg-bg'}`}
                  >
                    {th.recipient.hiv[key].label}
                  </button>
                ))}
              </div>
              {branch && <p className="mt-3 rounded-md bg-care-soft p-3">{th.recipient.hiv[branch].advice}</p>}
            </Card>
          )}

          <p className="rounded-md border border-dashed border-muted p-3 text-[13px]">{th.recipient.pregnancy}</p>

          {notice && (
            <Card className="text-center">
              <h2 className="text-[13px] font-medium text-muted">{th.recipient.fastTrack}</h2>
              <p className="my-1 text-[32px] font-semibold tracking-[0.25em] text-care">{notice.code}</p>
              <p className="text-left text-[13px] text-muted">{th.recipient.fastTrackHint}</p>
            </Card>
          )}

          <Button variant="secondary" className="w-full" onClick={() => downloadCalendar(RETEST_DAYS[notice?.group ?? 'none'])}>
            <CalendarPlus size={18} strokeWidth={1.75} aria-hidden="true" />
            {th.recipient.calendar}
          </Button>

          <section>
            <h2 className="mb-2 font-semibold">{th.recipient.nearby}</h2>
            <div className="space-y-2">
              {orderedCarePoints().slice(0, 3).map((point) => (
                <div key={point.id} className="rounded-md border border-line bg-surface px-4 py-3">
                  <p className="font-semibold">{point.name}</p>
                  <p className="text-[13px] text-muted">{[point.hours, point.cost].filter(Boolean).join(' · ') || th.care.klassBNote}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
