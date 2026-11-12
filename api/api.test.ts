// @vitest-environment node
import { beforeEach, expect, it } from 'vitest'
import { makePlain, powInput } from '../src/domain/envelope'
import { shiftWeek } from '../src/domain/weeks'
import { solvePow } from '../src/envelope/pow'
import { seal } from '../src/envelope/seal'
import { migrate, type Db } from '../server/db'
import { setDbForTest, setEnvForTest } from '../server/env'
import { testDb } from '../server/testDb'
import { serverWeek } from '../server/week'
import { POST as envelope } from './envelope'
import { POST as harm } from './harm'
import { GET as key } from './key'
import { GET as published } from './published'
import { GET as cron } from './cron/publish'

let db: Db
let publicJwk: JsonWebKey
beforeEach(async () => {
  db = await testDb()
  await migrate(db)
  setDbForTest(db)
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
  setEnvForTest({ ENVELOPE_PRIVATE_JWK: JSON.stringify(await crypto.subtle.exportKey('jwk', pair.privateKey)), POW_BITS: '8', CRON_SECRET: 'cron-secret' })
})
const req = (path: string, init?: RequestInit) => new Request(`https://cluster.test${path}`, init)
const post = (path: string, body: unknown, ip = '203.0.113.5') => req(path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: typeof body === 'string' ? body : JSON.stringify(body) })

it('gives the week, the work to do and the public key, never the private part', async () => {
  const res = await key(req('/api/key'))
  const body = await res.json()
  expect(body).toEqual({ week: serverWeek(new Date()), bits: 8, jwk: { kty: 'EC', crv: 'P-256', x: publicJwk.x, y: publicJwk.y } })
  expect(JSON.stringify(body)).not.toContain('"d"')
  expect(res.headers.get('cache-control')).toBe('no-store')
})
it('takes an envelope made by the phone, and refuses what is not one', async () => {
  const { week, bits, jwk } = await (await key(req('/api/key'))).json()
  const sealed = await seal(makePlain({ kind: 'tested', zone: 'south', savedAt: 'x' }, () => 0.5, 'n1'), jwk)
  const pow = (await solvePow(powInput(sealed.ct, week), bits)).padStart(10, '0')
  expect((await envelope(post('/api/envelope', { ...sealed, pow }))).status).toBe(202)
  expect((await envelope(post('/api/envelope', 'not json'))).status).toBe(400)
  expect(await db.query('select * from counts')).toHaveLength(1)
})
it('answers with an empty file before anything has been published', async () => {
  const res = await published(req('/api/published'))
  expect(await res.json()).toEqual({ week: null, publishedAt: null, intakeOpen: true, areas: [] })
  expect(res.headers.get('cache-control')).toBe('public, max-age=3600')
})
it('counts a harm report by kind, and refuses a kind it does not know', async () => {
  expect((await harm(post('/api/harm', { kind: 'outed' }))).status).toBe(202)
  expect((await harm(post('/api/harm', { kind: 'free text' }))).status).toBe(400)
  expect(await db.query('select kind, n from harm_reports')).toEqual([{ kind: 'outed', n: 1 }])
})
it('publishes only for the cron secret, and then serves the new file', async () => {
  expect((await cron(req('/api/cron/publish'))).status).toBe(401)
  expect((await cron(req('/api/cron/publish', { headers: { authorization: 'Bearer wrong' } }))).status).toBe(401)
  const res = await cron(req('/api/cron/publish', { headers: { authorization: 'Bearer cron-secret' } }))
  expect(res.status).toBe(200)
  const file = await (await published(req('/api/published'))).json()
  expect(file.week).toBe(shiftWeek(serverWeek(new Date()), -1))
  expect(file.areas).toHaveLength(7)
})
