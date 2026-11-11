import { CalendarPlus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { th } from '../copy/th'
import { buildIcs } from '../domain/ics'
import { QUIET_LINK } from '../design/look'
import { Button } from '../design/primitives/Button'
import { Card } from '../design/primitives/Card'
import { wipePhone } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { phone } from '../store/stores'
import { useEmbedTo } from './embed'

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

export function SelfCare() {
  const to = useEmbedTo()
  const { card } = usePartyStore(phone)
  const days = card ? Math.max(0, Math.floor((Date.now() - new Date(card.sentAt).getTime()) / 86_400_000)) : 0
  const left = card ? Math.max(0, CARD_DAYS[card.group] - days) : 0

  return (
    <main className="space-y-4 p-4">
      <h1 className="text-[20px] font-bold">{th.me.title}</h1>

      {card ? (
        <Card>
          <p className="text-[13px] text-muted">{th.me.cardTitle}</p>
          <p className="text-[20px] font-bold">{th.group[card.group]}</p>
          <p>{days === 0 ? th.me.sentToday : th.me.sent.replace('{n}', String(days))}</p>
          <p className="text-muted">{th.me.expires.replace('{n}', String(left))}</p>
        </Card>
      ) : (
        <Card>
          <p className="text-muted">{th.me.none}</p>
        </Card>
      )}

      <Card>
        <h2 className="font-bold">{th.me.reminder}</h2>
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
        <p className="mt-2 text-[13px] text-muted">{th.me.wipeNote}</p>
        <p className="mt-1 text-[13px] text-muted">{th.me.iosNote}</p>
      </Card>

      <Link to={to('/app/harm')} className={QUIET_LINK}>
        {th.me.harm}
      </Link>
    </main>
  )
}
