import { onDelivered } from '../envelope/send'
import { loadPublished } from './published'

/** How often an open, visible app asks for the map again (live map, owner 25 Nov 2026). */
export const LIVE_MS = 30_000

/**
 * Keeps the map current while the app is open: at once, every half minute while in view, when it comes
 * back into view, and right after this phone's own envelope was accepted, past the server's few seconds
 * of cache so the sender sees their district change. Returns the stop.
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
  const stopDelivered = onDelivered(() => void loadPublished(true))
  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
    stopDelivered()
  }
}
