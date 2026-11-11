import { th } from '../copy/th'
import { usePartyStore } from '../store/partyStore'
import { ledger } from '../store/stores'
import { PartyTag } from './PartyTag'

/** Every action, newest first, tagged with the party whose store it wrote. */
export function LedgerTimeline({ limit = 40 }: { limit?: number }) {
  const entries = [...usePartyStore(ledger).entries].reverse().slice(0, limit)
  return (
    <section role="region" aria-label={th.data.timeline} className="rounded-md border border-line bg-surface p-4">
      <h2 className="mb-2 font-semibold">{th.data.timeline}</h2>
      {entries.length === 0 ? (
        <p className="text-muted">{th.data.timelineEmpty}</p>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry, i) => (
            <li key={`${entry.at}-${i}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[15px]">
              <time className="text-[12px] tabular-nums text-muted">{new Date(entry.at).toLocaleTimeString('th-TH', { hour12: false })}</time>
              <PartyTag party={entry.party} />
              <span className="min-w-0 break-words">{entry.detail}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
