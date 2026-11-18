import { useEffect, useId, useRef, useState } from 'react'
import { formatThaiDate } from '../copy/format'
import { th } from '../copy/th'
import { Emoji } from '../design/Emoji'
import { NOTE, PRESS, QUIET_LINK, SOFT } from '../design/look'
import { Button } from '../design/primitives/Button'
import { Sheet } from '../design/primitives/Sheet'
import { districtName } from '../domain/districts'
import { mondayDate } from '../domain/weeks'
import { useIntakeOpen } from '../map/published'
import { cancelPending, checkIn, currentWeek } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { phone } from '../store/stores'
import { DistrictPicker } from './DistrictPicker'
import { Go } from './Go'
import { SendsOnly } from './SendsOnly'

/** How long the toast offers to undo a ✅ (redesign spec 5.2: about five seconds). */
const TOAST_MS = 5000
/** How long "too late to undo" stays. */
const TOO_LATE_MS = 2500

type Toast = { district: string; savedAt: string; late: boolean }

/** On a screen under 360 px the picture goes above the words, so "เจอ / มีอาการ" stays on one line instead of breaking inside มีอาการ. */
const ANSWER = `flex min-h-14 items-center justify-center gap-1.5 rounded-md border-2 border-ink bg-surface px-2 text-center font-bold leading-tight max-[359px]:flex-col max-[359px]:gap-0.5 [@media(max-height:560px)]:min-h-11 ${PRESS}`

/**
 * "ตรวจล่าสุดเป็นไง?" with its two answers, in place of the check-in and send-signal buttons (redesign
 * spec 5.1). ✅ goes in one tap once the phone knows the district, with a few seconds to undo it; the
 * first time, or when it cannot go, a sheet asks for the district or says why (5.2). 🩺 opens its flow (5.3).
 */
export function StatusCard() {
  const { pending, testedNextWeek, myDistrict } = usePartyStore(phone)
  const intakeOpen = useIntakeOpen()
  const [open, setOpen] = useState(false)
  const [chosen, setChosen] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const headingId = useId()
  const card = useRef<HTMLDivElement>(null)
  const clearButton = useRef<HTMLButtonElement>(null)
  const undoButton = useRef<HTMLButtonElement>(null)
  const toastBox = useRef<HTMLDivElement>(null)
  /** The toast held the keyboard when it went, so the keyboard goes back to the card. */
  const refocus = useRef(false)

  const waiting = testedNextWeek !== null && testedNextWeek > currentWeek()
  const known = myDistrict && districtName(myDistrict) ? myDistrict : null
  const blocked = !intakeOpen || (pending !== null && pending.kind !== 'tested')
  const againDate = waiting ? formatThaiDate(mondayDate(testedNextWeek)) : ''

  const hide = () => {
    refocus.current = toastBox.current?.contains(document.activeElement) ?? false
    setToast(null)
  }

  // The toast goes after a few seconds. The report stays, and can still be cancelled at ของฉัน.
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(hide, toast.late ? TOO_LATE_MS : TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast])

  // A new toast takes the keyboard, since the ✅ press it came from is no longer available; when it
  // goes, the keyboard returns to ✅ if that can be pressed again, else to 🩺.
  useEffect(() => {
    if (toast && !toast.late) {
      undoButton.current?.focus()
      return
    }
    if (!refocus.current) return
    refocus.current = false
    if (clearButton.current && !clearButton.current.disabled) clearButton.current.focus()
    else card.current?.querySelector<HTMLAnchorElement>('a[href="/app/report"]')?.focus()
  }, [toast])

  const send = (district: string) => {
    checkIn(district)
    setToast({ district: districtName(district), savedAt: phone.get().pending?.savedAt ?? '', late: false })
  }
  const press = () => {
    if (blocked || !known) {
      setChosen(known)
      setOpen(true)
      return
    }
    send(known)
  }
  const sendChosen = () => {
    if (chosen === null) return
    setOpen(false)
    send(chosen)
  }
  const tooLate = () => {
    refocus.current = true
    setToast((t) => t && { ...t, late: true })
  }
  /**
   * Undoes only the report this toast announced, and never says so of one that went: one this week's
   * envelope has sealed, or one already sent (it is gone, but its four-week wait is still there).
   */
  const undo = () => {
    if (!toast) return
    const now = phone.get()
    if (now.pending?.savedAt !== toast.savedAt) {
      if (now.pending === null && now.testedNextWeek !== null) return tooLate()
      return hide()
    }
    if (cancelPending() === 'sending') return tooLate()
    hide()
  }

  return (
    <div ref={card}>
      {/* On a short screen (under 560 px tall) the card tightens, so the map keeps room above it. */}
      <section aria-labelledby={toast ? undefined : headingId} aria-label={toast ? th.home.ask : undefined} className="box p-3 [@media(max-height:560px)]:p-2">
        {toast ? (
          // The toast takes the question's place for a few seconds, so the card does not grow over the map.
          <div ref={toastBox} role="status" className={`flex min-h-9 items-center gap-2 px-2 text-[14px] font-semibold ${SOFT}`}>
            {toast.late ? (
              <span>{th.home.tooLate}</span>
            ) : (
              <>
                <Emoji name="check" />
                <span className="min-w-0 flex-1">{th.home.toast.replace('{district}', toast.district)}</span>
                <button ref={undoButton} type="button" onClick={undo} className="inline-flex min-h-9 shrink-0 items-center px-2 font-bold underline underline-offset-4">
                  {th.home.undo}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-2">
            <h2 id={headingId} className="text-[17px] font-bold [@media(max-height:560px)]:text-[15px]">
              {th.home.ask}
            </h2>
            {pending && (
              <Go to="/app/me" aria-label={th.home.pendingLabel} className="inline-flex min-h-8 items-center gap-1 text-[12px] font-semibold underline underline-offset-4">
                <Emoji name="envelope" size={16} /> {th.home.pending} <Emoji name="smile" size={16} />
              </Go>
            )}
          </div>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2 [@media(max-height:560px)]:mt-1">
          <button ref={clearButton} type="button" disabled={waiting} onClick={press} className={`${ANSWER} flex-col gap-0 disabled:cursor-not-allowed disabled:bg-veil disabled:shadow-none`}>
            <span className="inline-flex items-center gap-1.5 max-[359px]:flex-col max-[359px]:gap-0.5">
              <Emoji name="check" size={22} />
              {waiting ? th.home.sent : th.home.clear}
            </span>
            {waiting && <span className="text-[12px] font-medium text-muted">{th.home.again.replace('{date}', againDate)}</span>}
          </button>
          <Go to="/app/report" className={ANSWER}>
            <Emoji name="stethoscope" size={22} />
            {th.home.found}
          </Go>
        </div>
        <Go to="/app/list?find=test" className="mt-1 flex min-h-11 items-center justify-center gap-1 text-[14px] [@media(max-height:560px)]:mt-0 [@media(max-height:560px)]:min-h-9">
          {th.home.notTested} <Emoji name="pin" size={18} /> <span className="font-bold underline underline-offset-4">{th.home.findTest}</span>
        </Go>
      </section>

      <Sheet open={open} onClose={() => setOpen(false)} title={th.tested.title} tall>
        {!intakeOpen ? (
          <p className={`flex items-center gap-2 px-3 py-2 text-[14px] ${NOTE}`}>
            <Emoji name="pause" />
            {th.tested.closed}
          </p>
        ) : pending && pending.kind !== 'tested' ? (
          <div className="space-y-2">
            <p className={`flex items-center gap-2 px-3 py-2 text-[14px] font-semibold ${SOFT}`}>
              <Emoji name="envelope" />
              {th.tested.otherPending}
            </p>
            <Go to="/app/me" className={QUIET_LINK}>
              <Emoji name="smile" />
              {th.nav.me}
            </Go>
          </div>
        ) : (
          <div className="space-y-3">
            <DistrictPicker district={chosen} onDistrict={setChosen} name="tested-district" />
            {/* Kept at the foot of the sheet, so the send press stays in view below a long list. */}
            <div className="sticky -bottom-6 -mx-4 -mb-6 space-y-1 border-t-2 border-ink bg-surface px-4 pb-7 pt-1">
              <SendsOnly emoji="check" kind={th.home.clear} extra={[th.report.pastOnly]} />
              <Button size="lg" className="w-full" disabled={chosen === null} onClick={sendChosen}>
                <Emoji name="check" />
                {th.tested.send}
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
