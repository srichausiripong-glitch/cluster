import { afterEach, beforeEach, expect, it, vi, type Mock } from 'vitest'
import { setNextTest, wipePhone } from '../store/actions'
import { phone } from '../store/stores'
import { follow, setPushPlatformForTest, unfollow, type PushPlatform, type Seen } from './follow'

// Following a district on the phone (redesign spec 5.11): only a push address leaves it; the district stays.

const SEEN: Seen = { state: 'shown', density: 'thin', symptoms: null, testing: 'low' }
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
    load: vi.fn(async () => ({ district: 'bang_rak', seen: SEEN })),
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
it('stops following on every wipe, the error screen’s too', async () => {
  const p = platform()
  await follow('bang_rak', SEEN)
  const sub = (await p.subscription()) as Sub
  calls.length = 0
  wipePhone()
  await vi.waitFor(() => expect(sub.unsubscribe).toHaveBeenCalled())
  expect(calls).toEqual([{ url: '/api/push', method: 'DELETE', body: { endpoint: ENDPOINT } }])
  expect(p.save).toHaveBeenLastCalledWith(null)
})
it('asks for permission first, while the press still counts, and sets up nothing when refused', async () => {
  // Safari and Firefox prompt only close to the press; any wait before the question can lose it.
  const order: string[] = []
  const p = platform({
    permission: vi.fn(async () => (order.push('permission'), 'granted' as const)),
    register: vi.fn(async () => void order.push('register')),
  })
  await follow('bang_rak', SEEN)
  expect(order).toEqual(['permission', 'register'])
  order.length = 0
  phone.update((s) => ({ ...s, follow: undefined }))
  const refused = platform({ permission: vi.fn(async () => (order.push('permission'), 'denied' as const)) })
  expect(await follow('bang_rak', SEEN)).toBe('denied')
  expect(refused.register).not.toHaveBeenCalled()
  void p
})
it('keeps the test date in the service worker\'s state while following, and only then', async () => {
  const p = platform()
  setNextTest('2027-02-20')
  await Promise.resolve()
  expect(p.save).not.toHaveBeenCalled()
  await follow('bang_rak', SEEN)
  expect(p.save).toHaveBeenLastCalledWith({ district: 'bang_rak', seen: SEEN, nextTest: '2027-02-20' })
  setNextTest(null)
  await vi.waitFor(() => expect(p.save).toHaveBeenLastCalledWith({ district: 'bang_rak', seen: SEEN }))
})
