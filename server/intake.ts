import { POW_DIGITS, powInput, powOk, REPORT_KINDS, type Plain } from '../src/domain/envelope.js'
import { DISTRICT_IDS } from '../src/domain/districts.js'
import { hashHex } from '../src/envelope/pow.js'
import { unseal, type Sealed } from '../src/envelope/seal.js'
import type { Db } from './db.js'
import { hiddenGroup, weekKey } from './keys.js'
import { serverWeek } from './week.js'

/** Reports counted from one network group in one week (amendment 6). */
export const NETWORK_CAP = 30
/**
 * Envelopes counted from one network group in one week. Without it, a flood of empty envelopes
 * would raise the expected random count and wash every real signal off the map.
 */
export const ENVELOPE_CAP = 500
/** Base64url lengths of a P-256 coordinate, a 12-byte IV, and 256 padded bytes plus the 16-byte tag. */
const LENGTHS = { coord: 43, iv: 16, ct: 363 }

export interface IntakeDeps {
  db: Db
  privateJwk: JsonWebKey
  bits: number
  now: Date
  ip: string
  envelopeCap?: number
}

function shaped(body: unknown): (Sealed & { pow: string }) | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const epk = b.epk as Record<string, unknown> | undefined
  const ok =
    b.v === 1 &&
    typeof epk?.x === 'string' && epk.x.length === LENGTHS.coord &&
    typeof epk?.y === 'string' && epk.y.length === LENGTHS.coord &&
    typeof b.iv === 'string' && b.iv.length === LENGTHS.iv &&
    typeof b.ct === 'string' && b.ct.length === LENGTHS.ct &&
    typeof b.pow === 'string' && new RegExp(`^\\d{${POW_DIGITS}}$`).test(b.pow)
  return ok ? (b as unknown as Sealed & { pow: string }) : null
}
function known(plain: Plain): boolean {
  if (plain.v !== 1 || typeof plain.nonce !== 'string' || plain.nonce.length === 0 || plain.nonce.length > 64) return false
  if (plain.report === null) return true
  return DISTRICT_IDS.includes(plain.report.zone) && REPORT_KINDS.includes(plain.report.kind)
}

/**
 * Takes one envelope (amendment 5, v1 spec 4.1): checks its shape and proof of work, opens it,
 * adds its report to the week's totals and forgets it. Logs nothing about it.
 */
export async function intake(body: unknown, deps: IntakeDeps): Promise<{ status: 202 | 400 }> {
  const env = shaped(body)
  if (!env) return { status: 400 }
  const week = serverWeek(deps.now)
  if (!powOk(await hashHex(`${powInput(env.ct, week)}:${Number(env.pow)}`), deps.bits)) return { status: 400 }

  let plain: Plain
  try {
    const key = await crypto.subtle.importKey('jwk', deps.privateJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'])
    plain = await unseal(env, key)
  } catch {
    return { status: 400 }
  }
  if (!known(plain)) return { status: 400 }

  // One statement for every envelope, empty or not, so neither the database work nor the time it
  // takes tells an envelope with a report from one without (amendment 5).
  const grp = hiddenGroup(await weekKey(deps.db, week), deps.ip)
  const report = plain.report
  await deps.db.query(
    `with fresh as (
       insert into seen_nonces (week, nonce) values ($1, $2) on conflict do nothing returning 1
     ), cap as (
       insert into network_caps (week, grp, envelopes, n)
       select $1, $3, 1, case when $4::text is null then 0 else 1 end from fresh
       on conflict (week, grp) do update set envelopes = network_caps.envelopes + 1, n = network_caps.n + excluded.n
       returning envelopes, n
     ), open as (
       select coalesce((select value from settings where name = 'intake'), 'open') <> 'closed' as ok
     ), env as (
       insert into envelope_totals (week, n) select $1, 1 from cap where cap.envelopes <= $7
       on conflict (week) do update set n = envelope_totals.n + 1 returning 1
     )
     insert into counts (zone, kind, week, n)
     select $4, $5, $1, 1 from cap, open
     where $4::text is not null and open.ok and cap.envelopes <= $7 and cap.n <= $6
     on conflict (zone, kind, week) do update set n = counts.n + 1`,
    [week, plain.nonce, grp, report?.zone ?? null, report?.kind ?? null, NETWORK_CAP, deps.envelopeCap ?? ENVELOPE_CAP],
  )
  return { status: 202 }
}
