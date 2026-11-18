import type { PublishedArea } from '../domain/types'
import { phone } from '../store/stores'

/**
 * Following one district (redesign spec 5.11). Only a push address leaves the phone; the district,
 * and what the phone last saw of it, stay here, where the service worker (public/sw.js) reads them.
 * Following another district later changes only the phone.
 */

/** What the phone last saw of the followed district: its state and its three rows (the age of a signal never counts). */
export type Seen = Pick<PublishedArea, 'state' | 'density' | 'symptoms' | 'testing'>
/** What the service worker reads: the followed district, what was last seen of it, and the test date if one is set. */
type Saved = { district: string; seen: Seen | null; nextTest?: string }
type Subscription = { endpoint: string; unsubscribe(): Promise<boolean> }

/** The browser's part, behind one seam so tests can stand in for it. */
export interface PushPlatform {
  /** 'home-screen': an iPhone or iPad that can take pushes only once the app is on its home screen. */
  support(): 'yes' | 'home-screen' | 'no'
  register(): Promise<void>
  permission(): Promise<NotificationPermission>
  subscription(): Promise<Subscription | null>
  subscribe(key: string): Promise<{ endpoint: string }>
  save(state: Saved | null): Promise<void>
  load(): Promise<Saved | null>
}

export type FollowResult = 'following' | 'home-screen' | 'unsupported' | 'denied' | 'failed'

const BASE = import.meta.env.BASE_URL
const API = `${BASE}api/push`
/** Where the service worker looks: public/sw.js names the same two. */
const CACHE = 'cluster-follow'
const STATE = '/follow-state'

const appleTouch = () => /iPhone|iPad|iPod/.test(navigator.userAgent)

export const browserPlatform: PushPlatform = {
  support() {
    const can = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window
    if (can) return 'yes'
    return typeof navigator !== 'undefined' && appleTouch() ? 'home-screen' : 'no'
  },
  async register() {
    await navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE })
    await navigator.serviceWorker.ready
  },
  permission: () => Notification.requestPermission(),
  async subscription() {
    const registration = await navigator.serviceWorker.getRegistration(BASE)
    return (await registration?.pushManager.getSubscription()) ?? null
  },
  async subscribe(key) {
    const registration = await navigator.serviceWorker.ready
    return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
  },
  async save(state) {
    const cache = await caches.open(CACHE)
    if (state) await cache.put(STATE, new Response(JSON.stringify(state), { headers: { 'content-type': 'application/json' } }))
    else await cache.delete(STATE)
  },
  async load() {
    const hit = await (await caches.open(CACHE)).match(STATE)
    return hit ? ((await hit.json()) as Saved) : null
  },
}

let override: PushPlatform | null = null
export function setPushPlatformForTest(platform: PushPlatform | null): void {
  override = platform
}
const platform = () => override ?? browserPlatform

/** The state for the service worker: the test date goes with it only when one is set. */
const stateFor = (district: string, seen: Seen | null): Saved => {
  const nextTest = phone.get().nextTest
  return nextTest ? { district, seen, nextTest } : { district, seen }
}

const tell = (method: 'POST' | 'DELETE', endpoint: string) => fetch(API, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint }) })

/** Follows a district: the first time it asks for permission and sends the push address; later it only changes the phone. */
export async function follow(district: string, seen: Seen | null): Promise<FollowResult> {
  const p = platform()
  const support = p.support()
  if (support === 'home-screen') return 'home-screen'
  if (support === 'no') return 'unsupported'
  try {
    if (phone.get().follow && (await p.subscription())) {
      await p.save(stateFor(district, seen))
      phone.update((s) => ({ ...s, follow: district }))
      return 'following'
    }
    // Asked first, while the press still counts: Safari and Firefox prompt only close to it.
    if ((await p.permission()) !== 'granted') return 'denied'
    await p.register()
    const key = await fetch(API)
    if (!key.ok) return 'failed'
    const subscription = await p.subscribe(((await key.json()) as { key: string }).key)
    if (!(await tell('POST', subscription.endpoint)).ok) return 'failed'
    await p.save(stateFor(district, seen))
    phone.update((s) => ({ ...s, follow: district }))
    return 'following'
  } catch {
    return 'failed'
  }
}

/** Stops following: the phone forgets at once; the server and the browser are told when they can be. */
export async function unfollow(): Promise<void> {
  const p = platform()
  phone.update((s) => {
    const next = { ...s }
    delete next.follow
    return next
  })
  try {
    await p.save(null)
  } catch {
    // nothing kept to clear
  }
  try {
    const subscription = await p.subscription()
    if (!subscription) return
    await tell('DELETE', subscription.endpoint).catch(() => undefined)
    await subscription.unsubscribe()
  } catch {
    // the server drops the address itself once its push service calls it gone
  }
}

/**
 * Tells a followed district's service worker the test date, keeping what it last saw (2026-11-18
 * design, decision 1). Nothing happens when no district is followed: nothing then reads it.
 */
export async function syncNextTest(date: string | null): Promise<void> {
  const district = phone.get().follow
  if (!district) return
  const p = platform()
  try {
    const kept = await p.load()
    const seen = kept?.seen ?? null
    await p.save(date ? { district, seen, nextTest: date } : { district, seen })
  } catch {
    // the next follow writes it again
  }
}
