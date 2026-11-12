import { createHmac, randomBytes } from 'node:crypto'
import type { Db } from './db.js'

/** The key that hides network groups for one week. Made on first use; deleted with the week. */
export async function weekKey(db: Db, week: string): Promise<Buffer> {
  await db.query('insert into week_keys (week, key) values ($1, $2) on conflict (week) do nothing', [week, randomBytes(32)])
  const [row] = await db.query<{ key: Uint8Array }>('select key from week_keys where week = $1', [week])
  return Buffer.from(row.key)
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

/** What is stored in place of the network: an HMAC with the week's key, so it cannot be read back. */
export function hiddenGroup(key: Buffer, ip: string): string {
  return createHmac('sha256', key).update(networkGroup(ip)).digest('hex')
}
