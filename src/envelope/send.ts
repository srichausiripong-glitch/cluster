import { makePlain, POW_DIGITS, powInput } from '../domain/envelope'
import { mondayDate } from '../domain/weeks'
import { phone } from '../store/stores'
import { b64url, seal } from './seal'

export interface KeyInfo {
  week: string
  bits: number
  jwk: JsonWebKey
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

/**
 * Sends this phone's one envelope for the server week once its moment has come (amendment 5).
 * The week comes from the server, so a wrong phone clock cannot make a second envelope.
 */
export async function sendIfDue(now: number, deps: SendDeps): Promise<SendResult> {
  let key: KeyInfo
  try {
    const res = await deps.fetch('/api/key')
    if (!res.ok) return 'failed'
    key = (await res.json()) as KeyInfo
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
  writeClaim({ week: key.week, at: now })

  try {
    const pending = phone.get().pending
    const plain = makePlain(pending, deps.rand, b64url(crypto.getRandomValues(new Uint8Array(16))))
    const sealed = await seal(plain, key.jwk)
    const pow = (await deps.solve(powInput(sealed.ct, key.week), key.bits)).padStart(POW_DIGITS, '0')
    const res = await deps.fetch('/api/envelope', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...sealed, pow }) })
    if (!res.ok) throw new Error(`envelope refused: ${res.status}`)
    phone.update((s) => ({ ...s, sentWeek: key.week, pending: s.pending === pending ? null : s.pending }))
    return 'sent'
  } catch {
    writeClaim(null)
    return 'failed'
  }
}
