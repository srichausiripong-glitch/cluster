import { loadPublished } from './published'

/** How often an open, visible app asks for the map again (live map, owner 25 Nov 2026). */
export const LIVE_MS = 30_000

/**
 * Keeps the map current while the app is open: at once, every half minute while in view, and when it
 * comes back into view. Never sooner after this phone's own envelope (final review, 25 Nov 2026): the
 * server's logs would then tell a phone that reported from one that did not. Returns the stop.
 */
export function startLiveMap(): () => void {
  const visible = () => document.visibilityState !== 'hidden'
  const onVisibility = () => {
    if (visible()) void loadPublished()
  }
  void loadPublished()
  const timer = setInterval(() => {
    if (visible()) void loadPublished()
  }, LIVE_MS)
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
