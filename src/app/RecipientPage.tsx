import { CalendarPlus, Check as Tick, Clock } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { formatThaiDate } from '../copy/format'
import { th } from '../copy/th'
import { adviceFor } from '../domain/advice'
import { buildIcs } from '../domain/ics'
import { decodeNotice } from '../domain/link'
import type { DiseaseGroup } from '../domain/types'
import { PRESS, QUIET_LINK, SOFT, TEXT_LINK } from '../design/look'
import { Banner } from '../design/primitives/Banner'
import { Button } from '../design/primitives/Button'
import { Card } from '../design/primitives/Card'
import { Logo } from '../design/Logo'
import { CARE_POINTS, orderedCarePoints } from '../store/seed'
import { CarePointRow } from './CarePointRow'
import { CarePointSheet } from './CarePointSheet'
import { useEmbedTo } from './embed'
import { QuickExit } from './QuickExit'

/** Days until the suggested re-test, per disease group (spec 6). Draft, like all clinical content. */
const RETEST_DAYS: Record<DiseaseGroup | 'none', number[]> = { syphilis: [84], gono_chlam: [14], mpox: [21], hiv: [30, 90], none: [30] }
const HIV_BRANCHES = ['plhiv', 'prep', 'within72', 'later'] as const
type Branch = (typeof HIV_BRANCHES)[number]
const DAY = 86_400_000
/** The one place white text is allowed besides violet: the black "go today" block. */
const URGENT = 'bg-urgent text-white'

function downloadCalendar(days: number[]) {
  const events = days.map((n) => ({ date: new Date(Date.now() + n * DAY).toISOString().slice(0, 10) }))
  const url = URL.createObjectURL(new Blob([buildIcs(events)], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'reminder.ics'
  a.click()
  URL.revokeObjectURL(url)
}

/** The re-test date in words with a day count from today: the page's day counter (spec 5.5). */
function Retest({ days, tone }: { days: number[]; tone: string }) {
  return (
    <p className={`mt-3 text-[13px] ${tone}`}>
      <span className="font-bold">{th.recipient.retest}</span>{' '}
      {days.map((n) => `${formatThaiDate(new Date(Date.now() + n * DAY))} (${th.recipient.inDays.replace('{n}', String(n))})`).join(' · ')}
    </p>
  )
}

/**
 * Where a self-sent link lands. The same page for every link; what it shows comes only
 * from the URL fragment, which no server receives. A fetch reveals nothing; detail appears
 * on an explicit tap, and the page can be reopened (spec 5.5).
 */
export function RecipientPage() {
  // Keyed by the fragment: a second link opened in the same tab starts hidden again.
  const { hash } = useLocation()
  return <RecipientView key={hash} hash={hash} />
}

function RecipientView({ hash }: { hash: string }) {
  const to = useEmbedTo()
  const notice = decodeNotice(hash)
  const [revealed, setRevealed] = useState(false)
  const [branch, setBranch] = useState<Branch | null>(null)
  const [pointId, setPointId] = useState<string | null>(null)
  const showDetail = notice === null || revealed
  const namedHiv = notice?.group === 'hiv'
  const advice = notice ? adviceFor(notice.group, notice.tier, notice.band) : adviceFor(null, 2, 'w4', false)
  // The tier line ("watch for symptoms...") would contradict a same-day instruction, so an urgent notice shows the time only.
  const when = notice ? `${th.recipient.band}: ${th.notify.bands[notice.band]}` : null
  const meta = notice && !advice.urgent && !namedHiv ? `${th.recipient.tier[notice.tier]} · ${when}` : when
  const retestDays = RETEST_DAYS[notice?.group ?? 'none']

  // When time matters, the places that have PEP come first.
  const urgentCare = namedHiv ? branch === 'within72' : advice.urgent
  const ordered = orderedCarePoints()
  const points = (urgentCare ? [...ordered].sort((a, b) => Number(Boolean(b.pep)) - Number(Boolean(a.pep))) : ordered).slice(0, 3)

  return (
    <main className="mx-auto w-full max-w-md space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Logo size={18} />
        <QuickExit />
      </div>
      <h1 className="text-[24px] font-bold">{th.recipient.genericTitle}</h1>
      <p className="text-muted">{th.recipient.intro}</p>

      {!showDetail && (
        <Button size="lg" className="w-full" onClick={() => setRevealed(true)}>
          {th.recipient.reveal}
        </Button>
      )}

      {showDetail && (
        <>
          {namedHiv ? (
            // A named HIV notice asks first, then shows only the branch that applies (spec 6).
            <section className="step-in box p-4">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className="text-[20px] font-bold">{th.group.hiv}</h2>
                <Banner tone="draft">{th.draftClinical}</Banner>
              </div>
              <p className="text-[13px] text-muted">{meta}</p>
              <p className="mt-2">{th.recipient.hivLead}</p>
              <h3 className="mb-2 mt-3 font-bold">{th.recipient.hivAsk}</h3>
              <div className="space-y-2">
                {HIV_BRANCHES.map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={branch === key}
                    onClick={() => setBranch(key)}
                    className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-md border-2 border-ink px-3 py-2 text-left font-semibold ${PRESS} ${branch === key ? 'bg-care-soft' : 'bg-surface'}`}
                  >
                    {th.recipient.hiv[key].label}
                    {branch === key && <Tick size={18} strokeWidth={3} className="shrink-0" aria-hidden="true" />}
                  </button>
                ))}
              </div>
              {branch && (
                <div className={`step-in mt-4 p-3 ${branch === 'within72' ? `rounded-md ${URGENT}` : SOFT}`}>
                  <p className="flex items-start gap-2">
                    {branch === 'within72' && <Clock size={20} strokeWidth={2} className="mt-0.5 shrink-0 text-yellow" aria-hidden="true" />}
                    {th.recipient.hiv[branch].advice}
                  </p>
                  {(branch === 'within72' || branch === 'later') && <Retest days={retestDays} tone={branch === 'within72' ? 'text-white/85' : 'text-muted'} />}
                </div>
              )}
            </section>
          ) : (
            <section className={`step-in rounded-md p-4 ${advice.urgent ? URGENT : 'border-2 border-ink bg-surface'}`}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {/* The "go today" block stays black with white words; its title and clock are yellow. */}
                {advice.urgent && <Clock size={20} strokeWidth={2} className="text-yellow" aria-hidden="true" />}
                {(notice?.group || advice.urgent) && <h2 className={`text-[20px] font-bold ${advice.urgent ? 'text-yellow' : ''}`}>{advice.title}</h2>}
                {advice.urgent ? (
                  <span role="note" className="rounded-sm border border-white/70 px-2 py-0.5 text-[12px]">
                    {th.draftClinical}
                  </span>
                ) : (
                  <Banner tone="draft">{th.draftClinical}</Banner>
                )}
              </div>
              {meta && <p className={`text-[13px] ${advice.urgent ? 'text-white/85' : 'text-muted'}`}>{meta}</p>}
              <h3 className="mb-1 mt-3 text-[13px] font-bold">{th.recipient.todo}</h3>
              <ol className="list-decimal space-y-1 pl-5">
                {advice.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <Retest days={retestDays} tone={advice.urgent ? 'text-white/85' : 'text-muted'} />
            </section>
          )}

          <p className="rounded-md border-2 border-ink bg-bg p-3 text-[13px]">{th.recipient.pregnancy}</p>

          {notice && (
            <Card className="text-center">
              <h2 className="text-[13px] font-medium text-muted">{th.recipient.fastTrack}</h2>
              <p className="my-1 text-[32px] font-bold tracking-[0.25em] text-ink">{notice.code}</p>
              <p className="text-left text-[13px] text-muted">{th.recipient.fastTrackHint}</p>
            </Card>
          )}

          <Button variant="secondary" className="w-full" onClick={() => downloadCalendar(retestDays)}>
            <CalendarPlus size={18} strokeWidth={2} aria-hidden="true" />
            {th.recipient.calendar}
          </Button>

          <section>
            <h2 className="mb-2 font-bold">{th.recipient.nearby}</h2>
            <ul aria-label={th.recipient.nearby} className="space-y-2">
              {points.map((point) => (
                <li key={point.id}>
                  <CarePointRow point={point} onOpen={() => setPointId(point.id)} />
                </li>
              ))}
            </ul>
            <Link to={to('/app/list')} className={`mt-3 ${QUIET_LINK}`}>
              {th.common.openList}
            </Link>
          </section>

          <Link to={to('/app/harm')} className={`flex min-h-11 items-center text-[13px] ${TEXT_LINK}`}>
            {th.recipient.harm}
          </Link>
          <CarePointSheet point={CARE_POINTS.find((p) => p.id === pointId) ?? null} onClose={() => setPointId(null)} />
        </>
      )}
    </main>
  )
}
