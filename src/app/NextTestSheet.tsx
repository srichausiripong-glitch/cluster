import { CalendarPlus } from 'lucide-react'
import { useState } from 'react'
import { formatThaiDay } from '../copy/format'
import { th } from '../copy/th'
import { Emoji } from '../design/Emoji'
import { SOFT } from '../design/look'
import { Button } from '../design/primitives/Button'
import { Sheet } from '../design/primitives/Sheet'
import { buildIcs } from '../domain/ics'
import { bangkokDay } from '../domain/weeks'
import { declineNextTest, setNextTest } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { phone } from '../store/stores'

/** Days ahead of each choice: about three and six months. */
const IN_3 = 91
const IN_6 = 182

/** The calendar file keeps buildIcs's neutral title "นัดหมาย": a shared calendar says nothing about health (v1 spec 5.5). */
function downloadCalendar(date: string) {
  const url = URL.createObjectURL(new Blob([buildIcs([{ date }])], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'reminder.ics'
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Sets, changes or clears the day to be reminded to test again (2026-11-18 design, decision 1). The
 * day stays on this phone; a calendar file is offered once a day is chosen.
 */
export function NextTestSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { nextTest } = usePartyStore(phone)
  const [chosen, setChosen] = useState<string | null>(null)
  const close = () => {
    setChosen(null)
    onClose()
  }
  const choose = (days: number) => {
    const date = bangkokDay(new Date(), days)
    setNextTest(date)
    setChosen(date)
  }
  return (
    <Sheet open={open} onClose={close} title={th.nextTest.title}>
      {chosen ? (
        <div className="space-y-3">
          <p role="status" className={`flex items-center gap-2 px-3 py-2 font-semibold ${SOFT}`}>
            <Emoji name="alarm" />
            {th.nextTest.saved.replace('{date}', formatThaiDay(chosen))}
          </p>
          <Button variant="secondary" className="w-full" onClick={() => downloadCalendar(chosen)}>
            <CalendarPlus size={18} strokeWidth={2} aria-hidden="true" />
            {th.nextTest.calendar}
          </Button>
          <Button className="w-full" onClick={close}>
            {th.nextTest.done}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Button className="w-full" onClick={() => choose(IN_3)}>
            {th.nextTest.in3}
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => choose(IN_6)}>
            {th.nextTest.in6}
          </Button>
          {nextTest ? (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setNextTest(null)
                close()
              }}
            >
              {th.nextTest.clear}
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                declineNextTest()
                close()
              }}
            >
              {th.nextTest.no}
            </Button>
          )}
          <p className="pt-1 text-[13px] text-muted">{th.nextTest.note}</p>
        </div>
      )}
    </Sheet>
  )
}
