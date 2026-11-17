import { th } from '../copy/th'
import { Emoji } from '../design/Emoji'
import type { EmojiName } from '../design/emojiCodes'
import { TEXT_LINK } from '../design/look'
import { More } from './More'

/**
 * "ส่งแค่: ✅ · เขต · สัปดาห์ ⓘ": what a report carries off the phone, in one line, and the rest behind
 * ⓘ — it waits for the weekly envelope, can be cancelled until then, cannot be taken back after, and
 * the privacy notice (redesign spec 5.2, 5.3).
 */
export function SendsOnly({ emoji, kind, extra = [] }: { emoji: EmojiName; kind: string; extra?: string[] }) {
  return (
    <More
      summary={
        <>
          {th.send.only} <Emoji name={emoji} label={kind} /> {th.send.rest}
        </>
      }
    >
      <ul className="space-y-1">
        {[...th.send.details, ...extra].map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {/* A new tab, so what is being filled in here stays put. */}
      <a href="/privacy" target="_blank" rel="noreferrer" className={`inline-flex min-h-11 items-center ${TEXT_LINK}`}>
        {th.privacy.title}
      </a>
    </More>
  )
}
