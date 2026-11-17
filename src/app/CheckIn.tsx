import { CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { formatThaiDate } from '../copy/format'
import { th } from '../copy/th'
import { districtName } from '../domain/districts'
import { mondayDate } from '../domain/weeks'
import { NOTE, SOFT, TEXT_LINK } from '../design/look'
import { Button } from '../design/primitives/Button'
import { Sheet } from '../design/primitives/Sheet'
import { useIntakeOpen } from '../map/published'
import { checkIn, currentWeek } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { phone } from '../store/stores'
import { Check } from './FlowHeader'
import { DistrictPicker } from './DistrictPicker'

/**
 * "ไปเช็กมา ไม่เจออะไร" as a check-in on the home screen (owner, 2026-11-16): one sheet, the same
 * "tested" report the report flow sends, at most once in four weeks. After the first check-in the
 * phone remembers the district (and that the age was confirmed), so the next one is one press.
 */
export function CheckIn({ className = '' }: { className?: string }) {
  const { pending, testedNextWeek, myDistrict } = usePartyStore(phone)
  const intakeOpen = useIntakeOpen()
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [picking, setPicking] = useState(false)
  const [district, setDistrict] = useState<string | null>(null)
  const [adult, setAdult] = useState(false)

  const waiting = testedNextWeek !== null && testedNextWeek > currentWeek()
  const remembered = (myDistrict && districtName(myDistrict)) || undefined
  const useRemembered = remembered !== undefined && !picking
  const chosen = useRemembered ? myDistrict! : district
  const ready = chosen !== null && (remembered !== undefined || adult)
  const againDate = waiting ? formatThaiDate(mondayDate(testedNextWeek)) : ''

  const show = () => {
    setDone(false)
    setPicking(false)
    setDistrict(null)
    setAdult(false)
    setOpen(true)
  }
  const send = () => {
    if (!ready || chosen === null) return
    checkIn(chosen)
    setDone(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        className={`inline-flex min-h-14 max-w-[11rem] items-center gap-2 rounded-full border-[2.5px] border-ink bg-surface px-4 text-left text-ink shadow-pop-lg transition-[transform,box-shadow] duration-75 active:translate-x-[5px] active:translate-y-[5px] active:shadow-none ${className}`}
      >
        <CircleCheck size={22} strokeWidth={2} className="shrink-0" aria-hidden="true" />
        <span className="min-w-0 leading-tight">
          <span className="block text-[16px] font-bold">{waiting ? th.checkIn.done : th.checkIn.cta}</span>
          {waiting ? (
            <span className="block truncate text-[12px] text-muted">{th.checkIn.again.replace('{date}', againDate)}</span>
          ) : (
            remembered && <span className="block truncate text-[12px] text-muted">{remembered}</span>
          )}
        </span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={th.checkIn.title}>
        {done ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-[17px] font-bold">
              <CircleCheck size={22} strokeWidth={2} aria-hidden="true" />
              {th.checkIn.done}
            </p>
            <ul className="space-y-1 text-[14px]">
              <li>{th.report.receiptQueued}</li>
              <li className="text-muted">{th.report.waits}</li>
            </ul>
            <p className={`p-3 text-[13px] ${NOTE}`}>{th.report.pastOnly}</p>
            <Button variant="secondary" className="w-full" onClick={() => setOpen(false)}>
              {th.checkIn.close}
            </Button>
          </div>
        ) : !intakeOpen ? (
          <p className={`px-3 py-2 text-[14px] ${NOTE}`}>{th.checkIn.closed}</p>
        ) : waiting ? (
          <div className="space-y-2">
            <p className="text-[17px] font-bold">{th.checkIn.done}</p>
            <p className={`px-3 py-2 text-[14px] ${NOTE}`}>{th.report.testedAgainFrom.replace('{date}', againDate)}</p>
          </div>
        ) : pending ? (
          <p className={`px-3 py-2 text-[14px] font-semibold ${SOFT}`}>{th.checkIn.otherPending}</p>
        ) : (
          <div className="space-y-3">
            <p className="text-[14px] text-muted">{th.checkIn.hint}</p>
            {useRemembered ? (
              <div className={`flex items-center justify-between gap-2 px-3 py-2 ${SOFT}`}>
                <span className="font-bold">{th.checkIn.at.replace('{district}', remembered)}</span>
                <Button variant="ghost" className="shrink-0" onClick={() => setPicking(true)}>
                  {th.checkIn.changeZone}
                </Button>
              </div>
            ) : (
              <DistrictPicker district={district} onDistrict={setDistrict} name="checkin-district" />
            )}
            {remembered === undefined && <Check id="checkin-adult" label={th.report.age} checked={adult} onChange={setAdult} />}
            <ul className="space-y-1 text-[13px]">
              <li>{th.report.leaves}</li>
              {remembered === undefined && <li>{th.checkIn.remembers}</li>}
            </ul>
            {/* A new tab, so the check-in being filled in here is still here when it closes. */}
            <a href="/privacy" target="_blank" rel="noreferrer" className={`inline-flex min-h-11 items-center text-[13px] ${TEXT_LINK}`}>
              {th.privacy.title}
            </a>
            <Button size="lg" className="w-full" disabled={!ready} onClick={send}>
              {th.checkIn.send}
            </Button>
          </div>
        )}
      </Sheet>
    </>
  )
}
