import { getDb, json, powBits, privateJwk } from '../server/env.js'
import { serverDay, serverWeek } from '../server/week.js'

/**
 * The server week and day, the proof-of-work difficulty, the public key a phone seals its envelope with,
 * and whether intake is open right now, so a phone keeps its report while a reviewer has intake closed.
 * The day lets a phone send one envelope a day whatever its own clock says.
 */
export async function GET(_request?: Request): Promise<Response> {
  const { x, y } = privateJwk()
  const [setting] = await getDb().query<{ value: string }>("select value from settings where name = 'intake'")
  const now = new Date()
  return json({ week: serverWeek(now), day: serverDay(now), bits: powBits(), intakeOpen: setting?.value !== 'closed', jwk: { kty: 'EC', crv: 'P-256', x, y } })
}
