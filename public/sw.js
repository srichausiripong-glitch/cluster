// Cluster's service worker: the weekly notification of a followed district (redesign spec 5.11).
// It has no fetch handler, so the app loads exactly as it does without it. It learns the week's news
// from the public weekly file, the same for every phone, and compares the followed district here, on
// the phone: no request it makes names a district, and no notification names a district or a disease.

const CACHE = 'cluster-follow'
const STATE = '/follow-state'
const TITLE = 'Cluster'
const CHANGED = 'เขตที่คุณติดตามมีอัปเดต'
const SAME = 'แผนที่สัปดาห์นี้อัปเดตแล้ว'
/** What counts as a change: the state, or any of the three rows. The age of a signal (step) never does. */
const ROWS = ['state', 'density', 'symptoms', 'testing']

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('push', (event) => event.waitUntil(weekly()))
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(openFollowed())
})
self.addEventListener('pushsubscriptionchange', (event) => event.waitUntil(renew(event.oldSubscription)))

async function readState() {
  try {
    const hit = await (await caches.open(CACHE)).match(STATE)
    return hit ? await hit.json() : null
  } catch {
    return null
  }
}

async function saveState(state) {
  const cache = await caches.open(CACHE)
  await cache.put(STATE, new Response(JSON.stringify(state), { headers: { 'content-type': 'application/json' } }))
}

const rowOf = (area) => ({ state: area.state, density: area.density ?? null, symptoms: area.symptoms ?? null, testing: area.testing ?? null })
const differs = (seen, now) => ROWS.some((key) => seen[key] !== now[key])

/**
 * Every push shows a notification, whatever goes wrong: a browser takes back the right to notify from a
 * site whose pushes show nothing. Only a compare that worked moves what was seen to this week.
 */
async function weekly() {
  let body = SAME
  try {
    const state = await readState()
    if (state && state.district) {
      const res = await fetch('/api/published', { cache: 'no-store' })
      if (res.ok) {
        const file = await res.json()
        const area = (file.areas || []).find((a) => a.areaId === state.district)
        if (area) {
          const now = rowOf(area)
          if (state.seen && differs(state.seen, now)) body = CHANGED
          await saveState({ district: state.district, seen: now })
        }
      }
    }
  } catch {
    // the plain line
  }
  await self.registration.showNotification(TITLE, { body, tag: 'cluster-weekly', icon: '/icon-192.png' })
}

/** The app opens the followed district's sheet from its own store: no district travels in the address. */
async function openFollowed() {
  const url = '/app#follow'
  const [open] = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  if (open) {
    try {
      const moved = await open.navigate(url)
      return await (moved || open).focus()
    } catch {
      // a window this worker does not control cannot be moved: open another
    }
  }
  return self.clients.openWindow(url)
}

const tell = (method, endpoint) => fetch('/api/push', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint }) })

/** The browser renewed its push address: subscribe again with the same key, and swap the address on the server. */
async function renew(old) {
  try {
    const { key } = await (await fetch('/api/push')).json()
    const fresh = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
    await tell('POST', fresh.endpoint)
    if (old && old.endpoint && old.endpoint !== fresh.endpoint) await tell('DELETE', old.endpoint)
  } catch {
    // the next press of 🔔 subscribes again
  }
}
