import { CalendarPlus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { th } from '../copy/th'
import { Emoji } from '../design/Emoji'
import { Mascot } from '../design/Logo'
import { QUIET_LINK } from '../design/look'
import { Button } from '../design/primitives/Button'
import { Card } from '../design/primitives/Card'
import { Sheet } from '../design/primitives/Sheet'
import { districtName } from '../domain/districts'
import { buildIcs } from '../domain/ics'
import { cancelPending, forgetMyDistrict, setMyDistrict, wipePhone } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { phone } from '../store/stores'
import { DistrictPicker } from './DistrictPicker'
import { Go } from './Go'
import { More } from './More'

/** How long a kept card stays on the phone, per disease group, in days (spec 7.3 bands; HIV and mpox use 28). */
const CARD_DAYS = { gono_chlam: 28, syphilis: 84, mpox: 28, hiv: 28 } as const

function downloadReminder() {
  const date = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10)
  const url = URL.createObjectURL(new Blob([buildIcs([{ date }])], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'reminder.ics'
  a.click()
  URL.revokeObjectURL(url)
}

/** 🙂 ของฉัน: what this phone keeps, to see, change, cancel or wipe (redesign spec 5.2, 5.10). */
export function SelfCare() {
  const { card, pending, myDistrict } = usePartyStore(phone)
  const myDistrictName = myDistrict ? districtName(myDistrict) : ''
  const [changing, setChanging] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [tooLate, setTooLate] = useState(false)
  const days = card ? Math.max(0, Math.floor((Date.now() - new Date(card.sentAt).getTime()) / 86_400_000)) : 0
  const left = card ? Math.max(0, CARD_DAYS[card.group] - days) : 0
  const empty = !card && !pending && !myDistrictName

  // Never says a report was cancelled that this week's envelope is taking (round 2 plan, decision 10).
  const cancel = () => setTooLate(cancelPending() === 'sending')
  const change = () => {
    setPicked(myDistrict ?? null)
    setChanging(true)
  }
  const useDistrict = () => {
    if (picked) setMyDistrict(picked)
    setChanging(false)
  }

  return (
    <main className="space-y-4 p-4">
      <h1 className="text-[20px] font-bold">{th.me.title}</h1>

      {empty && (
        <div className="flex items-center gap-3 box px-4 py-3">
          <Mascot size={56} />
          <p className="text-muted">{th.me.none}</p>
        </div>
      )}

      {card && (
        <Card>
          <p className="flex items-center gap-1.5 text-[13px] text-muted">
            <Emoji name="pushpin" size={16} />
            {th.me.cardTitle}
          </p>
          <p className="text-[20px] font-bold">{th.group[card.group]}</p>
          <p>{days === 0 ? th.me.sentToday : th.me.sent.replace('{n}', String(days))}</p>
          <p className="text-muted">{th.me.expires.replace('{n}', String(left))}</p>
        </Card>
      )}

      {pending && (
        <Card>
          <h2 className="flex items-center gap-1.5 font-bold">
            <Emoji name="envelope" />
            {th.me.pendingTitle}
          </h2>
          <p className="mt-1">{th.me.pendingBody.replace('{kind}', th.me.kind[pending.kind]).replace('{zone}', districtName(pending.zone))}</p>
          <Button variant="secondary" className="mt-2" onClick={cancel}>
            {th.me.cancelPending}
          </Button>
          {tooLate && (
            <p role="status" className="mt-2 text-[13px] font-semibold">
              {th.home.tooLate}
            </p>
          )}
        </Card>
      )}

      {myDistrictName && (
        <Card>
          <p className="flex items-center gap-1.5">
            <Emoji name="pin" />
            {th.me.myDistrict.replace('{district}', myDistrictName)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={change}>
              {th.picker.change}
            </Button>
            <Button variant="secondary" onClick={forgetMyDistrict}>
              {th.me.forgetDistrict}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="flex items-center gap-1.5 font-bold">
          <Emoji name="alarm" />
          {th.me.reminder}
        </h2>
        <Button variant="secondary" className="mt-2" onClick={downloadReminder}>
          <CalendarPlus size={18} strokeWidth={2} aria-hidden="true" />
          {th.me.reminderAdd}
        </Button>
      </Card>

      <Card>
        <Button variant="secondary" onClick={wipePhone}>
          <Trash2 size={18} strokeWidth={2} aria-hidden="true" />
          {th.me.wipe}
        </Button>
        <div className="mt-2">
          <More summary={th.me.wipeMore}>
            <p>{th.me.wipeNote}</p>
            <p>{th.me.iosNote}</p>
          </More>
        </div>
      </Card>

      {/* "Later" in the telling flow promises a way back; this is it. */}
      <Go to={'/app/notify'} className={QUIET_LINK}>
        <Emoji name="speech" />
        {th.report.tell}
      </Go>
      <Go to={'/app/harm'} className={QUIET_LINK}>
        {th.me.harm}
      </Go>

      <Sheet open={changing} onClose={() => setChanging(false)} title={th.tested.title} tall>
        <div className="space-y-3">
          <DistrictPicker district={picked} onDistrict={setPicked} name="my-district" />
          <div className="sticky bottom-0 -mx-4 border-t-2 border-ink bg-surface px-4 pb-1 pt-2">
            <Button size="lg" className="w-full" disabled={!picked} onClick={useDistrict}>
              {th.picker.use}
            </Button>
          </div>
        </div>
      </Sheet>
    </main>
  )
}
