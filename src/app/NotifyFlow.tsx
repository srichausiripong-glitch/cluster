import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { th } from '../copy/th'
import { buildLink } from '../domain/link'
import { composeNotice } from '../domain/notify'
import type { DiseaseGroup, ExposureBand } from '../domain/types'
import { isoWeek } from '../domain/weeks'
import { Button } from '../design/primitives/Button'
import { createSlip } from '../store/actions'
import { useEmbedTo } from './embed'
import { Check, Choice, FlowHeader } from './FlowHeader'

const GROUPS: DiseaseGroup[] = ['gono_chlam', 'syphilis', 'mpox', 'hiv']
const BANDS: ExposureBand[] = ['h72', 'w2', 'w4', 'm3']
type View = 'safety' | 'channel' | 'link' | 'slip' | 'later'

export function NotifyFlow() {
  const to = useEmbedTo()
  const [params] = useSearchParams()
  const fromReport = GROUPS.find((g) => g === params.get('g')) ?? null
  const hasClinicCode = params.get('c') === '1'
  const [group, setGroup] = useState<DiseaseGroup | null>(fromReport)
  const [view, setView] = useState<View>('safety')
  const [band, setBand] = useState<ExposureBand>('w4')
  const [nameDisease, setNameDisease] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [slip, setSlip] = useState<string | null>(null)

  const mayName = group !== 'hiv' || band === 'h72'
  const back = view === 'safety' ? undefined : () => setView(view === 'channel' || view === 'later' ? 'safety' : 'channel')

  const makeLink = () => {
    if (!group) return
    const notice = composeNotice({ group, hasClinicCode, nameDisease: nameDisease && mayName, band, week: isoWeek(new Date()) })
    setLink(buildLink(window.location.origin, notice))
    setCopied(false)
  }
  const recipientPath = link ? to('/r') + link.slice(link.indexOf('#')) : ''

  return (
    <main className="p-4">
      <FlowHeader title={th.notify.title} backTo={to('/app')} onBack={back} />

      {!group && (
        <section className="space-y-2">
          <h2 className="text-[17px] font-semibold">{th.report.askGroup}</h2>
          {GROUPS.map((g) => (
            <Choice key={g} label={th.group[g]} hint={th.groupHint[g]} onClick={() => setGroup(g)} />
          ))}
        </section>
      )}

      {group && view === 'safety' && (
        <section className="step-in space-y-3">
          <h2 className="text-[20px] font-semibold">{th.notify.safetyQ}</h2>
          <Choice label={th.notify.safeYes} onClick={() => setView('channel')} />
          <Choice label={th.notify.safeClinic} hint={th.notify.clinicWho} onClick={() => setView('slip')} />
          <Choice label={th.notify.safeLater} onClick={() => setView('later')} />
          <p className="text-[13px] text-muted">{th.notify.misuse}</p>
        </section>
      )}

      {group && view === 'later' && <p className="step-in rounded-md bg-surface p-4">{th.notify.laterDone}</p>}

      {group && view === 'channel' && (
        <section className="step-in space-y-3">
          <h2 className="text-[17px] font-semibold">{th.notify.chooseChannel}</h2>
          <Choice label={th.notify.linkTitle} hint={th.notify.linkWho} onClick={() => setView('link')} />
          <Choice label={th.notify.clinicTitle} hint={th.notify.clinicWho} onClick={() => setView('slip')} />
        </section>
      )}

      {group && view === 'link' && (
        <section className="step-in space-y-4">
          <p className="rounded-md bg-surface p-3 text-[13px] text-muted">{th.notify.linkWho}</p>
          <fieldset>
            <legend className="mb-2 font-semibold">{th.notify.band}</legend>
            <div className="grid grid-cols-2 gap-2">
              {BANDS.map((b) => (
                <label key={b} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-2 text-center text-[13px] font-medium ${band === b ? 'border-care bg-care-soft' : 'border-line bg-surface'}`}>
                  <input type="radio" name="band" className="sr-only" checked={band === b} onChange={() => { setBand(b); setLink(null) }} />
                  {th.notify.bands[b]}
                </label>
              ))}
            </div>
          </fieldset>
          <Check
            id="name-disease"
            label={th.notify.nameDisease}
            hint={group === 'hiv' ? th.notify.hivNameRule : th.notify.nameDiseaseHint}
            checked={nameDisease && mayName}
            disabled={!mayName}
            onChange={(v) => { setNameDisease(v); setLink(null) }}
          />
          <Button size="lg" className="w-full" onClick={makeLink}>
            {th.notify.makeLink}
          </Button>
          {link && (
            <div className="space-y-2 rounded-md border border-line bg-surface p-4">
              <label htmlFor="notice-link" className="block text-[13px] font-medium text-muted">
                {th.notify.linkLabel}
              </label>
              <input id="notice-link" readOnly value={link} onFocus={(e) => e.target.select()} className="min-h-11 w-full rounded-md border border-line bg-bg px-3 text-[13px]" />
              <p className="text-[13px] text-muted">{th.notify.linkNote}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    void navigator.clipboard?.writeText(link).then(() => setCopied(true)).catch(() => setCopied(false))
                  }}
                >
                  {copied ? th.common.copied : th.notify.copyLink}
                </Button>
                <Link to={recipientPath} className="inline-flex min-h-11 items-center rounded-md px-4 font-medium text-care hover:bg-care-soft">
                  {th.notify.openRecipient}
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {group && view === 'slip' && (
        <section className="step-in space-y-4">
          <p className="rounded-md bg-surface p-3 text-[13px] text-muted">{th.notify.clinicWho}</p>
          {!slip ? (
            <Button size="lg" className="w-full" onClick={() => setSlip(createSlip())}>
              {th.notify.makeSlip}
            </Button>
          ) : (
            <div className="rounded-md border border-line bg-surface p-5 text-center">
              <h2 className="font-semibold">{th.notify.slipTitle}</h2>
              <div className="mx-auto my-4 w-fit rounded-md bg-white p-3">
                <QRCodeSVG value={slip} size={148} fgColor="#14282e" />
              </div>
              <p className="text-[32px] font-semibold tracking-[0.2em]">{slip}</p>
              <p className="mt-3 text-left text-[13px] text-muted">{th.notify.slipBody}</p>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
