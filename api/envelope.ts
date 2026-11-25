import { clientIp, getDb, powBits, privateJwk } from '../server/env.js'
import { intake } from '../server/intake.js'

/** Takes one envelope (a phone sends at most one a day). Answers 202 for every envelope it accepts, counted or not. */
export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(null, { status: 400 })
  }
  const { status } = await intake(body, { db: getDb(), privateJwk: privateJwk(), bits: powBits(), now: new Date(), ip: clientIp(request) })
  return new Response(null, { status })
}
