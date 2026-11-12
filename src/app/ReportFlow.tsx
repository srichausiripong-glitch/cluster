import { Ban, Check as CheckIcon, Phone, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { th } from '../copy/th'
import type { DiseaseGroup, ReportSource } from '../domain/types'
import { PRIMARY_LINK, QUIET_LINK, SOFT, TEXT_LINK } from '../design/look'
import { Button } from '../design/primitives/Button'
import { Stepper } from '../design/primitives/Stepper'
import { saveCard } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { phone } from '../store/stores'
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
const OUTCOME_ICON = { counted: CheckIcon, kept: Smartphone, nothing: Ban } as const
const primaryLink = PRIMARY_LINK
const quietLink = QUIET_LINK

export function ReportFlow() {
  const [step, setStep] = useState(0)
  const [group, setGroup] = useState<DiseaseGroup | null>(null)
  const [source, setSource] = useState<ReportSource | null>(null)
  // Until the envelope (v1 plan, Task 6 and 9) nothing leaves the phone; the area box is not offered.
  const code = null
  const [addToArea, setAddToArea] = useState(false)
  const [keepCard, setKeepCard] = useState(false)
  const [result, setResult] = useState<{ outcome: Outcome; kept: boolean; checked: boolean; oldCard: boolean } | null>(null)
  const { card } = usePartyStore(phone)

  const canAddToArea = false
  const willCount = canAddToArea && addToArea

  const finish = () => {
    if (keepCard && group && source) saveCard({ group, source, sentAt: new Date().toISOString(), hasClinicCode: code !== null })
    // The receipt speaks for the whole phone, not for this pass alone: a card kept earlier is still there.
    setResult({ outcome: willCount ? 'counted' : keepCard ? 'kept' : 'nothing', kept: keepCard, checked: code !== null, oldCard: !keepCard && card !== null })
    setStep(3)
  }

  const OutcomeIcon = result ? OUTCOME_ICON[result.outcome] : CheckIcon
  const notifyLink = (cls: string) => (
    <Link to={'/app/notify'} state={{ group, hasClinicCode: code !== null }} className={cls}>
      {th.report.goNotify}
    </Link>
  )

  return (
    <main className="p-4">
      <FlowHeader title={th.report.cta} backTo={'/app'} onBack={step > 0 && step < 3 ? () => setStep(step - 1) : undefined} />
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
                  setStep(2)
                }
              }}
            />
          ))}
          <div className="box flex flex-wrap items-center justify-between gap-x-3 px-4 py-3">
            <p className="min-w-0 flex-1 text-[13px]">{group === 'syphilis' ? th.report.noCodeSyphilis : th.report.noCodeOther}</p>
            <Link to={'/app/list'} className={`inline-flex min-h-11 items-center ${TEXT_LINK}`}>
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
            <li className="text-muted">{result.kept ? th.report.receiptCard : result.oldCard ? th.report.receiptOldCard : th.report.receiptNoCard}</li>
          </ul>

          <h3 className="text-[13px] font-medium text-muted">{th.report.next}</h3>
          {source === 'symptoms' && (
            <Link to={'/app/list'} className={primaryLink}>
              {th.report.nextTest}
            </Link>
          )}
          {source === 'hiv_self_test' && (
            <>
              <Link to={'/app/list'} className={primaryLink}>
                {th.report.nextConfirm}
              </Link>
              <a href="tel:1663" className={quietLink}>
                <Phone size={18} strokeWidth={2} aria-hidden="true" />
                {th.report.call1663}
              </a>
            </>
          )}
          {notifyLink(source === 'clinic_code' ? primaryLink : quietLink)}
          <Link to={'/app'} className={quietLink}>
            {th.report.backToMap}
          </Link>
        </section>
      )}
    </main>
  )
}
