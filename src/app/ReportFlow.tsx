import { Ban, CalendarPlus, Check as CheckIcon, Phone, Smartphone } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatThaiDate } from '../copy/format'
import { th } from '../copy/th'
import { buildIcs } from '../domain/ics'
import type { DiseaseGroup, PendingReport, ReportKind, ReportSource } from '../domain/types'
import { mondayDate } from '../domain/weeks'
import { NOTE, PRIMARY_LINK, QUIET_LINK, SOFT, TEXT_LINK } from '../design/look'
import { Button } from '../design/primitives/Button'
import { Stepper } from '../design/primitives/Stepper'
import { ZONES } from '../map/areas'
import { currentWeek, queueReport, saveCard } from '../store/actions'
import { ZONE_IDS } from '../store/seed'
import { usePartyStore } from '../store/partyStore'
import { phone } from '../store/stores'
import { Check, Choice, FlowHeader } from './FlowHeader'

type Way = 'tested' | 'positive' | 'symptoms'
type Outcome = 'queued' | 'kept' | 'nothing'
/** What each way in asks about. Symptoms are accepted only where they mean something; a self-test only for HIV (amendment 4.1). */
const GROUPS: Record<Exclude<Way, 'tested'>, DiseaseGroup[]> = {
  positive: ['gono_chlam', 'syphilis', 'mpox', 'hiv'],
  symptoms: ['gono_chlam', 'mpox'],
}
const POSITIVE_SOURCES: Record<DiseaseGroup, ReportSource[]> = {
  gono_chlam: ['lab_result'],
  syphilis: ['lab_result'],
  mpox: ['lab_result'],
  hiv: ['lab_result', 'hiv_self_test'],
}
/** The zones in the order the rest of the app lists them: north to south, then across the river. */
const PICK = ZONE_IDS.map((id) => ZONES.find((z) => z.id === id)!)
const OUTCOME_ICON = { queued: CheckIcon, kept: Smartphone, nothing: Ban } as const
const WEEK_MS = 7 * 86_400_000

/** The report that may go to the map, or null. HIV never; mpox only from official figures; symptoms alone never (amendment 4.1). */
function mapKind(way: Way | null, group: DiseaseGroup | null, source: ReportSource | null): ReportKind | null {
  if (way === 'tested') return 'tested'
  if (way === 'positive' && source === 'lab_result' && (group === 'gono_chlam' || group === 'syphilis')) return group
  return null
}

function downloadReminder() {
  const date = new Date(Date.now() + 13 * WEEK_MS).toISOString().slice(0, 10)
  const url = URL.createObjectURL(new Blob([buildIcs([{ date }])], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'reminder.ics'
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportFlow() {
  const zoneName = useId()
  const { card, pending, testedNextWeek } = usePartyStore(phone)
  const [step, setStep] = useState(0)
  const [way, setWay] = useState<Way | null>(null)
  const [group, setGroup] = useState<DiseaseGroup | null>(null)
  const [source, setSource] = useState<ReportSource | null>(null)
  const [zone, setZone] = useState<string | null>(null)
  const [adult, setAdult] = useState(false)
  const [toMap, setToMap] = useState(false)
  const [keepCard, setKeepCard] = useState(false)
  const [result, setResult] = useState<{ outcome: Outcome; kept: boolean; oldCard: boolean } | null>(null)

  const kind = mapKind(way, group, source)
  const week = currentWeek()
  // "Tested" may go to the map once in four weeks; the phone remembers only when it may again.
  const testedWait = kind === 'tested' && testedNextWeek !== null && testedNextWeek > week
  const mapOffered = kind !== null && !testedWait
  const willQueue = mapOffered && toMap && zone !== null && adult
  const cardOffered = way !== 'tested' && group !== null

  const restart = (next: Way) => {
    setWay(next)
    setGroup(null)
    setSource(null)
    setZone(null)
    setAdult(false)
    setToMap(false)
    setKeepCard(false)
    setStep(next === 'tested' ? 2 : 1)
  }
  const finish = () => {
    if (willQueue && kind && zone) {
      const report: PendingReport = { kind, zone, savedAt: new Date().toISOString() }
      queueReport(report)
    }
    if (keepCard && cardOffered && group) saveCard({ group, source: source ?? 'symptoms', sentAt: new Date().toISOString(), hasLabResult: source === 'lab_result' })
    setResult({ outcome: willQueue ? 'queued' : keepCard ? 'kept' : 'nothing', kept: keepCard, oldCard: !keepCard && card !== null })
    setStep(3)
  }
  const back = step > 0 && step < 3 ? () => setStep(way === 'tested' && step === 2 ? 0 : step - 1) : undefined
  const OutcomeIcon = result ? OUTCOME_ICON[result.outcome] : CheckIcon
  const finishLabel = willQueue ? (keepCard ? th.report.finish.queueCard : th.report.finish.queue) : keepCard ? th.report.finish.card : th.report.finish.none

  return (
    <main className="p-4">
      <FlowHeader title={th.report.cta} backTo={'/app'} onBack={back} />
      <Stepper steps={[...th.report.steps]} current={step} />

      {step === 0 && (
        <section className="step-in mt-5 space-y-2">
          <h2 className="text-[17px] font-bold">{th.report.askWay}</h2>
          <p className="pb-1 text-[13px] text-muted">{th.report.privacy}</p>
          {(['tested', 'positive', 'symptoms'] as const).map((w) => (
            <Choice key={w} label={th.report.way[w]} hint={th.report.wayHint[w]} onClick={() => restart(w)} />
          ))}
        </section>
      )}

      {step === 1 && way && way !== 'tested' && (
        <section className="step-in mt-5 space-y-2">
          <h2 className="text-[17px] font-bold">{group ? th.report.askSource : th.report.askGroup}</h2>
          {!group &&
            GROUPS[way].map((g) => (
              <Choice
                key={g}
                label={th.group[g]}
                hint={th.groupHint[g]}
                onClick={() => {
                  setGroup(g)
                  if (way === 'symptoms') {
                    setSource('symptoms')
                    setStep(2)
                  }
                }}
              />
            ))}
          {group &&
            POSITIVE_SOURCES[group].map((s) => (
              <Choice
                key={s}
                label={th.source[s]}
                hint={th.sourceHint[s]}
                selected={source === s}
                onClick={() => {
                  setSource(s)
                  setStep(2)
                }}
              />
            ))}
          {group === 'syphilis' && <p className={`px-4 py-3 text-[13px] ${NOTE}`}>{th.report.noCodeSyphilis}</p>}
          <Link to={'/app/list'} className={`inline-flex min-h-11 items-center ${TEXT_LINK}`}>
            {th.report.findCare}
          </Link>
        </section>
      )}

      {step === 2 && way && (
        <section className="step-in mt-5 space-y-3">
          <h2 className="text-[17px] font-bold">{th.report.askActions}</h2>
          {group === 'hiv' && <p className={`px-4 py-3 text-[15px] ${SOFT}`}>{th.report.hivNoMap}</p>}
          {group === 'mpox' && <p className={`px-4 py-3 text-[15px] ${SOFT}`}>{th.report.mpoxNoMap}</p>}
          {kind === null && group !== 'hiv' && group !== 'mpox' && <p className="box px-4 py-3 text-[13px] text-muted">{th.report.noMapLocal}</p>}
          {testedWait && testedNextWeek && (
            <p className={`px-4 py-3 text-[13px] ${NOTE}`}>{th.report.testedAgainFrom.replace('{date}', formatThaiDate(mondayDate(testedNextWeek)))}</p>
          )}

          {mapOffered && (
            <div className="box space-y-3 p-4">
              {pending && <p className={`px-3 py-2 text-[13px] font-semibold ${SOFT}`}>{th.report.replacesPending}</p>}
              <fieldset>
                <legend id={zoneName} className="mb-1 font-bold">
                  {th.report.zone}
                </legend>
                <p className="mb-2 text-[13px] text-muted">{th.report.zoneHint}</p>
                <div role="radiogroup" aria-labelledby={zoneName} className="grid grid-cols-2 gap-2">
                  {PICK.map((z) => (
                    <label key={z.id} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border-2 border-ink px-3 text-[14px] font-semibold ${zone === z.id ? 'bg-care-soft' : 'bg-surface'}`}>
                      <input type="radio" name="zone" className="size-4 shrink-0 accent-[var(--color-ink)]" checked={zone === z.id} onChange={() => setZone(z.id)} />
                      {z.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <ul className="space-y-1 text-[13px]">
                <li>{th.report.leaves}</li>
                <li>{th.report.waits}</li>
                <li className="font-semibold">{th.report.noTakeBack}</li>
              </ul>
              <Check id="adult" label={th.report.age} checked={adult} onChange={setAdult} />
              <Check id="to-map" label={th.report.toMap} checked={toMap && adult && zone !== null} disabled={!adult || zone === null} onChange={setToMap} />
            </div>
          )}

          {cardOffered && <Check id="keep-card" label={th.report.keepCard} hint={th.report.keepCardHint} checked={keepCard} onChange={setKeepCard} />}
          <Button size="lg" className="w-full" onClick={finish}>
            {finishLabel}
          </Button>
        </section>
      )}

      {step === 3 && result && (
        // Every report ends on the same screen, so a glance at it cannot tell a positive report from a test (amendment 4.4).
        <section aria-label={th.report.summary} className="step-in mt-6 space-y-4">
          <div className={`grid size-14 place-items-center rounded-full border-2 border-ink text-ink ${result.outcome === 'queued' ? 'bg-care' : 'bg-surface'}`}>
            <OutcomeIcon size={28} strokeWidth={2} aria-hidden="true" />
          </div>
          <h2 className="text-[24px] font-bold">{th.report.outcome[result.outcome]}</h2>
          <ul className="box space-y-2 p-4">
            {result.outcome === 'queued' && <li>{th.report.receiptQueued}</li>}
            {result.outcome === 'queued' && <li className="text-muted">{th.report.receiptMapWeekly}</li>}
            {result.outcome !== 'queued' && <li>{th.report.receiptNothingLeft}</li>}
            <li className="text-muted">{result.kept ? th.report.receiptCard : result.oldCard ? th.report.receiptOldCard : th.report.receiptNoCard}</li>
          </ul>
          {result.outcome === 'queued' && <p className={`p-3 text-[13px] ${NOTE}`}>{th.report.pastOnly}</p>}
          {result.outcome === 'queued' && (
            <Button variant="secondary" className="w-full" onClick={downloadReminder}>
              <CalendarPlus size={18} strokeWidth={2} aria-hidden="true" />
              {th.report.remindNext}
            </Button>
          )}

          <h3 className="text-[13px] font-medium text-muted">{th.report.next}</h3>
          {source === 'symptoms' && (
            <Link to={'/app/list'} className={PRIMARY_LINK}>
              {th.report.nextTest}
            </Link>
          )}
          {source === 'hiv_self_test' && (
            <>
              <Link to={'/app/list'} className={PRIMARY_LINK}>
                {th.report.nextConfirm}
              </Link>
              <a href="tel:1663" className={QUIET_LINK}>
                <Phone size={18} strokeWidth={2} aria-hidden="true" />
                {th.report.call1663}
              </a>
            </>
          )}
          <Link to={'/app/notify'} state={{ group: way === 'tested' ? null : group, hasLabResult: source === 'lab_result' }} className={result.outcome === 'queued' ? PRIMARY_LINK : QUIET_LINK}>
            {th.report.goNotify}
          </Link>
          {source !== 'symptoms' && (
            <Link to={'/app/list'} className={QUIET_LINK}>
              {th.report.nextTest}
            </Link>
          )}
          <Link to={'/app'} className={QUIET_LINK}>
            {th.report.backToMap}
          </Link>
        </section>
      )}
    </main>
  )
}
