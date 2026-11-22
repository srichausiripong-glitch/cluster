import type { EmojiName } from './emojiCodes'
import { emojiUrl } from './emojiUrl'

/**
 * An emoji as a picture bundled with the app, so every phone shows the same one (round 2 plan,
 * decisions 1 and 2). It is decorative unless it stands for words: then `label` is its name.
 */
export function Emoji({ name, size = 20, label }: { name: EmojiName; size?: number; label?: string }) {
  return (
    <img
      src={emojiUrl(name)}
      width={size}
      height={size}
      alt={label ?? ''}
      aria-hidden={label ? undefined : 'true'}
      draggable={false}
      className="inline-block shrink-0 align-[-0.2em]"
    />
  )
}
