import { createHmac, randomBytes } from 'node:crypto'
import type { Db } from './db.js'
import { env } from './env.js'

const cache = new WeakMap<Db, Map<string, Buffer>>()
/**
 * The key that hides network groups for one week: an HMAC, under a secret that lives only in
 * Vercel's settings, of a random value kept in the database and deleted with the week. Neither the
 * database alone nor the secret alone can turn a stored group back into a network. Kept in memory
 * after the first use, so an envelope's database work does not depend on what it carries.
 */
export async function weekKey(db: Db, week: string): Promise<Buffer> {
  const known = cache.get(db)?.get(week)
  if (known) return known
  const [row] = await db.query<{ key: Uint8Array }>(
    'insert into week_keys (week, key) values ($1, $2) on conflict (week) do update set week = excluded.week returning key',
    [week, randomBytes(32)],
  )
  const key = createHmac('sha256', env('SESSION_SECRET') ?? '').update('network|').update(Buffer.from(row.key)).digest()
  if (!cache.has(db)) cache.set(db, new Map())
  cache.get(db)!.set(week, key)
  return key
}

/** The network an address belongs to: IPv4 /24 or IPv6 /48 (amendment 6). */
export function networkGroup(ip: string): string {
  const v4 = /(\d+)\.(\d+)\.(\d+)\.\d+$/.exec(ip)
  if (v4) return `${v4[1]}.${v4[2]}.${v4[3]}.0/24`
  const [head] = ip.split('::')
  const groups = head.split(':').filter(Boolean)
  while (groups.length < 3) groups.push('0')
  return `${groups.slice(0, 3).map((g) => g.toLowerCase().replace(/^0+(?=.)/, '')).join(':')}::/48`
}

/** What is stored in place of the network: an HMAC under the week's key (see weekKey). */
export function hiddenGroup(key: Buffer, ip: string): string {
  return createHmac('sha256', key).update(networkGroup(ip)).digest('hex')
}
