import { Check as CheckIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { th } from '../copy/th'
import type { DiseaseGroup, ReportSource } from '../domain/types'
import { Button } from '../design/primitives/Button'
import { Stepper } from '../design/primitives/Stepper'
import { claimCodeOnPhone, consentCityCount, saveCard } from '../store/actions'
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

export function ReportFlow() {
  const to = useEmbedTo()
  const [step, setStep] = useState(0)
  const [group, setGroup] = useState<DiseaseGroup | null>(null)
  const [source, setSource] = useState<ReportSource | null>(null)
  const [codeText, setCodeText] = useState('')
  const [codeError, setCodeError] = useState(false)
  // A claimed clinic code lives here, in memory. It is never written to the phone.
  const [code, setCode] = useState<{ id: string; positiveGroup: DiseaseGroup | null } | null>(null)
  const [addToArea, setAddToArea] = useState(false)
  const [keepCard, setKeepCard] = useState(false)
  const [result, setResult] = useState<{ consented: boolean; kept: boolean } | null>(null)

  // HIV never reaches the map; mpox area information comes from official figures only.
  const canAddToArea = group !== null && group !== 'hiv' && group !== 'mpox' && code?.positiveGroup === group

  const useCode = () => {
    const id = codeText.trim().toUpperCase()
    const found = claimCodeOnPhone(id)
    if (!found.ok) {
      setCodeError(true)
      return
    }
    setCodeError(false)
    setCode({ id, positiveGroup: found.positiveGroup })
    setStep(2)
  }

  const finish = () => {
    const consented = canAddToArea && addToArea
    if (consented && code) consentCityCount(code.id)
    if (keepCard && group && source) saveCard({ group, source, sentAt: new Date().toISOString(), hasClinicCode: code !== null })
    setResult({ consented, kept: keepCard })
    setStep(3)
  }

  return (
    <main className="p-4">
      <FlowHeader title={th.report.cta} backTo={to('/app')} onBack={step > 0 && step < 3 ? () => setStep(step - 1) : undefined} />
      <Stepper steps={[...th.report.steps]} current={step} />

      {step === 0 && (
        <section className="step-in mt-5 space-y-2">
          <h2 className="text-[17px] font-semibold">{th.report.askGroup}</h2>
          {GROUPS.map((g) => (
            <Choice
              key={g}
              label={th.group[g]}
              hint={th.groupHint[g]}
              onClick={() => {
                setGroup(g)
                setSource(null)
                setCode(null)
                setStep(1)
              }}
            />
          ))}
        </section>
      )}

      {step === 1 && group && (
        <section className="step-in mt-5 space-y-2">
          <h2 className="text-[17px] font-semibold">{th.report.askSource}</h2>
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
            <div className="rounded-md border border-line bg-surface p-4">
              <label htmlFor="clinic-code" className="mb-1 block text-[13px] font-medium text-muted">
                {th.report.codeInput}
              </label>
              <div className="flex gap-2">
                <input
                  id="clinic-code"
                  value={codeText}
                  onChange={(e) => setCodeText(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  inputMode="text"
                  aria-invalid={codeError}
                  aria-describedby={codeError ? 'clinic-code-error' : undefined}
                  className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-bg px-3 text-[17px] font-semibold uppercase tracking-widest"
                />
                <Button onClick={useCode} disabled={codeText.trim() === ''}>
                  {th.report.useCode}
                </Button>
              </div>
              {codeError && (
                <p id="clinic-code-error" role="alert" className="mt-2 text-[13px] font-medium text-ink">
                  {th.report.codeBad}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {step === 2 && group && (
        <section className="step-in mt-5 space-y-3">
          <h2 className="text-[17px] font-semibold">{th.report.askActions}</h2>
          {group === 'hiv' && <p className="rounded-md bg-care-soft px-4 py-3 text-[15px]">{th.report.hivNoMap}</p>}
          {code && !canAddToArea && group !== 'hiv' && group !== 'mpox' && <p className="rounded-md bg-surface px-4 py-3 text-[13px] text-muted">{th.report.codeNotPositive}</p>}
          {canAddToArea && <Check id="add-to-area" label={th.report.addToArea} hint={th.report.addToAreaHint} checked={addToArea} onChange={setAddToArea} />}
          <Check id="keep-card" label={th.report.keepCard} hint={th.report.keepCardHint} checked={keepCard} onChange={setKeepCard} />
          <Button size="lg" className="w-full" onClick={finish}>
            {th.report.finish}
          </Button>
        </section>
      )}

      {step === 3 && result && (
        <section className="step-in mt-6 space-y-4">
          <div className="grid size-14 place-items-center rounded-full bg-care text-white">
            <CheckIcon size={28} strokeWidth={2} aria-hidden="true" />
          </div>
          <h2 className="text-[24px] font-semibold">{th.report.receiptTitle}</h2>
          <ul className="space-y-2 rounded-md border border-line bg-surface p-4">
            <li>{result.consented ? th.report.receiptClinicCarries : th.report.receiptNothingLeft}</li>
            <li className="text-muted">{result.kept ? th.report.receiptCard : th.report.receiptNoCard}</li>
          </ul>
          <Link to={to(`/app/notify?g=${group}&c=${code ? 1 : 0}`)} className="flex min-h-13 items-center justify-center rounded-md bg-care px-5 text-[17px] font-medium text-white">
            {th.report.goNotify}
          </Link>
          <Link to={to('/app')} className="flex min-h-11 items-center justify-center rounded-md border border-line bg-surface px-4 font-medium">
            {th.report.backToMap}
          </Link>
        </section>
      )}
    </main>
  )
}
