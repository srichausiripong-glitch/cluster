import { makePlain, POW_DIGITS, powInput } from '../domain/envelope'
import { mondayDate } from '../domain/weeks'
import { phone } from '../store/stores'
import { b64url, seal } from './seal'

export interface KeyInfo {
  week: string
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
export type SendResult = 'sent' | 'not-due' | 'already-sent' | 'failed'

const WEEK_MS = 7 * 86_400_000
/** Monday 00:00 in Bangkok (UTC+7) of a server week, in ms. */
const weekStart = (week: string) => mondayDate(week).getTime() - 7 * 3600_000
const CLAIM = 'cluster.envelope-claim'
/** A claim younger than this belongs to a send still in progress, maybe in another tab. */
const CLAIM_MS = 2 * 60_000

/**
 * The sealed envelope of this week, kept until the server has answered. A retry after a lost answer
 * posts these same bytes, so the server's nonce check counts the report once.
 */
export const OUTBOX = 'cluster.envelope-outbox'
interface Outbox {
  week: string
  /** The waiting report it carries, by its time, or null for an empty envelope. */
  savedAt: string | null
  body: string
}
function readOutbox(): Outbox | null {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX) ?? 'null')
  } catch {
    return null
  }
}
function writeOutbox(box: Outbox | null) {
  try {
    if (box) localStorage.setItem(OUTBOX, JSON.stringify(box))
    else localStorage.removeItem(OUTBOX)
  } catch {
    // storage unavailable: a retry seals a new envelope
  }
}

function readClaim(): { week: string; at: number; savedAt?: string | null } | null {
  try {
    return JSON.parse(localStorage.getItem(CLAIM) ?? 'null')
  } catch {
    return null
  }
}
function writeClaim(claim: { week: string; at: number; savedAt: string | null } | null) {
  try {
    if (claim) localStorage.setItem(CLAIM, JSON.stringify(claim))
    else localStorage.removeItem(CLAIM)
  } catch {
    // storage unavailable: one tab can still send
  }
}

/**
 * Sends this phone's one envelope for the server week once its moment has come (amendment 5).
 * The week comes from the server, so a wrong phone clock cannot make a second envelope.
 */
export async function sendIfDue(now: number, deps: SendDeps): Promise<SendResult> {
  let key: KeyInfo
  try {
    const res = await deps.fetch('/api/key')
    if (!res.ok) return 'failed'
    const body: unknown = await res.json()
    if (!isKey(body)) return 'failed'
    key = body
  } catch {
    return 'failed'
  }
  const state = phone.get()
  if (state.sentWeek === key.week) return 'already-sent'
  let sendAt = state.sendAt
  if (sendAt?.week !== key.week) {
    sendAt = { week: key.week, at: weekStart(key.week) + Math.floor(deps.rand() * WEEK_MS) }
    phone.update((s) => ({ ...s, sendAt }))
  }
  if (now < sendAt.at) return 'not-due'

  // No await between reading the claim and writing it: another tab cannot slip in between.
  const claim = readClaim()
  if (claim && claim.week === key.week && now - claim.at < CLAIM_MS) return 'already-sent'
  // The claim names the waiting report it takes, so a cancel meanwhile can see it is too late.
  const pending = key.intakeOpen === false ? null : phone.get().pending
  const savedAt = pending?.savedAt ?? null
  writeClaim({ week: key.week, at: now, savedAt })
  // Keep the claim fresh while a slow phone solves, so no other tab takes the week meanwhile.
  const keepClaim = setInterval(() => writeClaim({ week: key.week, at: Date.now(), savedAt }), CLAIM_MS / 4)

  try {
    let box = readOutbox()
    if (!box || box.week !== key.week || box.savedAt !== savedAt) {
      const plain = makePlain(pending, deps.rand, b64url(crypto.getRandomValues(new Uint8Array(16))))
      const sealed = await seal(plain, key.jwk)
      const pow = (await deps.solve(powInput(sealed.ct, key.week), key.bits)).padStart(POW_DIGITS, '0')
      box = { week: key.week, savedAt, body: JSON.stringify({ ...sealed, pow }) }
      writeOutbox(box)
    }
    if (phone.get().sentWeek === key.week) return 'already-sent'
    const res = await deps.fetch('/api/envelope', { method: 'POST', headers: { 'content-type': 'application/json' }, body: box.body })
    if (!res.ok) {
      writeOutbox(null) // refused, not lost: the next try seals afresh
      throw new Error(`envelope refused: ${res.status}`)
    }
    writeOutbox(null)
    phone.update((s) => ({ ...s, sentWeek: key.week, pending: savedAt !== null && s.pending?.savedAt === savedAt ? null : s.pending }))
    return 'sent'
  } catch {
    writeClaim(null)
    return 'failed'
  } finally {
    clearInterval(keepClaim)
  }
}

/**
 * Whether this week's envelope is taking the waiting report saved at `savedAt`: a send in progress
 * claimed it, or it is sealed and waiting for the server's answer. Saying it was cancelled would
 * then be untrue (round 2 plan, decision 10).
 */
export function takingNow(savedAt: string, now = Date.now()): boolean {
  const claim = readClaim()
  if (claim && claim.savedAt === savedAt && now - claim.at < CLAIM_MS) return true
  return readOutbox()?.savedAt === savedAt
}
