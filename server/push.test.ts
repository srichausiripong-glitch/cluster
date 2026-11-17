// @vitest-environment node
import { generateKeyPairSync } from 'node:crypto'
import { beforeEach, expect, it } from 'vitest'
import { DELETE as unsubscribeRoute, GET as keyRoute, POST as subscribeRoute } from '../api/push'
import { migrate, type Db } from './db'
import { setDbForTest, setEnvForTest } from './env'
import { bangkokDay } from './push'
import { testDb } from './testDb'

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
