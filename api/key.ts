import { json, powBits, privateJwk } from '../server/env.js'
import { serverWeek } from '../server/week.js'

/** The server week, the proof-of-work difficulty and the public key a phone seals its envelope with. */
export function GET(_request?: Request): Response {
  const { x, y } = privateJwk()
  return json({ week: serverWeek(new Date()), bits: powBits(), jwk: { kty: 'EC', crv: 'P-256', x, y } })
}
