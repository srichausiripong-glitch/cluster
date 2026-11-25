// @vitest-environment node
import { createPublicKey, generateKeyPairSync, verify } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { beforeEach, expect, it, vi } from 'vitest'
import { GET as notifyRoute } from '../api/cron/notify'
import { DELETE as unsubscribeRoute, GET as keyRoute, POST as subscribeRoute } from '../api/push'
import { shiftWeek } from '../src/domain/weeks'
import { migrate, type Db } from './db'
import { setDbForTest, setEnvForTest } from './env'
import { bangkokDay, MAX_SUBSCRIPTIONS, sendWeekly, subscribe, vapidAuthorization, vapidPublicKey } from './push'
import { testDb } from './testDb'
import { serverWeek } from './week'

// Following a district (redesign spec 5.11): the server keeps a push address and the day it came,
// and nothing else — no district, no IP address.

let db: Db
let jwk: JsonWebKey
beforeEach(async () => {
  db = await testDb()
  await migrate(db)
  setDbForTest(db)
  jwk = generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ format: 'jwk' })
  setEnvForTest({ VAPID_PRIVATE_JWK: JSON.stringify(jwk), VAPID_SUBJECT: 'mailto:ops@example.org', CRON_SECRET: 'cron-secret' })
})
const FCM = 'https://fcm.googleapis.com/fcm/send/abc'
const send = (method: 'POST' | 'DELETE', body: unknown) =>
  new Request('https://cluster.test/api/push', {
    method,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.5' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
const kept = () => db.query<{ endpoint: string; day: string }>('select endpoint, created_on::text as day from push_subscriptions order by endpoint')

it('keeps a push address and the day it was added, and nothing else', async () => {
  expect((await subscribeRoute(send('POST', { endpoint: FCM }))).status).toBe(204)
  expect((await subscribeRoute(send('POST', { endpoint: FCM }))).status).toBe(204)
  expect(await kept()).toEqual([{ endpoint: FCM, day: bangkokDay(new Date()) }])
  const columns = await db.query<{ column_name: string }>("select column_name from information_schema.columns where table_name = 'push_subscriptions' order by column_name")
  expect(columns.map((c) => c.column_name)).toEqual(['created_on', 'endpoint'])
})
it('takes an address only from a known push service, and a body with nothing but the address', async () => {
  for (const body of [
    { endpoint: 'http://fcm.googleapis.com/fcm/send/abc' },
    { endpoint: 'https://evil.example/x' },
    { endpoint: 'https://fcm.googleapis.com.evil.example/x' },
    { endpoint: FCM, district: 'bang_rak' },
    { endpoint: `https://fcm.googleapis.com/${'a'.repeat(2049)}` },
    { endpoint: 42 },
    [FCM],
    'not json',
  ])
    expect((await subscribeRoute(send('POST', body))).status, JSON.stringify(body)).toBe(400)
  expect(await kept()).toEqual([])
  for (const endpoint of ['https://updates.push.services.mozilla.com/wpush/v2/x', 'https://web.push.apple.com/x', 'https://wns2-sg2p.notify.windows.com/w/?token=x'])
    expect((await subscribeRoute(send('POST', { endpoint }))).status, endpoint).toBe(204)
})
it('forgets an address when asked, and says nothing about whether it was there', async () => {
  await subscribeRoute(send('POST', { endpoint: FCM }))
  expect((await unsubscribeRoute(send('DELETE', { endpoint: FCM }))).status).toBe(204)
  expect((await unsubscribeRoute(send('DELETE', { endpoint: FCM }))).status).toBe(204)
  expect(await kept()).toEqual([])
  expect((await unsubscribeRoute(send('DELETE', { endpoint: 'https://evil.example/x' }))).status).toBe(400)
})
it('hands out the public half of the push key, and nothing when the key is not set', async () => {
  const res = await keyRoute(new Request('https://cluster.test/api/push'))
  const body = await res.json()
  const raw = Buffer.from(body.key, 'base64url')
  expect(raw).toHaveLength(65)
  expect(raw[0]).toBe(4)
  expect(raw.subarray(1, 33).toString('base64url')).toBe(jwk.x)
  expect(raw.subarray(33).toString('base64url')).toBe(jwk.y)
  expect(JSON.stringify(body)).not.toContain(jwk.d)
  expect(res.headers.get('cache-control')).toBe('public, max-age=86400')
  setEnvForTest({})
  expect((await keyRoute(new Request('https://cluster.test/api/push'))).status).toBe(503)
  expect((await subscribeRoute(send('POST', { endpoint: FCM }))).status).toBe(503)
})

// ---- the weekly send (Task 2) ----------------------------------------------------------------------
/** Monday 12:00 in Bangkok, when Vercel Cron calls the send. */
const NOON = new Date('2026-11-23T05:00:00Z')
const publishedWeek = (week: string) => db.query('insert into published (week, file) values ($1, $2)', [week, JSON.stringify({ week, publishedAt: 'x', intakeOpen: true, areas: [] })])
type Call = { url: string; init: RequestInit }
const answering = (status: (url: string) => number, calls: Call[] = []) => async (url: string, init: RequestInit) => {
  calls.push({ url, init })
  return new Response(null, { status: status(url) })
}

it('signs each push for its own push service with the server’s key, valid for twelve hours', () => {
  const auth = vapidAuthorization(FCM, jwk, 'mailto:ops@example.org', NOON)
  const [, token, k] = /^vapid t=([^,]+), k=(.+)$/.exec(auth)!
  const [header, claims, signature] = token.split('.')
  expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({ typ: 'JWT', alg: 'ES256' })
  expect(JSON.parse(Buffer.from(claims, 'base64url').toString())).toEqual({ aud: 'https://fcm.googleapis.com', exp: NOON.getTime() / 1000 + 43200, sub: 'mailto:ops@example.org' })
  const publicKey = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: jwk.x!, y: jwk.y! }, format: 'jwk' })
  expect(verify('sha256', Buffer.from(`${header}.${claims}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url'))).toBe(true)
  expect(k).toBe(vapidPublicKey(jwk))
})
it('sends every follower the same empty push once this week’s map is out', async () => {
  await publishedWeek(shiftWeek(serverWeek(NOON), -1))
  const other = 'https://fcm.googleapis.com/fcm/send/def'
  for (const endpoint of [FCM, other]) await subscribe(db, endpoint, '2026-11-20')
  const calls: Call[] = []
  expect(await sendWeekly({ db, jwk, subject: 'mailto:ops@example.org', now: NOON, post: answering(() => 201, calls) })).toEqual({ sent: 2, gone: 0, failed: 0, skipped: false })
  expect(calls.map((c) => c.url).sort()).toEqual([FCM, other])
  const seen = calls.map(({ init }) => {
    const headers = new Headers(init.headers)
    expect(headers.get('authorization')).toMatch(/^vapid t=/)
    headers.delete('authorization')
    return { method: init.method, body: init.body ?? null, headers: [...headers.entries()] }
  })
  expect(seen[0]).toEqual({ method: 'POST', body: null, headers: [['topic', 'cluster-weekly'], ['ttl', '43200'], ['urgency', 'normal']] })
  expect(seen[1]).toEqual(seen[0])
})
it('sends nothing when this week’s map was not published', async () => {
  await publishedWeek(shiftWeek(serverWeek(NOON), -2))
  await subscribe(db, FCM, '2026-11-20')
  const post = vi.fn()
  expect(await sendWeekly({ db, jwk, subject: 'mailto:ops@example.org', now: NOON, post })).toEqual({ sent: 0, gone: 0, failed: 0, skipped: true })
  expect(post).not.toHaveBeenCalled()
})
it('drops an address the push service says is gone, keeps one that failed for another reason, and goes on to the rest', async () => {
  await publishedWeek(shiftWeek(serverWeek(NOON), -1))
  const at = (name: string) => `https://fcm.googleapis.com/fcm/send/${name}`
  for (const name of ['a410', 'b404', 'c500', 'd201', 'e-throws']) await subscribe(db, at(name), '2026-11-20')
  const post = async (url: string) => {
    if (url.endsWith('throws')) throw new Error('offline')
    return new Response(null, { status: Number(url.slice(-3)) })
  }
  expect(await sendWeekly({ db, jwk, subject: 'mailto:ops@example.org', now: NOON, post })).toEqual({ sent: 1, gone: 2, failed: 2, skipped: false })
  expect((await kept()).map((r) => r.endpoint)).toEqual([at('c500'), at('d201'), at('e-throws')])
})
it('answers only Vercel Cron, with what the send did', async () => {
  const cron = (auth?: string) => new Request('https://cluster.test/api/cron/notify', { headers: auth ? { authorization: auth } : {} })
  expect((await notifyRoute(cron())).status).toBe(401)
  expect((await notifyRoute(cron('Bearer wrong'))).status).toBe(401)
  const res = await notifyRoute(cron('Bearer cron-secret'))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ sent: 0, gone: 0, failed: 0, skipped: true })
})
it('runs the weekly send at noon on Monday in Bangkok', () => {
  expect(JSON.parse(readFileSync('vercel.json', 'utf8')).crons).toContainEqual({ path: '/api/cron/notify', schedule: '0 5 * * 1' })
})
it('gives each push service ten seconds and no redirect, and sends to the oldest followers first', async () => {
  await publishedWeek(shiftWeek(serverWeek(NOON), -1))
  await subscribe(db, 'https://fcm.googleapis.com/fcm/send/aaa-newest', '2026-11-22')
  await subscribe(db, 'https://web.push.apple.com/zzz-oldest', '2026-10-01')
  const calls: Call[] = []
  await sendWeekly({ db, jwk, subject: 'mailto:ops@example.org', now: NOON, post: answering(() => 201, calls) })
  expect(calls.map((c) => c.url)).toEqual(['https://web.push.apple.com/zzz-oldest', 'https://fcm.googleapis.com/fcm/send/aaa-newest'])
  for (const { init } of calls) {
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(init.redirect).toBe('error')
  }
})
it('takes no new address once the list is full, but still takes one it already has', async () => {
  await db.query("insert into push_subscriptions select 'https://fcm.googleapis.com/fcm/send/x' || g, '2026-11-01' from generate_series(1, $1::int) g", [MAX_SUBSCRIPTIONS])
  expect((await subscribeRoute(send('POST', { endpoint: FCM }))).status).toBe(503)
  expect((await subscribeRoute(send('POST', { endpoint: 'https://fcm.googleapis.com/fcm/send/x1' }))).status).toBe(204)
  const [{ n }] = await db.query<{ n: number }>('select count(*)::int as n from push_subscriptions')
  expect(n).toBe(MAX_SUBSCRIPTIONS)
}, 30_000)

// Final review of the live map (25 Nov 2026): the daily job stores this week's snapshot, so by Monday noon
// the latest row is this week's; the weekly push still goes.
it('sends the weekly push when the daily job has already stored this week’s snapshot', async () => {
  await publishedWeek(shiftWeek(serverWeek(NOON), -1))
  await publishedWeek(serverWeek(NOON))
  await subscribe(db, FCM, '2026-11-20')
  expect(await sendWeekly({ db, jwk, subject: 'mailto:ops@example.org', now: NOON, post: answering(() => 201, []) })).toMatchObject({ sent: 1, skipped: false })
})
