import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mondayDate } from '../domain/weeks'
import { phone } from '../store/stores'
import { wipePhone } from '../store/actions'
import { sendIfDue } from './send'
import { unseal } from './seal'

const WEEK = '2026-W46'
/** Monday 00:00 in Bangkok, in ms. */
const weekStart = mondayDate(WEEK).getTime() - 7 * 3600_000
let keys: CryptoKeyPair
let jwk: JsonWebKey
let posted: string[]
let failPost: boolean
let loseAnswer: boolean
let intakeOpen: boolean | undefined

beforeEach(async () => {
  wipePhone()
  localStorage.clear()
  keys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  jwk = await crypto.subtle.exportKey('jwk', keys.publicKey)
  posted = []
  failPost = false
  loseAnswer = false
  intakeOpen = undefined
})
afterEach(() => vi.restoreAllMocks())

const fakeFetch = (week = WEEK) =>
  (async (url: string, init?: RequestInit) => {
    if (String(url).endsWith('/api/key')) return new Response(JSON.stringify({ week, bits: 8, jwk, ...(intakeOpen === undefined ? {} : { intakeOpen }) }))
    if (failPost) throw new Error('offline')
    posted.push(String(init?.body))
    if (loseAnswer) throw new Error('the answer was lost on the way back')
    return new Response(null, { status: 202 })
  }) as typeof fetch
const deps = (rand = () => 0.5, week = WEEK) => ({ fetch: fakeFetch(week), rand, solve: async () => '0000000042' })

it('picks one moment in the server week, keeps it, and waits for it', async () => {
  expect(await sendIfDue(weekStart, deps(() => 0.5))).toBe('not-due')
  const at = phone.get().sendAt
  expect(at?.week).toBe(WEEK)
  expect(at!.at).toBeGreaterThanOrEqual(weekStart)
  expect(at!.at).toBeLessThan(weekStart + 7 * 86_400_000)
  expect(await sendIfDue(weekStart, deps(() => 0.9))).toBe('not-due')
  expect(phone.get().sendAt).toEqual(at)
  expect(posted).toHaveLength(0)
})
it('sends once it is due, then marks the week sent and clears the waiting report', async () => {
  phone.update((s) => ({ ...s, pending: { kind: 'tested', zone: 'south', savedAt: '2026-11-12T00:00:00.000Z' } }))
  await sendIfDue(weekStart, deps())
  expect(await sendIfDue(phone.get().sendAt!.at, deps())).toBe('sent')
  expect(posted).toHaveLength(1)
  expect(phone.get().sentWeek).toBe(WEEK)
  expect(phone.get().pending).toBeNull()
  const body = JSON.parse(posted[0])
  expect(body.pow).toBe('0000000042')
  expect(await unseal(body, keys.privateKey)).toMatchObject({ report: { zone: 'south', kind: 'tested' } })
  expect(await sendIfDue(phone.get().sendAt!.at + 1000, deps())).toBe('already-sent')
  expect(posted).toHaveLength(1)
})
it('keeps the report when sending fails, and tries again later', async () => {
  phone.update((s) => ({ ...s, pending: { kind: 'syphilis', zone: 'north', savedAt: '2026-11-12T00:00:00.000Z' } }))
  failPost = true
  const late = weekStart + 7 * 86_400_000 - 1
  expect(await sendIfDue(late, deps())).toBe('failed')
  expect(phone.get().pending).not.toBeNull()
  expect(phone.get().sentWeek).toBeNull()
  failPost = false
  expect(await sendIfDue(late + 1, deps())).toBe('sent')
  expect(posted).toHaveLength(1)
})
it('takes the week from the server, not from a phone clock that is a year ahead', async () => {
  const yearAhead = weekStart + 365 * 86_400_000
  expect(await sendIfDue(yearAhead, deps())).toBe('sent')
  expect(phone.get().sentWeek).toBe(WEEK)
  expect(await sendIfDue(yearAhead + 1, deps())).toBe('already-sent')
  expect(posted).toHaveLength(1)
})
it('sends once although two tabs try at the same moment', async () => {
  const late = weekStart + 7 * 86_400_000 - 1
  const results = await Promise.all([sendIfDue(late, deps()), sendIfDue(late, deps())])
  expect(results.filter((r) => r === 'sent')).toHaveLength(1)
  expect(posted).toHaveLength(1)
})
it('posts bodies of one length for an empty envelope, a test and a positive report', async () => {
  const late = weekStart + 7 * 86_400_000 - 1
  for (const pending of [null, { kind: 'tested' as const, zone: 'south', savedAt: 'x' }, { kind: 'gono_chlam' as const, zone: 'thon_north', savedAt: 'x' }]) {
    wipePhone()
    localStorage.clear()
    phone.update((s) => ({ ...s, pending }))
    await sendIfDue(late, deps())
  }
  expect(posted).toHaveLength(3)
  expect(new Set(posted.map((b) => b.length)).size).toBe(1)
})

const LATE = weekStart + 7 * 86_400_000 - 1
it('posts the very same envelope again when the answer was lost, so the server counts it once', async () => {
  phone.update((s) => ({ ...s, pending: { kind: 'syphilis', zone: 'north', savedAt: '2026-11-12T00:00:00.000Z' } }))
  loseAnswer = true
  expect(await sendIfDue(LATE, deps())).toBe('failed')
  loseAnswer = false
  expect(await sendIfDue(LATE + 1, deps())).toBe('sent')
  expect(posted).toHaveLength(2)
  expect(posted[1]).toBe(posted[0])
})
it('clears the sent report even when the phone state was written again during the solve', async () => {
  phone.update((s) => ({ ...s, pending: { kind: 'tested', zone: 'south', savedAt: '2026-11-12T00:00:00.000Z' } }))
  const solve = async () => {
    phone.update((s) => ({ ...s, pending: s.pending && { ...s.pending } }))
    return '0000000042'
  }
  expect(await sendIfDue(LATE, { ...deps(), solve })).toBe('sent')
  expect(phone.get().pending).toBeNull()
})
it('does not post when another tab finished this week while this one was solving', async () => {
  const solve = async () => {
    phone.update((s) => ({ ...s, sentWeek: WEEK }))
    return '0000000042'
  }
  expect(await sendIfDue(LATE, { ...deps(), solve })).toBe('already-sent')
  expect(posted).toHaveLength(0)
})
it('keeps the waiting report and sends an empty envelope while intake is closed', async () => {
  phone.update((s) => ({ ...s, pending: { kind: 'syphilis', zone: 'north', savedAt: '2026-11-12T00:00:00.000Z' } }))
  intakeOpen = false
  expect(await sendIfDue(LATE, deps())).toBe('sent')
  expect(await unseal(JSON.parse(posted[0]), keys.privateKey)).toMatchObject({ report: null })
  expect(phone.get().pending).not.toBeNull()
  expect(phone.get().sentWeek).toBe(WEEK)
})
it('treats a key answer without a week as a failure, not a crash', async () => {
  const fetch = (async () => new Response('{}')) as unknown as typeof globalThis.fetch
  expect(await sendIfDue(LATE, { ...deps(), fetch })).toBe('failed')
})
it('leaves no sealed envelope behind when the phone is wiped', async () => {
  phone.update((s) => ({ ...s, pending: { kind: 'syphilis', zone: 'north', savedAt: '2026-11-12T00:00:00.000Z' } }))
  failPost = true
  await sendIfDue(LATE, deps())
  expect(localStorage.getItem('cluster.envelope-outbox')).not.toBeNull()
  wipePhone()
  expect(localStorage.getItem('cluster.envelope-outbox')).toBeNull()
})
