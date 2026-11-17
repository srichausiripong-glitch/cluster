import { Check } from 'lucide-react'
import { useState } from 'react'
import { th } from '../copy/th'
import { Emoji } from '../design/Emoji'
import { QUIET_LINK, TEXT_LINK } from '../design/look'
import { follow, unfollow, type FollowResult, type Seen } from '../push/follow'
import { usePartyStore } from '../store/partyStore'
import { phone } from '../store/stores'
import { FOLLOW_NOTE } from './followNote'
import { More } from './More'

/**
 * 🔔 for one district (redesign spec 5.11): follow it, follow it instead of another, or stop. What
 * leaves the phone waits behind ⓘ: only a push address, never the district.
 */
export function FollowButton({ district, seen }: { district: string; seen: Seen | null }) {
  const { follow: followed } = usePartyStore(phone)
  const [result, setResult] = useState<FollowResult | null>(null)
  const [busy, setBusy] = useState(false)
  const mine = followed === district
  const press = async () => {
    setBusy(true)
    if (mine) {
      await unfollow()
      setResult(null)
    } else setResult(await follow(district, seen))
    setBusy(false)
  }
  return (
    <div className="mt-2 space-y-1">
      <button type="button" aria-pressed={mine} disabled={busy} onClick={press} className={`w-full ${QUIET_LINK}`}>
        {mine && <Check data-tick size={16} strokeWidth={3} className="shrink-0" aria-hidden="true" />}
        <Emoji name="bell" />
        {mine ? th.follow.following : followed ? th.follow.instead : th.follow.button}
      </button>
      {result && result !== 'following' && (
        <p role="status" className="text-[13px] text-muted">
          {FOLLOW_NOTE[result]}
        </p>
      )}
      <More summary={th.follow.only}>
        <ul className="space-y-1">
          {th.follow.details.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {/* A new tab, so the sheet stays where it is. */}
        <a href="/privacy" target="_blank" rel="noreferrer" className={`inline-flex min-h-11 items-center ${TEXT_LINK}`}>
          {th.privacy.title}
        </a>
      </More>
    </div>
  )
}
