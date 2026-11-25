import { useState } from 'react'
import { formatThaiDate } from '../copy/format'
import { th } from '../copy/th'
import { Emoji } from '../design/Emoji'
import type { EmojiName } from '../design/emojiCodes'
import { Mascot } from '../design/Logo'
import { NOTE, PRIMARY_LINK, QUIET_LINK, SOFT } from '../design/look'
import { Button } from '../design/primitives/Button'
import { Stepper } from '../design/primitives/Stepper'
import { districtName } from '../domain/districts'
import { buildIcs } from '../domain/ics'
import type { DiseaseGroup, ReportKind, ReportSource } from '../domain/types'
import { mondayDate } from '../domain/weeks'
import { takingNow } from '../envelope/send'
import { useReportState } from '../envelope/useReportState'
import { useIntakeOpen } from '../map/published'
import { currentWeek, queueReport, saveCard, setMyDistrict } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { phone } from '../store/stores'
import { DistrictPicker } from './DistrictPicker'
import { Choice, FlowHeader } from './FlowHeader'
import { Go } from './Go'
import { SendsOnly } from './SendsOnly'

type Found = DiseaseGroup | 'symptoms'
type Step = 'found' | 'source' | 'district' | 'done'
const STEPS: Step[] = ['found', 'source', 'district', 'done']
/** What was found, in the order asked, with its picture (redesign spec 5.3). */
const FOUND: [Found, EmojiName][] = [
  ['gono_chlam', 'petri'],
  ['syphilis', 'blood'],
  ['hiv', 'ribbon'],
  ['mpox', 'blueCircle'],
  ['symptoms', 'feverish'],
]
const EMOJI_OF = Object.fromEntries(FOUND) as Record<Found, EmojiName>
/** HIV never goes on the map; mpox only from official figures (amendment 4.1). */
const NOT_ON_MAP: Found[] = ['hiv', 'mpox']
/** How a result can be known. A self-test only for HIV (amendment 4.1). */
const SOURCES: Record<DiseaseGroup, ('lab_result' | 'hiv_self_test')[]> = {
  gono_chlam: ['lab_result'],
  syphilis: ['lab_result'],
  mpox: ['lab_result'],
  hiv: ['lab_result', 'hiv_self_test'],
}
const SOURCE_EMOJI = { lab_result: 'testTube', hiv_self_test: 'house' } as const
const WEEK_MS = 7 * 86_400_000

/** The report that may go to the map, or null: a lab-confirmed gonorrhoea, chlamydia or syphilis, or symptoms on their own (redesign spec 5.4). */
function mapKind(found: Found | null, source: ReportSource | null): ReportKind | null {
  if (found === 'symptoms') return 'symptoms'
  if ((found === 'gono_chlam' || found === 'syphilis') && source === 'lab_result') return found
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

/**
 * 🩺 เจอ / มีอาการ (redesign spec 5.3): what was found, how it is known, the district, done. 🤒 skips
 * "how it is known"; a kind that never goes on the map skips the district. No medical advice here.
 */
const DONE_LINE = {
  waiting: th.report.doneWaiting,
  sending: th.report.doneSending,
  sent: th.report.doneSent,
  gone: th.report.doneNothing,
  tomorrow: th.report.doneTomorrow,
  held: th.report.doneHeld,
} as const
/** While the report has not started to go, it can still be cancelled. */
const CANCELLABLE = new Set(['waiting', 'tomorrow', 'held'])

export function ReportFlow() {
  const { pending, symptomsNextWeek, myDistrict } = usePartyStore(phone)
  const intakeOpen = useIntakeOpen()
  const [step, setStep] = useState<Step>('found')
  const [found, setFound] = useState<Found | null>(null)
  const [source, setSource] = useState<ReportSource | null>(null)
  const [district, setDistrict] = useState<string | null>(null)
  const [changing, setChanging] = useState(false)
  const [kept, setKept] = useState(false)
  // The report sent from this screen, by its time; the done line follows how it stands (live map, owner 25 Nov 2026).
  const [sentAt, setSentAt] = useState<string | null>(null)
  const queued = sentAt !== null
  const standing = useReportState(sentAt)

  const kind = mapKind(found, source)
  const remembered = myDistrict && districtName(myDistrict) ? myDistrict : null
  const zone = remembered && !changing ? remembered : district
  // "Symptoms" go to the map once in four weeks, like ✅; the phone remembers only when they may again.
  const symptomsWait = kind === 'symptoms' && symptomsNextWeek != null && symptomsNextWeek > currentWeek()
  const group = found === 'symptoms' ? null : found

  const pickFound = (f: Found) => {
    setFound(f)
    setSource(f === 'symptoms' ? 'symptoms' : null)
    setDistrict(null)
    setChanging(false)
    setSentAt(null)
    setKept(false)
    setStep(f === 'symptoms' ? 'district' : 'source')
  }
  const pickSource = (s: 'lab_result' | 'hiv_self_test') => {
    setSource(s)
    setStep(mapKind(found, s) ? 'district' : 'done')
  }
  const send = () => {
    if (!kind || !zone) return
    const savedAt = new Date().toISOString()
    queueReport({ kind, zone, savedAt })
    setMyDistrict(zone)
    setSentAt(savedAt)
    setStep('done')
  }
  const keepCard = () => {
    if (!group) return
    saveCard({ group, source: source ?? 'lab_result', sentAt: new Date().toISOString(), hasLabResult: source === 'lab_result' })
    setKept(true)
  }
  const back = step === 'source' ? () => setStep('found') : step === 'district' ? () => setStep(found === 'symptoms' ? 'found' : 'source') : undefined
  const nextButton = (
    <Button size="lg" className="w-full" onClick={() => setStep('done')}>
      {th.report.next}
    </Button>
  )

  return (
    <main className="p-4">
      <FlowHeader title={th.report.title} emoji="stethoscope" backTo="/app" onBack={back} />
      <Stepper steps={[...th.report.steps]} current={STEPS.indexOf(step)} />

      {step === 'found' && (
        <section className="step-in mt-5 space-y-2">
          <h2 className="text-[17px] font-bold">{th.report.askFound}</h2>
          {FOUND.map(([f, emoji]) => {
            const off = NOT_ON_MAP.includes(f)
            return <Choice key={f} emoji={emoji} label={th.report.found[f]} hint={off ? th.report.noMap : undefined} hintEmoji={off ? 'lock' : undefined} onClick={() => pickFound(f)} />
          })}
        </section>
      )}

      {step === 'source' && group && (
        <section className="step-in mt-5 space-y-2">
          <h2 className="text-[17px] font-bold">{th.report.askSource}</h2>
          {SOURCES[group].map((s) => (
            <Choice key={s} emoji={SOURCE_EMOJI[s]} label={th.report.source[s]} selected={source === s} onClick={() => pickSource(s)} />
          ))}
        </section>
      )}

      {step === 'district' && found && kind && (
        <section className="step-in mt-5 space-y-3">
          <h2 className="text-[17px] font-bold">{th.tested.title}</h2>
          {!intakeOpen ? (
            <>
              <p className={`flex items-center gap-2 px-3 py-2 text-[14px] ${NOTE}`}>
                <Emoji name="pause" />
                {th.report.closed}
              </p>
              {nextButton}
            </>
          ) : symptomsWait && symptomsNextWeek ? (
            <>
              <p className={`px-3 py-2 text-[14px] ${NOTE}`}>{th.report.symptomsAgain.replace('{date}', formatThaiDate(mondayDate(symptomsNextWeek)))}</p>
              {nextButton}
            </>
          ) : (
            <>
              {pending && (
                <p className={`flex items-center gap-2 px-3 py-2 text-[14px] font-semibold ${SOFT}`}>
                  <Emoji name="envelope" />
                  {takingNow(pending.savedAt) ? th.report.replacesTaken : th.report.replaces}
                </p>
              )}
              {remembered && !changing ? (
                <div className={`flex items-center justify-between gap-2 px-3 py-1 ${SOFT}`}>
                  <span className="flex items-center gap-1.5 font-bold">
                    <Emoji name="pin" />
                    {districtName(remembered)}
                  </span>
                  <Button
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => {
                      setChanging(true)
                      setDistrict(remembered)
                    }}
                  >
                    {th.picker.change}
                  </Button>
                </div>
              ) : (
                <DistrictPicker district={district} onDistrict={setDistrict} name="district" />
              )}
              <SendsOnly emoji={EMOJI_OF[found]} kind={th.report.found[found]} />
              <Button size="lg" className="w-full" disabled={!zone} onClick={send}>
                <Emoji name={kind === 'symptoms' ? 'feverish' : 'confirmed'} />
                {th.report.toMap}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep('done')}>
                {th.report.skip}
              </Button>
            </>
          )}
        </section>
      )}

      {step === 'done' && found && (
        <section aria-label={th.report.summary} className="step-in mt-6 space-y-3">
          <Mascot />
          <h2 className="flex items-center gap-2 text-[22px] font-bold">
            {queued && standing !== 'gone' && <Emoji name="envelope" size={26} />}
            {standing ? DONE_LINE[standing] : th.report.doneNothing}
          </h2>
          {standing && CANCELLABLE.has(standing) && <p className="text-muted">{th.report.doneCancel}</p>}
          <Go to="/app/list?find=test" className={PRIMARY_LINK}>
            <Emoji name="pin" />
            {th.report.findCare}
          </Go>
          {/* The partner step takes the disease in router state, so no disease name reaches the address bar or a server log. */}
          <Go to="/app/notify" state={{ group, hasLabResult: source === 'lab_result' }} className={QUIET_LINK}>
            <Emoji name="speech" />
            {th.report.tell}
          </Go>
          <Button variant="secondary" className="w-full" onClick={downloadReminder}>
            <Emoji name="alarm" />
            {th.report.remind}
          </Button>
          {group && (
            <div className="space-y-1">
              <p className="text-[13px] text-muted">{th.report.cardWarn}</p>
              <Button variant="secondary" className="w-full" disabled={kept} onClick={keepCard}>
                <Emoji name="pushpin" />
                {kept ? th.report.keptCard : th.report.keepCard}
              </Button>
            </div>
          )}
          {source === 'hiv_self_test' && (
            <a href="tel:1663" className={QUIET_LINK}>
              <Emoji name="phone" />
              {th.report.call1663}
            </a>
          )}
          <Go to="/app" className={QUIET_LINK}>
            <Emoji name="map" />
            {th.report.backToMap}
          </Go>
        </section>
      )}
    </main>
  )
}
