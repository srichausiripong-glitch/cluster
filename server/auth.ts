import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { Db } from './db.js'
import { env } from './env.js'

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
/** The cookie value: name (URL-encoded), expiry, and an HMAC over both. */
export function sessionValue(name: string, now: number): string {
  const payload = `${encodeURIComponent(name)}.${now + SESSION_MS}`
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
  const [name, expiry] = payload.split('.')
  if (Number(expiry) < now) return null
  const reviewer = decodeURIComponent(name)
  return reviewers().some((r) => r.name === reviewer) ? reviewer : null
}

/** Checks a name and password. Five failures lock the name for fifteen minutes. */
export async function login(db: Db, name: string, password: string, now: number): Promise<'ok' | 'wrong' | 'locked'> {
  const [lock] = await db.query<{ n: number; until: Date | string | null }>('select n, until from login_failures where name = $1', [name])
  if (lock?.until && new Date(lock.until).getTime() > now) return 'locked'
  const reviewer = reviewers().find((r) => r.name === name)
  if (reviewer && verifyPassword(password, reviewer.hash)) {
    await db.query('delete from login_failures where name = $1', [name])
    return 'ok'
  }
  const failures = (lock?.until ? 0 : (lock?.n ?? 0)) + 1
  const until = failures >= LOCK_AFTER ? new Date(now + LOCK_MS) : null
  await db.query(
    'insert into login_failures (name, n, until) values ($1, $2, $3) on conflict (name) do update set n = excluded.n, until = excluded.until',
    [name, until ? 0 : failures, until],
  )
  return 'wrong'
}
