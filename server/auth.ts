import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { Db } from './db.js'
import { env } from './env.js'
import { networkGroup } from './keys.js'

/** A reviewer: a name and an scrypt hash of the password, from ADMIN_USERS (v1 spec 6). */
export interface Reviewer {
  name: string
  hash: string
}
const SESSION_MS = 8 * 3600_000
const LOCK_AFTER = 5
const LOCK_MS = 15 * 60_000
export const COOKIE = 'cluster_admin'

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  return `scrypt$${salt.toString('base64')}$${scryptSync(password, salt, 32).toString('base64')}`
}
function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64')
  const actual = scryptSync(password, Buffer.from(salt, 'base64'), expected.length)
  return timingSafeEqual(actual, expected)
}
export function reviewers(): Reviewer[] {
  try {
    const list = JSON.parse(env('ADMIN_USERS') ?? '[]') as Reviewer[]
    return Array.isArray(list) ? list.filter((r) => typeof r.name === 'string' && typeof r.hash === 'string') : []
  } catch {
    return []
  }
}

const sign = (payload: string) => {
  const secret = env('SESSION_SECRET')
  if (!secret) throw new Error('SESSION_SECRET is not set')
  return createHmac('sha256', secret).update(payload).digest('base64url')
}
/** The cookie value: name (base64url, which has no dot), expiry, and an HMAC over both. */
export function sessionValue(name: string, now: number): string {
  const payload = `${Buffer.from(name).toString('base64url')}.${now + SESSION_MS}`
  return `${payload}.${sign(payload)}`
}
export function sessionCookie(value: string): string {
  return `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=${SESSION_MS / 1000}`
}
/** The reviewer a request's cookie names, or null for none, a forged one or an expired one. */
export function reviewerOf(request: Request, now: number): string | null {
  const raw = (request.headers.get('cookie') ?? '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`))
  if (!raw) return null
  const value = raw.slice(COOKIE.length + 1)
  const cut = value.lastIndexOf('.')
  if (cut < 0) return null
  const payload = value.slice(0, cut)
  const given = Buffer.from(value.slice(cut + 1))
  const expected = Buffer.from(sign(payload))
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  const [name, expiry, extra] = payload.split('.')
  if (extra !== undefined || !/^\d+$/.test(expiry ?? '') || Number(expiry) < now) return null
  const reviewer = Buffer.from(name, 'base64url').toString()
  return reviewers().some((r) => r.name === reviewer) ? reviewer : null
}

/**
 * Checks a name and password. Five failures lock that name from that network for fifteen minutes.
 * Reviewer names are public, so the lock never reaches a reviewer signing in from elsewhere, and a
 * name that is not a reviewer leaves no row at all.
 */
export async function login(db: Db, name: string, password: string, now: number, ip = ''): Promise<'ok' | 'wrong' | 'locked'> {
  const reviewer = reviewers().find((r) => r.name === name)
  if (!reviewer) return 'wrong'
  const who = `${name}|${createHmac('sha256', env('SESSION_SECRET') ?? '').update(`login|${networkGroup(ip)}`).digest('hex')}`
  const [lock] = await db.query<{ until: Date | string | null }>('select until from login_failures where name = $1', [who])
  if (lock?.until && new Date(lock.until).getTime() > now) return 'locked'
  if (verifyPassword(password, reviewer.hash)) {
    await db.query('delete from login_failures where name = $1', [who])
    return 'ok'
  }
  // One statement, so failures sent at the same moment cannot all read the same count.
  await db.query(
    `insert into login_failures (name, n, until) values ($1, 1, null)
     on conflict (name) do update set
       n = case when login_failures.until > $4 then 0
                when (case when login_failures.until is null then login_failures.n else 0 end) + 1 >= $2 then 0
                else (case when login_failures.until is null then login_failures.n else 0 end) + 1 end,
       until = case when login_failures.until > $4 then login_failures.until
                    when (case when login_failures.until is null then login_failures.n else 0 end) + 1 >= $2 then $3::timestamptz
                    else null end`,
    [who, LOCK_AFTER, new Date(now + LOCK_MS), new Date(now)],
  )
  return 'wrong'
}
