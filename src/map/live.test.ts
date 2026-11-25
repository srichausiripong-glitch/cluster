import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LIVE_MS, startLiveMap } from './live'
import { setPublishedForTest } from './published'

const delivered = new Set<() => void>()
vi.mock('../envelope/send', () => ({
  onDelivered: (fn: () => void) => {
    delivered.add(fn)
    return () => delivered.delete(fn)
  },
}))

const FILE = { week: '2026-W48', publishedAt: 'x', intakeOpen: true, areas: [] }
let urls: string[]
let visibility: DocumentVisibilityState
beforeEach(() => {
  vi.useFakeTimers()
  urls = []
  visibility = 'visible'
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
  vi.stubGlobal('fetch', vi.fn(async (url: string) => (urls.push(String(url)), new Response(JSON.stringify(FILE)))))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  setPublishedForTest(null)
})

// The live map (owner, 25 Nov 2026): the phone asks again while the app is in view.
it('fetches the map at once and every half minute while in view, and not while hidden', async () => {
  const stop = startLiveMap()
  expect(urls).toEqual(['/api/published'])
  await vi.advanceTimersByTimeAsync(LIVE_MS)
  expect(urls).toHaveLength(2)
  visibility = 'hidden'
  await vi.advanceTimersByTimeAsync(LIVE_MS)
  expect(urls).toHaveLength(2)
  visibility = 'visible'
  document.dispatchEvent(new Event('visibilitychange'))
  expect(urls).toHaveLength(3)
  stop()
  await vi.advanceTimersByTimeAsync(LIVE_MS * 3)
  expect(urls).toHaveLength(3)
})
it('fetches past the cache right after this phone’s envelope was accepted', () => {
  const stop = startLiveMap()
  delivered.forEach((fn) => fn())
  expect(urls[1]).toMatch(/^\/api\/published\?fresh=\d+$/)
  stop()
  expect(delivered.size).toBe(0)
})
