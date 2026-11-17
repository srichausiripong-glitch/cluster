import { createPrivateKey, sign, type JsonWebKey as NodeJwk } from 'node:crypto'
import { shiftWeek } from '../src/domain/weeks.js'
import type { Db } from './db.js'
import { latestPublished } from './publish.js'
import { serverWeek } from './week.js'

// Following a district (redesign spec 5.11). The server keeps push addresses and the day each came,
// never a district or an IP address, and sends every address the same empty push once a week.

/** The push services browsers use. An address anywhere else is refused, so the server never sends to a place someone chose. */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /\.push\.services\.mozilla\.com$/, /\.push\.apple\.com$/, /\.notify\.windows\.com$/]
const MAX_ENDPOINT = 2048

/** Whether a value is a push address from one of the push services. */
export function isPushEndpoint(url: unknown): url is string {
  if (typeof url !== 'string' || url.length > MAX_ENDPOINT) return false
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  return parsed.protocol === 'https:' && parsed.port === '' && !parsed.username && !parsed.password && PUSH_HOSTS.some((host) => host.test(parsed.hostname))
}

/** The day in Bangkok, YYYY-MM-DD. Thailand keeps one offset all year. */
export function bangkokDay(now: Date): string {
  return new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10)
}

export async function subscribe(db: Db, endpoint: string, day: string): Promise<void> {
  await db.query('insert into push_subscriptions (endpoint, created_on) values ($1, $2) on conflict (endpoint) do nothing', [endpoint, day])
}

export async function unsubscribe(db: Db, endpoint: string): Promise<void> {
  await db.query('delete from push_subscriptions where endpoint = $1', [endpoint])
}

/** The public half of the push key as browsers take it: the uncompressed point, base64url. */
export function vapidPublicKey(jwk: JsonWebKey): string {
  return Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x ?? '', 'base64url'), Buffer.from(jwk.y ?? '', 'base64url')]).toString('base64url')
}

/** How long a push service may hold the weekly push for a phone that is off: half a day, then it is news no longer. */
const TTL_S = 12 * 3600
/** Pushes in flight at once. */
const BATCH = 8

const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')

/** The VAPID header for one push service (RFC 8292): a token signed with the server's key, valid for twelve hours. */
export function vapidAuthorization(endpoint: string, jwk: JsonWebKey, subject: string, now: Date): string {
  const unsigned = `${part({ typ: 'JWT', alg: 'ES256' })}.${part({ aud: new URL(endpoint).origin, exp: Math.floor(now.getTime() / 1000) + TTL_S, sub: subject })}`
  const key = createPrivateKey({ key: jwk as NodeJwk, format: 'jwk' })
  const signature = sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' })
  return `vapid t=${unsigned}.${signature.toString('base64url')}, k=${vapidPublicKey(jwk)}`
}

type Post = (url: string, init: RequestInit) => Promise<Response>

/**
 * The weekly push (redesign spec 5.11): the same empty push to every address, once this week's map is
 * out, so a failed publication never says the map was updated. An address its push service calls gone
 * (404, 410) is deleted; any other failure keeps it for next week.
 */
export async function sendWeekly(deps: { db: Db; jwk: JsonWebKey; subject: string; now: Date; post?: Post }): Promise<{ sent: number; gone: number; failed: number; skipped: boolean }> {
  const { db, jwk, subject, now, post = fetch } = deps
  const result = { sent: 0, gone: 0, failed: 0, skipped: false }
  if ((await latestPublished(db))?.week !== shiftWeek(serverWeek(now), -1)) return { ...result, skipped: true }
  const rows = await db.query<{ endpoint: string }>('select endpoint from push_subscriptions order by endpoint')
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const outcomes = await Promise.allSettled(
      batch.map(({ endpoint }) =>
        post(endpoint, { method: 'POST', headers: { TTL: String(TTL_S), Urgency: 'normal', Topic: 'cluster-weekly', Authorization: vapidAuthorization(endpoint, jwk, subject, now) } }),
      ),
    )
    for (const [j, outcome] of outcomes.entries()) {
      const status = outcome.status === 'fulfilled' ? outcome.value.status : 0
      if (status >= 200 && status < 300) result.sent++
      else if (status === 404 || status === 410) {
        result.gone++
        await unsubscribe(db, batch[j].endpoint)
      } else result.failed++
    }
  }
  return result
}
