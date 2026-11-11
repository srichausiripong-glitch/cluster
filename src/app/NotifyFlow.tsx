import { Check as Tick } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { th } from '../copy/th'
import { buildLink } from '../domain/link'
import { composeNotice } from '../domain/notify'
import type { DiseaseGroup, ExposureBand } from '../domain/types'
import { NOTE, PRESS, PRIMARY_LINK, TEXT_LINK } from '../design/look'
import { Button } from '../design/primitives/Button'
import { createSlip, currentWeek } from '../store/actions'
import { useEmbedTo } from './embed'
import { Check, Choice, FlowHeader } from './FlowHeader'

const GROUPS: DiseaseGroup[] = ['gono_chlam', 'syphilis', 'mpox', 'hiv']
const BANDS: ExposureBand[] = ['h72', 'w2', 'w4', 'm3', 'older']
type View = 'safety' | 'channel' | 'link' | 'slip' | 'later'

/** The report step hands over the group in router state, so no disease name reaches the address bar or a server log. */
function fromReport(state: unknown): { group: DiseaseGroup | null; hasClinicCode: boolean } {
  const s = (state ?? {}) as { group?: unknown; hasClinicCode?: unknown }
  const group = GROUPS.find((g) => g === s.group) ?? null
  return { group, hasClinicCode: group !== null && s.hasClinicCode === true }
}

export function NotifyFlow() {
  const to = useEmbedTo()
  const handed = fromReport(useLocation().state)
  const [group, setGroup] = useState<DiseaseGroup | null>(handed.group)
  const [view, setView] = useState<View>('safety')
  // No time is preselected: the answer changes what the recipient is told to do.
  const [band, setBand] = useState<ExposureBand | null>(null)
  const [nameDisease, setNameDisease] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [slip, setSlip] = useState<string | null>(null)

  const mayName = group !== 'hiv' || band === 'h72'
  const named = nameDisease && mayName
  const back = view === 'safety' ? undefined : () => setView(view === 'channel' || view === 'later' ? 'safety' : 'channel')

  const makeLink = () => {
    if (!group || !band) return
    const notice = composeNotice({ group, hasClinicCode: handed.hasClinicCode, nameDisease: named, band, week: currentWeek() })
    setLink(buildLink(window.location.origin, notice))
    setCopied(false)
  }
  const recipientPath = link ? to('/r') + link.slice(link.indexOf('#')) : ''
  const note = `${NOTE} p-3 text-[13px] text-muted`

  return (
    <main className="p-4">
      <FlowHeader title={th.notify.title} backTo={to('/app')} onBack={back} />

      {!group && (
        <section className="space-y-2">
          <h2 className="text-[17px] font-bold">{th.report.askGroup}</h2>
          {GROUPS.map((g) => (
            <Choice key={g} label={th.group[g]} hint={th.groupHint[g]} onClick={() => setGroup(g)} />
          ))}
        </section>
      )}

      {group && view === 'safety' && (
        <section className="step-in space-y-3">
          <h2 className="text-[20px] font-bold">{th.notify.safetyQ}</h2>
          <Choice label={th.notify.safeYes} onClick={() => setView('channel')} />
          <Choice label={th.notify.safeClinic} hint={th.notify.clinicWho} onClick={() => setView('slip')} />
          <Choice label={th.notify.safeLater} onClick={() => setView('later')} />
        </section>
      )}

      {group && view === 'later' && (
        <section className="step-in space-y-3">
          <p className="box p-4">{th.notify.laterDone}</p>
          <Link to={to('/app')} className={PRIMARY_LINK}>
            {th.report.backToMap}
          </Link>
        </section>
      )}

      {group && view === 'channel' && (
        <section className="step-in space-y-3">
          <h2 className="text-[17px] font-bold">{th.notify.chooseChannel}</h2>
          <Choice label={th.notify.linkTitle} hint={th.notify.linkWho} onClick={() => setView('link')} />
          <Choice label={th.notify.clinicTitle} hint={th.notify.clinicWho} onClick={() => setView('slip')} />
        </section>
      )}

      {group && view === 'link' && (
        <section className="step-in space-y-4">
          <div className={note}>
            <p>{th.notify.linkWho}</p>
            <p className="mt-1">{th.notify.truthLink}</p>
          </div>
          <fieldset>
            <legend className="mb-2 font-bold">{th.notify.band}</legend>
            <div className="grid grid-cols-2 gap-2">
              {BANDS.map((b) => (
                <label
                  key={b}
                  className={`flex min-h-11 cursor-pointer items-center justify-center gap-1 rounded-md border-2 border-ink px-2 text-center text-[13px] font-semibold has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${PRESS} ${b === 'older' ? 'col-span-2' : ''} ${band === b ? 'bg-care-soft' : 'bg-surface'}`}
                >
                  <input
                    type="radio"
                    name="band"
                    className="sr-only"
                    checked={band === b}
                    onChange={() => {
                      setBand(b)
                      setLink(null)
                    }}
                  />
                  {band === b && <Tick size={16} strokeWidth={3} className="shrink-0" aria-hidden="true" />}
                  {th.notify.bands[b]}
                </label>
              ))}
            </div>
          </fieldset>
          <Check
            id="name-disease"
            label={th.notify.nameDisease}
            hint={group === 'hiv' ? th.notify.hivNameRule : th.notify.nameDiseaseHint}
            checked={named}
            disabled={!mayName}
            onChange={(v) => {
              setNameDisease(v)
              setLink(null)
            }}
          />
          <div className="box p-3 text-[13px]">
            <p className="font-bold">{th.notify.see}</p>
            <p className="text-muted">
              {named ? th.notify.seeNamed : th.notify.seeUnnamed}
              {band === 'h72' ? ` ${th.notify.seeUrgent}` : ''}
            </p>
          </div>
          <Button size="lg" className="w-full" onClick={makeLink} disabled={band === null} aria-describedby={band === null ? 'band-first' : undefined}>
            {th.notify.makeLink}
          </Button>
          {band === null && (
            <p id="band-first" className="text-center text-[13px] text-muted">
              {th.notify.bandFirst}
            </p>
          )}
          {link && (
            <div className="box space-y-2 p-4">
              <label htmlFor="notice-link" className="block text-[13px] font-semibold">
                {th.notify.linkLabel}
              </label>
              <input id="notice-link" readOnly value={link} onFocus={(e) => e.target.select()} className="min-h-11 w-full rounded-md border-2 border-ink bg-bg px-3 text-[13px]" />
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
                <Link to={recipientPath} className={`inline-flex min-h-11 items-center px-2 ${TEXT_LINK}`}>
                  {th.notify.openRecipient}
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {group && view === 'slip' && (
        <section className="step-in space-y-4">
          <div className={note}>
            <p>{th.notify.clinicWho}</p>
            <p className="mt-1">{th.notify.truthClinic}</p>
          </div>
          {!slip ? (
            <Button size="lg" className="w-full" onClick={() => setSlip(createSlip())}>
              {th.notify.makeSlip}
            </Button>
          ) : (
            <div className="box p-5 text-center">
              <h2 className="font-bold">{th.notify.slipTitle}</h2>
              <div className="mx-auto my-4 w-fit rounded-md border-2 border-ink bg-white p-3">
                <QRCodeSVG value={slip} size={148} fgColor="#1e1f1c" />
              </div>
              <p className="text-[32px] font-bold tracking-[0.2em]">{slip}</p>
              <p className="mt-3 text-left text-[13px] text-muted">{th.notify.slipBody}</p>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
