import { CODES, type EmojiName } from './emojiCodes'

/** Every bundled picture, by its file, as a URL on the app's own origin. */
const FILES = import.meta.glob<string>('./emoji/*.svg', { eager: true, query: '?url', import: 'default' })

/** Where an emoji's picture is served: the app's own origin, for an `<img>` or an SVG `<image>` alike. */
export function emojiUrl(name: EmojiName): string {
  return FILES[`./emoji/${CODES[name]}.svg`]
}
