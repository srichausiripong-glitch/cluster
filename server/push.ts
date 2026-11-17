import type { Db } from './db.js'

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
