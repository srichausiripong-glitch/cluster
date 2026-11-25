import { makePlain, POW_DIGITS, powInput } from '../domain/envelope'
import { phone } from '../store/stores'
import { b64url, seal } from './seal'

export interface KeyInfo {
  week: string
  /** The date in Bangkok (live map, owner 25 Nov 2026): one envelope a day. A server without it leaves the week. */
  day?: string
  bits: number
  jwk: JsonWebKey
  /** Live from the server: while a reviewer has intake closed, the report waits on the phone. */
  intakeOpen?: boolean
}
const isKey = (k: unknown): k is KeyInfo => {
  const v = k as Partial<KeyInfo> | null
  return !!v && typeof v.week === 'string' && /^\d{4}-W\d{2}$/.test(v.week) && typeof v.bits === 'number' && typeof v.jwk === 'object' && v.jwk !== null
}
export interface SendDeps {
  fetch: typeof fetch
  rand: () => number
  /** Finds a counter whose SHA-256 over `input:counter` has `bits` leading zero bits. */
  solve: (input: string, bits: number) => Promise<string>
}
export type SendResult = 'sent' | 'not-due' | 'already-sent' | 'not-ready' | 'failed'

/** The span one envelope covers: the server's day, or its week from a server that gives no day. */
const periodOf = (key: KeyInfo) => key.day ?? key.week
const sentThisPeriod = (key: KeyInfo) => phone.get().sentDay === periodOf(key)

/**
 * Counts wipes, so a solve or a post that was under way when the phone was wiped writes nothing back
 * afterwards: no envelope sealed for a phone that no longer exists, no "sent" note on a wiped one.
 */
let generation = 0
const changes = new Set<() => void>()
const delivered = new Set<() => void>()
const tell = (set: Set<() => void>) => set.forEach((fn) => fn())
/** Hears when what reportState says may have changed. */
export function onSendChange(fn: () => void): () => void {
  changes.add(fn)
  return () => changes.delete(fn)
}
/** Hears when the server accepted an envelope, so the live map can be fetched again at once. */
export function onDelivered(fn: () => void): () => void {
  delivered.add(fn)
  return () => delivered.delete(fn)
}
/** Called by a wipe: anything under way is dropped, and the next send asks the server afresh. */
export function forgetEnvelope(): void {
  generation++
  lastKey = null
  tell(changes)
}
/** One time the app is open, by when it began. */
export interface Visit {
  startedAt: number
}

const CLAIM = 'cluster.envelope-claim'
/** A claim younger than this belongs to a send still in progress, maybe in another tab. */
const CLAIM_MS = 2 * 60_000

/**
 * The sealed envelope of this week, kept until the server has answered. A retry after a lost answer
 * posts these same bytes, so the server's nonce check counts the report once.
 */
export const OUTBOX = 'cluster.envelope-outbox'
/**
 * This week's envelope sealed and solved while the app is open, waiting for the person to leave. Apart
 * from the outbox, so a report sealed here can still be cancelled: it has not started to leave.
 */
export const READY = 'cluster.envelope-ready'
interface Sealed {
  week: string
  /** The waiting report it carries, by its time, or null for an empty envelope. */
  savedAt: string | null
  body: string
}
function readBox(name: string): Sealed | null {
  try {
    return JSON.parse(localStorage.getItem(name) ?? 'null')
  } catch {
    return null
  }
}
function writeBox(name: string, box: Sealed | null) {
  try {
    if (box) localStorage.setItem(name, JSON.stringify(box))
    else localStorage.removeItem(name)
  } catch {
    // storage unavailable: a later try seals a new envelope
  }
}

function readClaim(): { week: string; at: number } | null {
  try {
    return JSON.parse(localStorage.getItem(CLAIM) ?? 'null')
  } catch {
    return null
  }
}
function writeClaim(claim: { week: string; at: number } | null) {
  try {
    if (claim) localStorage.setItem(CLAIM, JSON.stringify(claim))
    else localStorage.removeItem(CLAIM)
  } catch {
    // storage unavailable: one tab can still send
  }
}

/** The report this week's envelope should carry: none while a reviewer has intake closed. */
const waiting = (key: KeyInfo) => (key.intakeOpen === false ? null : phone.get().pending)
const matches = (box: Sealed | null, key: KeyInfo): box is Sealed => !!box && box.week === key.week && box.savedAt === (waiting(key)?.savedAt ?? null)

/**
 * When a page of the app last prepared, so a reload or a second tab is not taken for a visit that
 * ended without sending. A page killed without notice stops writing it.
 */
export const ALIVE = 'cluster.envelope-alive'
const ALIVE_MS = 90_000
function readAlive(): number | null {
  try {
    const at: unknown = JSON.parse(localStorage.getItem(ALIVE) ?? 'null')
    return typeof at === 'number' ? at : null
  } catch {
    return null
  }
}
function writeAlive(at: number) {
  try {
    localStorage.setItem(ALIVE, JSON.stringify(at))
  } catch {
    // storage unavailable: a later visit may send on open
  }
}

/** An outbox of this week means the week's envelope has gone, maybe without its answer: only those bytes may go again. */
const spent = (key: KeyInfo) => readBox(OUTBOX)?.week === key.week
/**
 * An outbox from an earlier week was posted and its answer lost; it cannot go again, as its proof of
 * work is for that week. Its report is taken as delivered rather than counted twice in a new envelope.
 */
function settleStale(key: KeyInfo) {
  const box = readBox(OUTBOX)
  if (!box || box.week === key.week) return
  if (box.savedAt !== null) phone.update((s) => (s.pending?.savedAt === box.savedAt ? { ...s, pending: null } : s))
  writeBox(OUTBOX, null)
}

/** The last key fetched while the app was open, so leaving needs no network call before its post. */
let lastKey: KeyInfo | null = null

async function fetchKey(deps: SendDeps): Promise<KeyInfo | null> {
  try {
    const res = await deps.fetch('/api/key')
    if (!res.ok) return null
    const body: unknown = await res.json()
    return isKey(body) ? body : null
  } catch {
    return null
  }
}

/**
 * Seals and solves this week's envelope with the report waiting now, unless one matching it is
 * already ready. A report cancelled or replaced during the solve is not kept: it never leaves the phone,
 * and the next try seals what is waiting then (round 2 plan, decision 10).
 */
async function prepare(key: KeyInfo, deps: SendDeps): Promise<'ready' | 'changed' | 'already-sent'> {
  if (matches(readBox(READY), key)) return 'ready'
  const gen = generation
  const pending = waiting(key)
  const savedAt = pending?.savedAt ?? null
  const plain = makePlain(pending, deps.rand, b64url(crypto.getRandomValues(new Uint8Array(16))))
  const sealed = await seal(plain, key.jwk)
  const pow = (await deps.solve(powInput(sealed.ct, key.week), key.bits)).padStart(POW_DIGITS, '0')
  if (gen !== generation) return 'changed'
  if (sentThisPeriod(key)) return 'already-sent'
  if ((waiting(key)?.savedAt ?? null) !== savedAt) return 'changed'
  writeBox(READY, { week: key.week, savedAt, body: JSON.stringify({ ...sealed, pow }) })
  return 'ready'
}

/**
 * Posts this week's envelope under the claim that stops two tabs sending twice. An envelope whose
 * answer was lost is posted again byte for byte; otherwise the ready one moves to the outbox first.
 * No await before the claim is written, so another tab cannot slip in between.
 */
async function post(key: KeyInfo, now: number, deps: SendDeps, keepalive: boolean): Promise<SendResult> {
  if (sentThisPeriod(key)) return 'already-sent'
  let box = readBox(OUTBOX)
  if (box?.week !== key.week) {
    box = readBox(READY)
    if (!matches(box, key)) return 'not-ready'
  }
  const claim = readClaim()
  if (claim && claim.week === periodOf(key) && now - claim.at < CLAIM_MS) return 'already-sent'
  writeClaim({ week: periodOf(key), at: now })
  writeBox(OUTBOX, box)
  writeBox(READY, null)
  const savedAt = box.savedAt
  const pending = waiting(key)
  const gen = generation
  tell(changes)
  try {
    const res = await deps.fetch('/api/envelope', { method: 'POST', headers: { 'content-type': 'application/json' }, body: box.body, keepalive })
    if (!res.ok) {
      writeBox(OUTBOX, null) // refused, not lost: the next try seals afresh
      throw new Error(`envelope refused: ${res.status}`)
    }
    if (gen !== generation) return 'sent' // wiped meanwhile: nothing is written back
    writeBox(OUTBOX, null)
    // A "tested" report that went is remembered by week and district only, for the one-time "sent" note.
    const counted = savedAt !== null && pending?.savedAt === savedAt && pending.kind === 'tested' ? { week: key.week, zone: pending.zone } : undefined
    phone.update((s) => ({ ...s, sentWeek: key.week, sentDay: periodOf(key), pending: savedAt !== null && s.pending?.savedAt === savedAt ? null : s.pending, ...(counted ? { counted } : {}) }))
    tell(changes)
    tell(delivered)
    return 'sent'
  } catch {
    writeClaim(null)
    tell(changes)
    return 'failed'
  }
}

/**
 * This phone's one envelope for the server day (amendment 5, as changed by the 2026-11-23 design and
 * the live map, owner 25 Nov 2026). The day comes from the server, so a wrong phone clock cannot make a
 * second envelope; the proof of work and the counts stay by week.
 *
 * - With no `visit`, it is sent outright: prepared, then posted.
 * - While open, it is prepared. It goes at once when a report is waiting (the live map: the colour
 *   changes as the person presses send), when an earlier visit today ended without it and no other page
 *   of the app is open now, or when its answer was lost (the same bytes go again).
 * - On leaving, however early, a prepared envelope matching the report now waiting is posted with
 *   `keepalive`. Nothing is sealed or solved then.
 */
export async function sendIfDue(now: number, deps: SendDeps, visit?: Visit, leaving = false): Promise<SendResult> {
  if (leaving) {
    const key = lastKey
    if (!key) return 'not-ready'
    if (sentThisPeriod(key)) return 'already-sent'
    settleStale(key)
    if (!spent(key) && !matches(readBox(READY), key)) {
      writeBox(READY, null) // sealed for a report no longer waiting: it never leaves the phone
      return 'not-ready'
    }
    return post(key, now, deps, true)
  }

  const key = await fetchKey(deps)
  if (!key) return 'failed'
  lastKey = key
  tell(changes)
  const state = phone.get()
  if (sentThisPeriod(key)) return 'already-sent'
  settleStale(key)
  // An envelope whose answer was lost goes again as it is, without sealing a new one.
  if (spent(key)) return post(key, now, deps, false)
  let due = !visit || waiting(key) !== null
  if (visit) {
    const alive = readAlive()
    // sendAt keeps its old name and shape: the moment the first visit of this day began.
    if (state.sendAt?.week !== periodOf(key)) phone.update((s) => ({ ...s, sendAt: { week: periodOf(key), at: visit.startedAt } }))
    else due ||= state.sendAt.at < visit.startedAt && !(alive !== null && now - alive < ALIVE_MS)
    writeAlive(now)
  }
  const ready = await prepare(key, deps)
  if (ready === 'already-sent') return 'already-sent'
  if (ready === 'changed') return due ? 'failed' : 'not-due'
  return due ? post(key, now, deps, false) : 'not-due'
}

/**
 * Whether the waiting report saved at `savedAt` is sealed in an envelope that is being posted, or
 * whose answer never came: it may have reached the server, so saying it was cancelled would be
 * untrue (round 2 plan, decision 10). While an envelope is only being solved, a cancel still holds:
 * the send drops a report that is no longer waiting before it seals.
 */
export function takingNow(savedAt: string): boolean {
  return readBox(OUTBOX)?.savedAt === savedAt
}

export type ReportState = 'sending' | 'sent' | 'tomorrow' | 'held'
/**
 * How the waiting report saved at `savedAt` stands, for the line after "ส่ง": going now, gone, waiting
 * for tomorrow's envelope as today's has gone, or kept on the phone while a reviewer has intake closed.
 */
export function reportState(savedAt: string): ReportState {
  if (phone.get().pending?.savedAt !== savedAt) return 'sent'
  if (takingNow(savedAt)) return 'sending'
  if (lastKey?.intakeOpen === false) return 'held'
  if (lastKey && sentThisPeriod(lastKey)) return 'tomorrow'
  return 'sending'
}
