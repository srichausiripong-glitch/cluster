// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it, vi } from 'vitest'
import { th } from '../copy/th'
import { DISTRICTS } from '../domain/districts'

// The service worker (redesign spec 5.11), run here as the real file in a sandbox: the browser objects
// it reaches — self, caches, fetch — are stand-ins.

const CODE = readFileSync('public/sw.js', 'utf8')
type Row = { state: string; density: string | null; symptoms: string | null; testing: string | null }
type Window = { navigate: ReturnType<typeof vi.fn>; focus: ReturnType<typeof vi.fn> }

function worker(opts: { state?: { district: string; seen: Row | null }; published?: unknown; windows?: Window[] } = {}) {
  const listeners = new Map<string, (event: object) => void>()
  const store = new Map<string, string>()
  if (opts.state) store.set('/follow-state', JSON.stringify(opts.state))
  const cache = {
    match: async (key: string) => (store.has(key) ? new Response(store.get(key)) : undefined),
    put: async (key: string, res: Response) => void store.set(key, await res.text()),
  }
  const caches = { open: vi.fn(async () => cache) }
  const calls: { url: string; init?: RequestInit }[] = []
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    if (url === '/api/push' && !init?.method) return Response.json({ key: 'public-key' })
    if (url === '/api/push') return new Response(null, { status: 204 })
    if (opts.published instanceof Error) throw opts.published
    if (typeof opts.published === 'number') return new Response(null, { status: opts.published })
    return Response.json(opts.published ?? { week: null, areas: [] })
  })
  const shown: { title: string; options: NotificationOptions }[] = []
  const subscribe = vi.fn(async () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/new' }))
  const self = {
    addEventListener: (type: string, fn: (event: object) => void) => listeners.set(type, fn),
    skipWaiting: vi.fn(),
    registration: { showNotification: vi.fn(async (title: string, options: NotificationOptions) => void shown.push({ title, options })), pushManager: { subscribe } },
    clients: { claim: vi.fn(), matchAll: vi.fn(async () => opts.windows ?? []), openWindow: vi.fn() },
  }
  new Function('self', 'caches', 'fetch', CODE)(self, caches, fetch)
  const fire = async (type: string, event: object = {}) => {
    const waits: Promise<unknown>[] = []
    listeners.get(type)!({ ...event, waitUntil: (p: Promise<unknown>) => waits.push(p) })
    await Promise.all(waits)
  }
  const saved = () => JSON.parse(store.get('/follow-state') ?? 'null')
  return { fire, shown, calls, self, saved, subscribe, caches }
}
const ROW: Row = { state: 'shown', density: 'thin', symptoms: null, testing: 'thin' }
const file = (row: Partial<Row> & { step?: string }) => ({ week: '2026-W47', areas: [{ areaId: 'chatuchak', ...ROW }, { areaId: 'bang_rak', ...ROW, step: 'new', ...row }] })
const NOTE = { tag: 'cluster-weekly', icon: '/icon-192.png' }

it('tells of an update when the followed district’s state or any of its three rows changed, and saves what it saw', async () => {
  for (const change of [{ density: 'medium' }, { symptoms: 'thin' }, { testing: null }, { state: 'suspended' }]) {
    const sw = worker({ state: { district: 'bang_rak', seen: ROW }, published: file(change) })
    await sw.fire('push')
    expect(sw.shown, JSON.stringify(change)).toEqual([{ title: th.weekly.title, options: { body: th.weekly.changed, ...NOTE } }])
    expect(sw.saved()).toEqual({ district: 'bang_rak', seen: { ...ROW, ...change } })
  }
})
it('says only that the map was updated when nothing changed but the age of the signal', async () => {
  const sw = worker({ state: { district: 'bang_rak', seen: ROW }, published: file({ step: 'followup' }) })
  await sw.fire('push')
  expect(sw.shown).toEqual([{ title: th.weekly.title, options: { body: th.weekly.same, ...NOTE } }])
  expect(sw.calls.map((c) => c.url)).toEqual(['/api/published'])
})
it('still shows the plain weekly line when the weekly file cannot be read, and keeps what was seen', async () => {
  for (const published of [new Error('offline'), 500]) {
    const sw = worker({ state: { district: 'bang_rak', seen: ROW }, published })
    await sw.fire('push')
    expect(sw.shown).toEqual([{ title: th.weekly.title, options: { body: th.weekly.same, ...NOTE } }])
    expect(sw.saved()).toEqual({ district: 'bang_rak', seen: ROW })
  }
})
it('shows the plain weekly line when the phone follows no district, or saw nothing yet, and starts from this week', async () => {
  const none = worker({ published: file({ density: 'medium' }) })
  await none.fire('push')
  expect(none.shown.map((s) => s.options.body)).toEqual([th.weekly.same])
  expect(none.calls).toEqual([])
  const fresh = worker({ state: { district: 'bang_rak', seen: null }, published: file({ density: 'medium' }) })
  await fresh.fire('push')
  expect(fresh.shown.map((s) => s.options.body)).toEqual([th.weekly.same])
  expect(fresh.saved().seen).toEqual({ ...ROW, density: 'medium' })
})
it('opens the app at /app#follow when the notification is tapped, in a window already open if there is one', async () => {
  const open: Window = { navigate: vi.fn(async () => open), focus: vi.fn() }
  const withWindow = worker({ windows: [open] })
  const close = vi.fn()
  await withWindow.fire('notificationclick', { notification: { close } })
  expect(close).toHaveBeenCalled()
  expect(open.navigate).toHaveBeenCalledWith('/app#follow')
  expect(open.focus).toHaveBeenCalled()
  expect(withWindow.self.clients.openWindow).not.toHaveBeenCalled()
  const without = worker()
  await without.fire('notificationclick', { notification: { close: vi.fn() } })
  expect(without.self.clients.openWindow).toHaveBeenCalledWith('/app#follow')
})
it('subscribes again when the browser renews its push address, and tells the server', async () => {
  const sw = worker()
  await sw.fire('pushsubscriptionchange', { oldSubscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/old' } })
  expect(sw.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: 'public-key' })
  const told = sw.calls.filter((c) => c.init?.method).map((c) => [c.init!.method, JSON.parse(String(c.init!.body))])
  expect(told).toEqual([
    ['POST', { endpoint: 'https://fcm.googleapis.com/fcm/send/new' }],
    ['DELETE', { endpoint: 'https://fcm.googleapis.com/fcm/send/old' }],
  ])
})
it('puts no district, disease or report word in what a notification can say, and asks only its own server', () => {
  for (const d of DISTRICTS) expect(CODE, d.name).not.toContain(d.name)
  for (const word of Object.values(th.report.found)) expect(CODE, word).not.toContain(word)
  for (const line of Object.values(th.weekly)) expect(CODE).toContain(`'${line}'`)
  const urls = [...CODE.matchAll(/fetch\(\s*'([^']*)'/g)].map((m) => m[1])
  expect(urls.length).toBeGreaterThan(0)
  for (const url of urls) expect(url.startsWith('/'), url).toBe(true)
  expect(CODE).not.toMatch(/addEventListener\(\s*'fetch'/)
})
it('serves the service worker and the pharmacy file themselves, not the app page', () => {
  const pattern = new RegExp(`^${JSON.parse(readFileSync('vercel.json', 'utf8')).rewrites[0].source}$`)
  expect(pattern.test('/sw.js')).toBe(false)
  expect(pattern.test('/care/pharmacies.json')).toBe(false)
  expect(pattern.test('/app/list')).toBe(true)
})
