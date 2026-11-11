import { Ban, Check as CheckIcon, CircleAlert, Phone, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { th } from '../copy/th'
import { codeKind } from '../domain/codes'
import type { DiseaseGroup, ReportSource } from '../domain/types'
import { ALERT, PRIMARY_LINK, QUIET_LINK, SOFT, TEXT_LINK } from '../design/look'
import { Button } from '../design/primitives/Button'
import { Stepper } from '../design/primitives/Stepper'
import { claimCodeOnPhone, consentCityCount, MAPPED_GROUPS, saveCard } from '../store/actions'
import { useEmbedTo } from './embed'
import { Check, Choice, FlowHeader } from './FlowHeader'

const GROUPS: DiseaseGroup[] = ['gono_chlam', 'syphilis', 'mpox', 'hiv']
/** Symptoms are accepted only where they mean something; a self-test only for HIV (spec 5.3). */
const SOURCES: Record<DiseaseGroup, ReportSource[]> = {
  mpox: ['clinic_code', 'symptoms'],
  gono_chlam: ['clinic_code', 'symptoms'],
  syphilis: ['clinic_code'],
  hiv: ['clinic_code', 'hiv_self_test'],
}
type Outcome = 'counted' | 'kept' | 'nothing'
type CodeError = 'unknown' | 'slip' | 'fastTrack'
const CODE_ERROR: Record<CodeError, string> = { unknown: th.report.codeBad, slip: th.report.codeIsSlip, fastTrack: th.report.codeIsFastTrack }
const OUTCOME_ICON = { counted: CheckIcon, kept: Smartphone, nothing: Ban } as const
const primaryLink = PRIMARY_LINK
const quietLink = QUIET_LINK

export function ReportFlow() {
  const to = useEmbedTo()
  const [step, setStep] = useState(0)
  const [group, setGroup] = useState<DiseaseGroup | null>(null)
  const [source, setSource] = useState<ReportSource | null>(null)
  const [codeText, setCodeText] = useState('')
  const [codeError, setCodeError] = useState<CodeError | null>(null)
  // A checked clinic code lives here, in memory. It is never written to the phone, and the
  // phone never learns its result: every valid code leads to the same screen (spec 3).
  const [code, setCode] = useState<string | null>(null)
  const [addToArea, setAddToArea] = useState(false)
  const [keepCard, setKeepCard] = useState(false)
  const [result, setResult] = useState<{ outcome: Outcome; kept: boolean; checked: boolean } | null>(null)

  // HIV never reaches the map; mpox area information comes from official figures only.
  const canAddToArea = code !== null && group !== null && MAPPED_GROUPS.includes(group)
  const willCount = canAddToArea && addToArea

  const submitCode = () => {
    const kind = codeKind(codeText)
    if (kind === 'slip' || kind === 'fastTrack') return setCodeError(kind)
    const id = codeText.trim().toUpperCase()
    if (!claimCodeOnPhone(id).ok) return setCodeError('unknown')
    setCodeError(null)
    setCode(id)
    setStep(2)
  }

  const finish = () => {
    if (willCount && code && group) consentCityCount(code, group)
    if (keepCard && group && source) saveCard({ group, source, sentAt: new Date().toISOString(), hasClinicCode: code !== null })
    setResult({ outcome: willCount ? 'counted' : keepCard ? 'kept' : 'nothing', kept: keepCard, checked: code !== null })
    setStep(3)
  }

  const OutcomeIcon = result ? OUTCOME_ICON[result.outcome] : CheckIcon
  const notifyLink = (cls: string) => (
    <Link to={to('/app/notify')} state={{ group, hasClinicCode: code !== null }} className={cls}>
      {th.report.goNotify}
    </Link>
  )

  return (
    <main className="p-4">
      <FlowHeader title={th.report.cta} backTo={to('/app')} onBack={step > 0 && step < 3 ? () => setStep(step - 1) : undefined} />
      <Stepper steps={[...th.report.steps]} current={step} />

      {step === 0 && (
        <section className="step-in mt-5 space-y-2">
          <h2 className="text-[17px] font-bold">{th.report.askGroup}</h2>
          <p className="pb-1 text-[13px] text-muted">{th.report.privacy}</p>
          {GROUPS.map((g) => (
            <Choice
              key={g}
              label={th.group[g]}
              hint={th.groupHint[g]}
              onClick={() => {
                // A new group starts clean: no source, no code, and no box left ticked from before.
                setGroup(g)
                setSource(null)
                setCode(null)
                setCodeError(null)
                setAddToArea(false)
                setKeepCard(false)
                setStep(1)
              }}
            />
          ))}
        </section>
      )}

      {step === 1 && group && (
        <section className="step-in mt-5 space-y-2">
          <h2 className="text-[17px] font-bold">{th.report.askSource}</h2>
          {SOURCES[group].map((s) => (
            <Choice
              key={s}
              label={th.source[s]}
              hint={th.sourceHint[s]}
              selected={source === s}
              onClick={() => {
                setSource(s)
                if (s !== 'clinic_code') {
                  setCode(null)
                  setStep(2)
                }
              }}
            />
          ))}
          {source === 'clinic_code' && (
            <form
              className="box p-4"
              onSubmit={(e) => {
                e.preventDefault()
                submitCode()
              }}
            >
              <label htmlFor="clinic-code" className="mb-1 block text-[13px] font-semibold">
                {th.report.codeInput}
              </label>
              <div className="flex gap-2">
                <input
                  id="clinic-code"
                  value={codeText}
                  onChange={(e) => {
                    setCodeText(e.target.value)
                    setCodeError(null)
                  }}
                  autoComplete="off"
                  autoCapitalize="characters"
                  inputMode="text"
                  aria-invalid={codeError !== null}
                  aria-describedby={`clinic-code-format${codeError ? ' clinic-code-error' : ''}`}
                  className="min-h-11 min-w-0 flex-1 rounded-md border-2 border-ink bg-bg px-3 text-[17px] font-bold uppercase tracking-widest"
                />
                <Button type="submit" disabled={codeText.trim() === ''}>
                  {th.report.useCode}
                </Button>
              </div>
              {codeError && (
                <p id="clinic-code-error" role="alert" className={`mt-2 flex items-start gap-2 px-3 py-2 text-[13px] font-semibold ${ALERT}`}>
                  <CircleAlert size={18} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {CODE_ERROR[codeError]}
                </p>
              )}
              <p id="clinic-code-format" className="mt-2 text-[13px] text-muted">
                {th.report.codeFormat}
              </p>
              <p className="text-[13px] text-muted">{th.report.codeCheckNote}</p>
            </form>
          )}
          <div className="box flex flex-wrap items-center justify-between gap-x-3 px-4 py-3">
            <p className="min-w-0 flex-1 text-[13px]">{group === 'syphilis' ? th.report.noCodeSyphilis : th.report.noCodeOther}</p>
            <Link to={to('/app/list')} className={`inline-flex min-h-11 items-center ${TEXT_LINK}`}>
              {th.report.findCare}
            </Link>
          </div>
        </section>
      )}

      {step === 2 && group && (
        <section className="step-in mt-5 space-y-3">
          <h2 className="text-[17px] font-bold">{th.report.askActions}</h2>
          {group === 'hiv' && <p className={`px-4 py-3 text-[15px] ${SOFT}`}>{th.report.hivNoMap}</p>}
          {group === 'mpox' && <p className={`px-4 py-3 text-[15px] ${SOFT}`}>{th.report.mpoxNoMap}</p>}
          {code === null && <p className="box px-4 py-3 text-[13px] text-muted">{th.report.noCodeLocal}</p>}
          {canAddToArea && <Check id="add-to-area" label={th.report.addToArea} hint={th.report.addToAreaHint} checked={addToArea} onChange={setAddToArea} />}
          <Check id="keep-card" label={th.report.keepCard} hint={th.report.keepCardHint} checked={keepCard} onChange={setKeepCard} />
          <Button size="lg" className="w-full" onClick={finish}>
            {willCount ? th.report.finish.area : keepCard ? th.report.finish.card : th.report.finish.none}
          </Button>
        </section>
      )}

      {step === 3 && result && (
        <section className="step-in mt-6 space-y-4">
          <div className={`grid size-14 place-items-center rounded-full border-2 border-ink text-ink ${result.outcome === 'counted' ? 'bg-care' : 'bg-surface'}`}>
            <OutcomeIcon size={28} strokeWidth={2} aria-hidden="true" />
          </div>
          <h2 className="text-[24px] font-bold">{th.report.outcome[result.outcome]}</h2>
          <ul className="box space-y-2 p-4">
            {result.outcome === 'counted' && <li>{th.report.receiptClinicCarries}</li>}
            {result.outcome === 'counted' && <li className="text-muted">{th.report.receiptMapWeekly}</li>}
            {result.checked ? <li className="text-muted">{th.report.receiptCodeChecked}</li> : <li>{th.report.receiptNothingLeft}</li>}
            <li className="text-muted">{result.kept ? th.report.receiptCard : th.report.receiptNoCard}</li>
          </ul>

          <h3 className="text-[13px] font-medium text-muted">{th.report.next}</h3>
          {source === 'symptoms' && (
            <Link to={to('/app/list')} className={primaryLink}>
              {th.report.nextTest}
            </Link>
          )}
          {source === 'hiv_self_test' && (
            <>
              <Link to={to('/app/list')} className={primaryLink}>
                {th.report.nextConfirm}
              </Link>
              <a href="tel:1663" className={quietLink}>
                <Phone size={18} strokeWidth={2} aria-hidden="true" />
                {th.report.call1663}
              </a>
            </>
          )}
          {notifyLink(source === 'clinic_code' ? primaryLink : quietLink)}
          <Link to={to('/app')} className={quietLink}>
            {th.report.backToMap}
          </Link>
        </section>
      )}
    </main>
  )
}
