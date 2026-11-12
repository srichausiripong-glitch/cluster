import { getDb, json, powBits, privateJwk } from '../server/env.js'
import { serverWeek } from '../server/week.js'

/**
 * The server week, the proof-of-work difficulty, the public key a phone seals its envelope with, and
 * whether intake is open right now, so a phone keeps its report while a reviewer has intake closed.
 */
export async function GET(_request?: Request): Promise<Response> {
  const { x, y } = privateJwk()
  const [setting] = await getDb().query<{ value: string }>("select value from settings where name = 'intake'")
  return json({ week: serverWeek(new Date()), bits: powBits(), intakeOpen: setting?.value !== 'closed', jwk: { kty: 'EC', crv: 'P-256', x, y } })
}
