// @vitest-environment node
import { beforeEach, expect, it } from 'vitest'
import { makePlain, powInput } from '../src/domain/envelope'
import { solvePow } from '../src/envelope/pow'
import { seal } from '../src/envelope/seal'
import { migrate, type Db } from './db'
import { setDbForTest, setEnvForTest } from './env'
import { testDb } from './testDb'
import { serverDay, serverWeek } from './week'
import { POST as envelope } from '../api/envelope'
import { POST as harm } from '../api/harm'
import { POST as place } from '../api/place'
import { GET as key } from '../api/key'
import { GET as published } from '../api/published'
import { GET as cron } from '../api/cron/publish'

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

it('gives the week, the day, the work to do and the public key, never the private part', async () => {
  const res = await key(req('/api/key'))
  const body = await res.json()
  expect(body).toEqual({ week: serverWeek(new Date()), day: serverDay(new Date()), bits: 8, intakeOpen: true, jwk: { kty: 'EC', crv: 'P-256', x: publicJwk.x, y: publicJwk.y } })
  expect(JSON.stringify(body)).not.toContain('"d"')
  expect(res.headers.get('cache-control')).toBe('no-store')
})
it('takes an envelope made by the phone, and refuses what is not one', async () => {
  const { week, bits, jwk } = await (await key(req('/api/key'))).json()
  const sealed = await seal(makePlain({ kind: 'tested', zone: 'bang_rak', savedAt: 'x' }, () => 0.5, 'n1'), jwk)
  const pow = (await solvePow(powInput(sealed.ct, week), bits)).padStart(10, '0')
  expect((await envelope(post('/api/envelope', { ...sealed, pow }))).status).toBe(202)
  expect((await envelope(post('/api/envelope', 'not json'))).status).toBe(400)
  expect(await db.query('select * from counts')).toHaveLength(1)
})
// The live map (owner, 25 Nov 2026): worked out from the counts on every request, cached for seconds.
const LIVE_CACHE = 'public, max-age=0, s-maxage=10, stale-while-revalidate=20'
it('answers with this week, every area uncoloured, before any report', async () => {
  const res = await published(req('/api/published'))
  const file = await res.json()
  expect(file).toMatchObject({ week: serverWeek(new Date()), intakeOpen: true })
  expect(file.areas).toHaveLength(51)
  expect(file.areas.every((a: { state: string }) => a.state !== 'shown')).toBe(true)
  expect(res.headers.get('cache-control')).toBe(LIVE_CACHE)
})
it('colours a district from an envelope accepted a moment ago, without waiting for a job', async () => {
  const { week, bits, jwk } = await (await key(req('/api/key'))).json()
  const sealed = await seal(makePlain({ kind: 'syphilis', zone: 'bang_rak', savedAt: 'x' }, () => 0.5, 'n-live'), jwk)
  const pow = (await solvePow(powInput(sealed.ct, week), bits)).padStart(10, '0')
  expect((await envelope(post('/api/envelope', { ...sealed, pow }))).status).toBe(202)
  const file = await (await published(req('/api/published'))).json()
  expect(file.areas.find((a: { areaId: string }) => a.areaId === 'bang_rak')).toMatchObject({ state: 'shown', density: 'thin', step: 'new' })
})
it('counts a harm report by kind, and refuses a kind it does not know', async () => {
  expect((await harm(post('/api/harm', { kind: 'outed' }))).status).toBe(202)
  expect((await harm(post('/api/harm', { kind: 'free text' }))).status).toBe(400)
  expect(await db.query('select kind, n from harm_reports')).toEqual([{ kind: 'outed', n: 1 }])
})
it('runs the daily job only for the cron secret, and stores this week’s snapshot', async () => {
  expect((await cron(req('/api/cron/publish'))).status).toBe(401)
  expect((await cron(req('/api/cron/publish', { headers: { authorization: 'Bearer wrong' } }))).status).toBe(401)
  const res = await cron(req('/api/cron/publish', { headers: { authorization: 'Bearer cron-secret' } }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ week: serverWeek(new Date()) })
  expect((await db.query<{ week: string }>('select week from published')).map((r) => r.week)).toEqual([serverWeek(new Date())])
})

it('counts at most three harm reports from one network in a week', async () => {
  const send = (ip: string) => harm(new Request('https://cluster.test/api/harm', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify({ kind: 'violence' }) }))
  for (let i = 0; i < 10; i++) expect((await send('203.0.113.9')).status).toBe(202)
  await send('198.51.100.4')
  expect((await db.query<{ n: number }>("select n from harm_reports where kind = 'violence'"))[0].n).toBe(4)
})

it('says at once that intake closed, in the published file and in the key answer', async () => {
  await db.query("insert into published (week, file) values ('2026-W45', $1)", [JSON.stringify({ week: '2026-W45', publishedAt: 'x', intakeOpen: true, areas: [] })])
  await db.query("insert into settings (name, value) values ('intake', 'closed')")
  const res = await published(req('/api/published'))
  expect((await res.json()).intakeOpen).toBe(false)
  expect(res.headers.get('cache-control')).toBe(LIVE_CACHE)
  expect((await (await key(req('/api/key'))).json()).intakeOpen).toBe(false)
})

// ---- corrections from users (2026-11-18 design, decision 4) ----------------------------------------
const rows = () => db.query<{ place: string; kind: string; value: string; n: number }>('select place, kind, value, n from place_reports order by kind')
it('counts a correction by place and kind, with the number only for the phone kinds', async () => {
  expect((await place(post('/api/place', { place: 'osm-node-1', kind: 'closed' }))).status).toBe(202)
  expect((await place(post('/api/place', { place: 'osm-node-1', kind: 'add_phone', phone: '02 123 4567' }))).status).toBe(202)
  expect((await place(post('/api/place', { place: 'osm-node-1', kind: 'add_phone', phone: '021234567' }, '198.51.100.4'))).status).toBe(202)
  expect(await rows()).toEqual([
    { place: 'osm-node-1', kind: 'add_phone', value: '021234567', n: 2 },
    { place: 'osm-node-1', kind: 'closed', value: '', n: 1 },
  ])
})
it('refuses a phone on a kind that takes none, and anything not a Thai number', async () => {
  for (const body of [
    { place: 'osm-node-1', kind: 'closed', phone: '021234567' },
    { place: 'osm-node-1', kind: 'add_phone' },
    { place: 'osm-node-1', kind: 'add_phone', phone: '12345' },
    { place: 'osm-node-1', kind: 'wrong_phone', phone: 'call me 0812345678' },
    { place: 'osm-node-1', kind: 'add_phone', phone: '0812345678', note: 'free text' },
    { place: 'osm-node-1', kind: 'free text' },
  ])
    expect((await place(post('/api/place', body))).status, JSON.stringify(body)).toBe(400)
  expect((await place(post('/api/place', 'not json'))).status).toBe(400)
  expect(await rows()).toEqual([])
})
it('counts at most five corrections from one network in a week', async () => {
  for (let i = 0; i < 10; i++) expect((await place(post('/api/place', { place: 'bma-phc-13646', kind: 'hours' }, '203.0.113.9'))).status).toBe(202)
  await place(post('/api/place', { place: 'bma-phc-13646', kind: 'hours' }, '198.51.100.4'))
  expect((await rows())[0].n).toBe(6)
})
it('refuses a place id of the wrong shape', async () => {
  for (const id of ['Bang Rak!', 'ab', 'x'.repeat(65), 42]) expect((await place(post('/api/place', { place: id, kind: 'closed' }))).status, String(id)).toBe(400)
})
it('takes only the ids the place lists use, so no text can ride in an id', async () => {
  for (const id of ['osm-node-123', 'osm-way-45', 'bma-phc-13646', 'bma-hos-9', 'trc-anonymous-clinic']) expect((await place(post('/api/place', { place: id, kind: 'closed' }, `198.51.100.${id.length}`))).status, id).toBe(202)
  for (const id of ['somchai-0812345678-hiv', 'osm-node-12a', 'bma-phc-abc']) expect((await place(post('/api/place', { place: id, kind: 'closed' }))).status, id).toBe(400)
})
it('takes a place number written with +66, as the phone writes it', async () => {
  expect((await place(post('/api/place', { place: 'osm-node-1', kind: 'add_phone', phone: '+66 81 234 5678' }))).status).toBe(202)
  expect((await rows())[0].value).toBe('0812345678')
})
