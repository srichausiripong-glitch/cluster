import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mondayDate } from '../domain/weeks'
import { phone } from '../store/stores'
import { cancelPending, queueReport, wipePhone } from '../store/actions'
import { READY, sendIfDue, takingNow } from './send'
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

// Send on leaving (2026-11-23 design): the envelope is made ready while the app is open and goes when the person leaves.
const T0 = weekStart + 3 * 86_400_000
const visitAt = (startedAt: number, reported = false) => ({ startedAt, reported })
const REPORT = { kind: 'tested' as const, zone: 'bang_rak', savedAt: 's-visit' }

it('on a first visit, prepares the report while open and sends it when the person leaves', async () => {
  const visit = visitAt(T0)
  phone.update((s) => ({ ...s, pending: REPORT }))
  expect(await sendIfDue(T0 + 30_000, deps(), visit)).toBe('not-due')
  expect(posted).toHaveLength(0)
  visit.reported = true
  expect(await sendIfDue(T0 + 40_000, deps(), visit, true)).toBe('sent')
  expect(posted).toHaveLength(1)
  expect(await unseal(JSON.parse(posted[0]), keys.privateKey)).toMatchObject({ report: { zone: 'bang_rak', kind: 'tested' } })
  expect(phone.get().sentWeek).toBe(WEEK)
  expect(phone.get().pending).toBeNull()
})
it('does not send when a visit without a report is left within two minutes, and does after', async () => {
  const visit = visitAt(T0)
  expect(await sendIfDue(T0, deps(), visit)).toBe('not-due')
  expect(await sendIfDue(T0 + 60_000, deps(), visit, true)).toBe('not-due')
  expect(posted).toHaveLength(0)
  expect(await sendIfDue(T0 + 121_000, deps(), visit, true)).toBe('sent')
  expect(posted).toHaveLength(1)
  expect(await unseal(JSON.parse(posted[0]), keys.privateKey)).toMatchObject({ report: null })
})
it('sends nothing when the person leaves before the new report is sealed, and sends it on the next open', async () => {
  const visit = visitAt(T0)
  expect(await sendIfDue(T0, deps(), visit)).toBe('not-due')
  phone.update((s) => ({ ...s, pending: REPORT }))
  visit.reported = true
  expect(await sendIfDue(T0 + 5_000, deps(), visit, true)).toBe('not-ready')
  expect(posted).toHaveLength(0)
  expect(phone.get().pending).toEqual(REPORT)
  expect(await sendIfDue(T0 + 3_600_000, deps(), visitAt(T0 + 3_600_000))).toBe('sent')
  expect(posted).toHaveLength(1)
  expect(await unseal(JSON.parse(posted[0]), keys.privateKey)).toMatchObject({ report: { zone: 'bang_rak' } })
})
it('sends nothing more on a second visit once the week has gone', async () => {
  const visit = visitAt(T0, true)
  await sendIfDue(T0, deps(), visit)
  expect(await sendIfDue(T0 + 1_000, deps(), visit, true)).toBe('sent')
  const second = visitAt(T0 + 3_600_000)
  expect(await sendIfDue(second.startedAt, deps(), second)).toBe('already-sent')
  expect(await sendIfDue(second.startedAt + 200_000, deps(), second, true)).toBe('already-sent')
  expect(posted).toHaveLength(1)
})
it('carries a report waiting from last week in the new week, sent on leaving', async () => {
  phone.update((s) => ({ ...s, sentWeek: '2026-W45', sendAt: { week: '2026-W45', at: weekStart - 86_400_000 }, pending: REPORT }))
  const visit = visitAt(T0)
  expect(await sendIfDue(T0, deps(), visit)).toBe('not-due')
  expect(await sendIfDue(T0 + 130_000, deps(), visit, true)).toBe('sent')
  expect(await unseal(JSON.parse(posted[0]), keys.privateKey)).toMatchObject({ report: { zone: 'bang_rak' } })
})
it('still lets a prepared report be cancelled, and then seals an empty envelope', async () => {
  const visit = visitAt(T0, true)
  phone.update((s) => ({ ...s, pending: REPORT }))
  await sendIfDue(T0, deps(), visit)
  expect(takingNow(REPORT.savedAt)).toBe(false)
  expect(cancelPending()).toBe('cancelled')
  expect(await sendIfDue(T0 + 1_000, deps(), visit, true)).toBe('not-ready')
  expect(posted).toHaveLength(0)
  await sendIfDue(T0 + 2_000, deps(), visit)
  expect(await sendIfDue(T0 + 3_000, deps(), visit, true)).toBe('sent')
  expect(await unseal(JSON.parse(posted[0]), keys.privateKey)).toMatchObject({ report: null })
})
it('leaves no prepared envelope behind when the phone is wiped', async () => {
  phone.update((s) => ({ ...s, pending: REPORT }))
  await sendIfDue(T0, deps(), visitAt(T0))
  expect(localStorage.getItem(READY)).not.toBeNull()
  wipePhone()
  expect(localStorage.getItem(READY)).toBeNull()
})
it('does not send on open for a phone that kept a later moment from before this change', async () => {
  phone.update((s) => ({ ...s, sendAt: { week: WEEK, at: T0 + 2 * 86_400_000 } }))
  const visit = visitAt(T0)
  expect(await sendIfDue(T0, deps(), visit)).toBe('not-due')
  expect(posted).toHaveLength(0)
  expect(await sendIfDue(T0 + 130_000, deps(), visit, true)).toBe('sent')
  expect(posted).toHaveLength(1)
})
it('sends an outright call at once and marks the week sent', async () => {
  phone.update((s) => ({ ...s, pending: { kind: 'tested', zone: 'bang_rak', savedAt: '2026-11-12T00:00:00.000Z' } }))
  expect(await sendIfDue(weekStart, deps())).toBe('sent')
  expect(posted).toHaveLength(1)
  expect(phone.get().sentWeek).toBe(WEEK)
  expect(phone.get().pending).toBeNull()
  const body = JSON.parse(posted[0])
  expect(body.pow).toBe('0000000042')
  expect(await unseal(body, keys.privateKey)).toMatchObject({ report: { zone: 'bang_rak', kind: 'tested' } })
  expect(await sendIfDue(weekStart + 1000, deps())).toBe('already-sent')
  expect(posted).toHaveLength(1)
})
it('keeps the report when sending fails, and tries again later', async () => {
  phone.update((s) => ({ ...s, pending: { kind: 'syphilis', zone: 'chatuchak', savedAt: '2026-11-12T00:00:00.000Z' } }))
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
  for (const pending of [null, { kind: 'tested' as const, zone: 'bang_rak', savedAt: 'x' }, { kind: 'gono_chlam' as const, zone: 'bangkok_yai', savedAt: 'x' }]) {
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
  phone.update((s) => ({ ...s, pending: { kind: 'syphilis', zone: 'chatuchak', savedAt: '2026-11-12T00:00:00.000Z' } }))
  loseAnswer = true
  expect(await sendIfDue(LATE, deps())).toBe('failed')
  loseAnswer = false
  expect(await sendIfDue(LATE + 1, deps())).toBe('sent')
  expect(posted).toHaveLength(2)
  expect(posted[1]).toBe(posted[0])
})
it('clears the sent report even when the phone state was written again during the solve', async () => {
  phone.update((s) => ({ ...s, pending: { kind: 'tested', zone: 'bang_rak', savedAt: '2026-11-12T00:00:00.000Z' } }))
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
  // The envelope it sealed is never posted, so it must not hold back a cancel.
  expect(localStorage.getItem('cluster.envelope-outbox')).toBeNull()
})
it('keeps the waiting report and sends an empty envelope while intake is closed', async () => {
  phone.update((s) => ({ ...s, pending: { kind: 'syphilis', zone: 'chatuchak', savedAt: '2026-11-12T00:00:00.000Z' } }))
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
  phone.update((s) => ({ ...s, pending: { kind: 'syphilis', zone: 'chatuchak', savedAt: '2026-11-12T00:00:00.000Z' } }))
  failPost = true
  await sendIfDue(LATE, deps())
  expect(localStorage.getItem('cluster.envelope-outbox')).not.toBeNull()
  wipePhone()
  expect(localStorage.getItem('cluster.envelope-outbox')).toBeNull()
})

it('keeps no trace of the report in its claim, during or after the send', async () => {
  phone.update((s) => ({ ...s, pending: { kind: 'tested', zone: 'bang_rak', savedAt: 's-claim' } }))
  let during = ''
  const solve = async () => {
    during = localStorage.getItem('cluster.envelope-claim') ?? ''
    return '0000000042'
  }
  expect(await sendIfDue(LATE, { ...deps(), solve })).toBe('sent')
  expect(during).not.toContain('s-claim')
  expect(localStorage.getItem('cluster.envelope-claim') ?? '').not.toContain('s-claim')
})
it('drops a report cancelled while its envelope was being solved, and sends an empty envelope after', async () => {
  phone.update((s) => ({ ...s, pending: { kind: 'syphilis', zone: 'bang_rak', savedAt: 's-cancel' } }))
  let cancelled = ''
  const solve = async () => {
    cancelled = cancelPending()
    return '0000000042'
  }
  expect(await sendIfDue(LATE, { ...deps(), solve })).toBe('failed')
  expect(cancelled).toBe('cancelled')
  expect(posted).toHaveLength(0)
  expect(await sendIfDue(LATE, deps())).toBe('sent')
  expect(await unseal(JSON.parse(posted[0]), keys.privateKey)).toMatchObject({ report: null })
})
it('sends the replacement, not the replaced report, when a report is replaced during the solve', async () => {
  phone.update((s) => ({ ...s, pending: { kind: 'tested', zone: 'bang_rak', savedAt: 's-old' } }))
  const solve = async () => {
    queueReport({ kind: 'syphilis', zone: 'chatuchak', savedAt: 's-new' })
    return '0000000042'
  }
  expect(await sendIfDue(LATE, { ...deps(), solve })).toBe('failed')
  expect(posted).toHaveLength(0)
  expect(await sendIfDue(LATE, deps())).toBe('sent')
  expect(await unseal(JSON.parse(posted[0]), keys.privateKey)).toMatchObject({ report: { kind: 'syphilis', zone: 'chatuchak' } })
})
it('refuses a cancel once the envelope is sealed, until the server answers', async () => {
  phone.update((s) => ({ ...s, pending: { kind: 'tested', zone: 'bang_rak', savedAt: 's-sealed' } }))
  let answer = ''
  const inner = fakeFetch()
  const fetch = (async (url: string, init?: RequestInit) => {
    if (String(url).endsWith('/api/envelope')) answer = cancelPending()
    return inner(url, init)
  }) as typeof globalThis.fetch
  expect(await sendIfDue(LATE, { ...deps(), fetch })).toBe('sent')
  expect(answer).toBe('sending')
  expect(phone.get().pending).toBeNull()
})
// The "sent" note (2026-11-18 design, decision 2): the phone remembers only the week and the district of a "tested" report that went.
it('remembers the week and district of a "tested" report once its envelope goes, and nothing for other kinds', async () => {
  phone.update((s) => ({ ...s, pending: { kind: 'tested', zone: 'bang_rak', savedAt: '2026-11-12T00:00:00.000Z' } }))
  expect(await sendIfDue(LATE, deps())).toBe('sent')
  expect(phone.get().counted).toEqual({ week: WEEK, zone: 'bang_rak' })
  wipePhone()
  localStorage.clear()
  phone.update((s) => ({ ...s, pending: { kind: 'syphilis', zone: 'chatuchak', savedAt: '2026-11-12T00:00:00.000Z' } }))
  expect(await sendIfDue(LATE, deps())).toBe('sent')
  expect(phone.get().counted ?? null).toBeNull()
})

// Final review fixes. A keepalive post on closing often never hears back, though the server got it.
it('posts the very same envelope again in that week after a lost answer, even once a report is waiting', async () => {
  const first = visitAt(T0)
  await sendIfDue(T0, deps(), first)
  loseAnswer = true
  expect(await sendIfDue(T0 + 130_000, deps(), first, true)).toBe('failed')
  loseAnswer = false
  phone.update((s) => ({ ...s, pending: REPORT }))
  const second = visitAt(T0 + 3_600_000)
  expect(await sendIfDue(second.startedAt, deps(), second)).toBe('sent')
  expect(posted).toHaveLength(2)
  expect(posted[1]).toBe(posted[0])
  expect(phone.get().pending).toEqual(REPORT) // it waits for next week's envelope
})
it('counts a report whose answer was lost as gone, not again in the next week', async () => {
  const visit = visitAt(T0, true)
  phone.update((s) => ({ ...s, pending: REPORT }))
  await sendIfDue(T0, deps(), visit)
  loseAnswer = true
  expect(await sendIfDue(T0 + 5_000, deps(), visit, true)).toBe('failed')
  loseAnswer = false
  const next = visitAt(T0 + 7 * 86_400_000)
  await sendIfDue(next.startedAt, deps(() => 0.5, '2026-W47'), next)
  expect(await sendIfDue(next.startedAt + 130_000, deps(() => 0.5, '2026-W47'), next, true)).toBe('sent')
  expect(await unseal(JSON.parse(posted[1]), keys.privateKey)).toMatchObject({ report: null })
  expect(phone.get().pending).toBeNull()
})
it('does not send on open from a second tab or a reload while another page of the app is still open', async () => {
  await sendIfDue(T0, deps(), visitAt(T0))
  const other = visitAt(T0 + 30_000)
  expect(await sendIfDue(other.startedAt, deps(), other)).toBe('not-due')
  expect(posted).toHaveLength(0)
})
