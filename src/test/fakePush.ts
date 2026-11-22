import { vi, type Mock } from 'vitest'
import { setPushPlatformForTest, type PushPlatform } from '../push/follow'

export const PUSH_ENDPOINT = 'https://fcm.googleapis.com/fcm/send/test'
export type PushCall = { url: string; method: string; body: unknown }

/**
 * A browser that takes Web Push and a server that answers /api/push, for screens that follow a district.
 * Other requests go on as before. Pair it with vi.unstubAllGlobals() after the test.
 */
export function fakePush(over: Partial<PushPlatform> = {}) {
  let subscription: { endpoint: string; unsubscribe: Mock<() => Promise<boolean>> } | null = null
  const calls: PushCall[] = []
  const platform: PushPlatform = {
    support: () => 'yes',
    register: async () => {},
    permission: async () => 'granted',
    subscription: async () => subscription,
    subscribe: async () => {
      subscription = { endpoint: PUSH_ENDPOINT, unsubscribe: vi.fn(async () => true) }
      return subscription
    },
    save: async () => {},
    saveNextTest: async () => {},
    ...over,
  }
  setPushPlatformForTest(platform)
  const before = globalThis.fetch
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (!String(url).endsWith('/api/push')) return before(url, init)
      calls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined })
      return init?.method ? new Response(null, { status: 204 }) : Response.json({ key: 'public-key' })
    }),
  )
  return { calls, unsubscribed: () => subscription?.unsubscribe.mock.calls.length ?? 0 }
}
