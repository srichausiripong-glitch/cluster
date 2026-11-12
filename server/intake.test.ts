// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { makePlain, powInput } from '../src/domain/envelope'
import type { PendingReport } from '../src/domain/types'
import { solvePow } from '../src/envelope/pow'
import { seal } from '../src/envelope/seal'
import { createHmac } from 'node:crypto'
import { migrate, type Db } from './db'
import { setEnvForTest } from './env'
import { networkGroup } from './keys'
import { intake } from './intake'
import { testDb } from './testDb'
import { serverWeek } from './week'

const NOW = new Date('2026-11-12T05:00:00Z')
const WEEK = serverWeek(NOW)
const BITS = 8
let db: Db
let privateJwk: JsonWebKey
let publicJwk: JsonWebKey

beforeEach(async () => {
  db = await testDb()
  await migrate(db)
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
  publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
})

let n = 0
async function envelope(pending: PendingReport | null, over: { pow?: string; week?: string } = {}) {
  const plain = makePlain(pending, () => 0.5, `nonce-${++n}-${Math.random()}`)
  const sealed = await seal(plain, publicJwk)
  const pow = over.pow ?? (await solvePow(powInput(sealed.ct, over.week ?? WEEK), BITS)).padStart(10, '0')
  return { ...sealed, pow }
}
const deps = (ip = '203.0.113.7') => ({ db, privateJwk, bits: BITS, now: NOW, ip })
const report = (kind: PendingReport['kind'], zone = 'south'): PendingReport => ({ kind, zone, savedAt: 'x' })
const count = async (zone: string, kind: string) => (await db.query<{ n: number }>('select n from counts where zone = $1 and kind = $2 and week = $3', [zone, kind, WEEK]))[0]?.n ?? 0
const totals = async () => (await db.query<{ n: number }>('select n from envelope_totals where week = $1', [WEEK]))[0]?.n ?? 0

it('counts a report into its zone and kind, counts the envelope, and keeps nothing else of it', async () => {
  expect(await intake(await envelope(report('syphilis')), deps())).toEqual({ status: 202 })
  expect(await count('south', 'syphilis')).toBe(1)
  expect(await totals()).toBe(1)
  expect(await db.query('select * from seen_nonces')).toHaveLength(1)
})
it('counts an empty envelope and no report', async () => {
  expect(await intake(await envelope(null), deps())).toEqual({ status: 202 })
  expect(await totals()).toBe(1)
  expect(await db.query('select * from counts')).toHaveLength(0)
})
it('does not count the same envelope twice', async () => {
  const env = await envelope(report('tested'))
  await intake(env, deps())
  expect(await intake(env, deps())).toEqual({ status: 202 })
  expect(await count('south', 'tested')).toBe(1)
  expect(await totals()).toBe(1)
})
it('refuses bad proof of work, a stale week, bad JSON, a wrong size, and a zone or kind it does not know', async () => {
  const good = await envelope(report('syphilis'))
  const cases: unknown[] = [
    { ...good, pow: '0000000000' },
    await envelope(report('syphilis'), { week: '2026-W01' }),
    'not json',
    { ...good, ct: good.ct.slice(4) },
    await envelope({ kind: 'syphilis', zone: 'mars', savedAt: 'x' }),
    await envelope({ kind: 'hiv' as never, zone: 'south', savedAt: 'x' }),
  ]
  for (const body of cases) expect(await intake(body, deps())).toEqual({ status: 400 })
  expect(await db.query('select * from counts')).toHaveLength(0)
})
it('stops counting reports from one network after thirty in a week, and keeps no part of its address', async () => {
  for (let i = 0; i < 31; i++) await intake(await envelope(report('syphilis')), deps(`203.0.113.${i}`))
  expect(await count('south', 'syphilis')).toBe(30)
  expect(await totals()).toBe(31)
  const caps = await db.query<{ grp: string }>('select grp from network_caps')
  expect(caps).toHaveLength(1)
  expect(caps[0].grp).not.toContain('203.0.113')
  expect(caps[0].grp).toMatch(/^[0-9a-f]{64}$/)
})
it('takes envelopes but counts no report while intake is closed', async () => {
  await db.query("insert into settings (name, value) values ('intake', 'closed')")
  expect(await intake(await envelope(report('syphilis')), deps())).toEqual({ status: 202 })
  expect(await totals()).toBe(1)
  expect(await count('south', 'syphilis')).toBe(0)
})
it('writes nothing about an envelope or an address to the logs', async () => {
  const lines: string[] = []
  for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) vi.spyOn(console, level).mockImplementation((...args) => void lines.push(args.map(String).join(' ')))
  const env = await envelope(report('syphilis'))
  await intake(env, deps('198.51.100.9'))
  await intake('garbage', deps('198.51.100.9'))
  for (const line of lines) {
    expect(line).not.toContain('198.51.100')
    expect(line).not.toContain(env.ct.slice(0, 20))
  }
  vi.restoreAllMocks()
})
it('does the same database work for an empty envelope as for one carrying a report', async () => {
  const calls: number[] = [0]
  const counting: Db = { query: (text, params) => (calls[calls.length - 1]++, db.query(text, params)) }
  await intake(await envelope(null), { ...deps(), db: counting }) // the first envelope of an instance also fetches the week key
  calls.length = 0
  for (const pending of [null, report('syphilis')]) {
    calls.push(0)
    await intake(await envelope(pending), { ...deps(), db: counting })
  }
  expect(calls[0]).toBe(calls[1])
  expect(calls[0]).toBe(1)
})
it('marks the network for every envelope, so a row does not mean that network reported', async () => {
  await intake(await envelope(null), deps('198.51.100.20'))
  expect(await db.query('select grp from network_caps')).toHaveLength(1)
})
it('hides the network with a key the database alone does not hold', async () => {
  setEnvForTest({ SESSION_SECRET: 'a-secret-only-vercel-holds' })
  await intake(await envelope(report('syphilis')), deps('198.51.100.20'))
  const [{ grp }] = await db.query<{ grp: string }>('select grp from network_caps')
  const stored = await db.query<{ key: Uint8Array }>('select key from week_keys')
  for (const { key } of stored) expect(createHmac('sha256', Buffer.from(key)).update(networkGroup('198.51.100.20')).digest('hex')).not.toBe(grp)
  setEnvForTest(null)
})
it('stops counting envelopes from one network past the envelope cap, so empty envelopes cannot wash out the map', async () => {
  for (let i = 0; i < 4; i++) await intake(await envelope(i === 3 ? report('syphilis') : null), { ...deps(), envelopeCap: 3 })
  expect(await totals()).toBe(3)
  expect(await count('south', 'syphilis')).toBe(0)
})
