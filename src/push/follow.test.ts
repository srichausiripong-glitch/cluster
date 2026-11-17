import { afterEach, beforeEach, expect, it, vi, type Mock } from 'vitest'
import { phone } from '../store/stores'
import { follow, setPushPlatformForTest, unfollow, type PushPlatform, type Seen } from './follow'

// Following a district on the phone (redesign spec 5.11): only a push address leaves it; the district stays.

const SEEN: Seen = { state: 'shown', density: 'thin', symptoms: null, testing: 'thin' }
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc'
type Sub = { endpoint: string; unsubscribe: Mock<() => Promise<boolean>> }

function platform(over: Partial<PushPlatform> = {}) {
  let sub: Sub | null = null
  const p = {
    support: vi.fn((): ReturnType<PushPlatform['support']> => 'yes'),
    register: vi.fn(async () => {}),
    permission: vi.fn(async (): Promise<NotificationPermission> => 'granted'),
    subscription: vi.fn(async () => sub),
    subscribe: vi.fn(async () => {
      sub = { endpoint: ENDPOINT, unsubscribe: vi.fn(async () => true) }
      return sub
    }),
    save: vi.fn(async () => {}),
    ...over,
  }
  setPushPlatformForTest(p)
  return p
}
let calls: { url: string; method: string; body: unknown }[]
let postStatus: number
beforeEach(() => {
  calls = []
  postStatus = 204
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined })
      return init?.method ? new Response(null, { status: postStatus }) : Response.json({ key: 'public-key' })
    }),
  )
})
afterEach(() => vi.unstubAllGlobals())

it('follows a district by sending only the push address, and keeps the district on the phone', async () => {
  const p = platform()
  expect(await follow('bang_rak', SEEN)).toBe('following')
  expect(p.register).toHaveBeenCalled()
  expect(p.subscribe).toHaveBeenCalledWith('public-key')
  expect(calls).toEqual([
    { url: '/api/push', method: 'GET', body: undefined },
    { url: '/api/push', method: 'POST', body: { endpoint: ENDPOINT } },
  ])
  expect(JSON.stringify(calls)).not.toContain('bang_rak')
  expect(p.save).toHaveBeenCalledWith({ district: 'bang_rak', seen: SEEN })
  expect(phone.get().follow).toBe('bang_rak')
})
it('switches to another district without asking the server', async () => {
  const p = platform()
  await follow('bang_rak', SEEN)
  calls.length = 0
  expect(await follow('chatuchak', null)).toBe('following')
  expect(calls).toEqual([])
  expect(p.save).toHaveBeenLastCalledWith({ district: 'chatuchak', seen: null })
  expect(phone.get().follow).toBe('chatuchak')
})
it('stores nothing and says why when notifications are refused', async () => {
  for (const answer of ['denied', 'default'] as const) {
    const p = platform({ permission: vi.fn(async () => answer) })
    expect(await follow('bang_rak', SEEN), answer).toBe('denied')
    expect(calls.filter((c) => c.method !== 'GET')).toEqual([])
    expect(p.save).not.toHaveBeenCalled()
    expect(phone.get().follow).toBeUndefined()
  }
})
it('says what is missing when the browser cannot take Web Push', async () => {
  for (const [support, result] of [['home-screen', 'home-screen'], ['no', 'unsupported']] as const) {
    const p = platform({ support: vi.fn(() => support) })
    expect(await follow('bang_rak', SEEN)).toBe(result)
    expect(p.register).not.toHaveBeenCalled()
    expect(calls).toEqual([])
  }
})
it('keeps nothing when subscribing fails', async () => {
  postStatus = 503
  const refused = platform()
  expect(await follow('bang_rak', SEEN)).toBe('failed')
  expect(refused.save).not.toHaveBeenCalled()
  postStatus = 204
  const broken = platform({ subscribe: vi.fn(async () => Promise.reject(new Error('no push service'))) })
  expect(await follow('bang_rak', SEEN)).toBe('failed')
  expect(broken.save).not.toHaveBeenCalled()
  expect(phone.get().follow).toBeUndefined()
})
it('stops following on the phone at once, and on the server when it can', async () => {
  const p = platform()
  await follow('bang_rak', SEEN)
  const sub = (await p.subscription()) as Sub
  calls.length = 0
  await unfollow()
  expect(phone.get().follow).toBeUndefined()
  expect(p.save).toHaveBeenLastCalledWith(null)
  expect(calls).toEqual([{ url: '/api/push', method: 'DELETE', body: { endpoint: ENDPOINT } }])
  expect(sub.unsubscribe).toHaveBeenCalled()
  await follow('bang_rak', SEEN)
  vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))))
  await expect(unfollow()).resolves.toBeUndefined()
  expect(phone.get().follow).toBeUndefined()
})
