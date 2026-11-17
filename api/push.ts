import { getDb, json, vapidJwk } from '../server/env.js'
import { bangkokDay, isPushEndpoint, subscribe, unsubscribe, vapidPublicKey } from '../server/push.js'

// Following a district (redesign spec 5.11): the push key, and adding or removing one push address.
// Nothing here reads the client's address, and no body may carry anything but the push address.

const key = (): JsonWebKey | null => {
  try {
    return vapidJwk()
  } catch {
    return null
  }
}

async function endpointOf(request: Request): Promise<string | null> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return null
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const names = Object.keys(body)
  if (names.length !== 1 || names[0] !== 'endpoint') return null
  const { endpoint } = body as { endpoint: unknown }
  return isPushEndpoint(endpoint) ? endpoint : null
}

/** The public half of the push key, which a phone needs to subscribe. */
export async function GET(_request?: Request): Promise<Response> {
  const jwk = key()
  if (!jwk) return new Response(null, { status: 503 })
  return json({ key: vapidPublicKey(jwk) }, 200, 'public, max-age=86400')
}

/** Keeps a push address and the day it came. */
export async function POST(request: Request): Promise<Response> {
  if (!key()) return new Response(null, { status: 503 })
  const endpoint = await endpointOf(request)
  if (!endpoint) return new Response(null, { status: 400 })
  // A full list takes no new address (server/push.ts, MAX_SUBSCRIPTIONS).
  if ((await subscribe(getDb(), endpoint, bangkokDay(new Date()))) === 'full') return new Response(null, { status: 503 })
  return new Response(null, { status: 204 })
}

/** Forgets a push address, whether or not it was kept. */
export async function DELETE(request: Request): Promise<Response> {
  const endpoint = await endpointOf(request)
  if (!endpoint) return new Response(null, { status: 400 })
  await unsubscribe(getDb(), endpoint)
  return new Response(null, { status: 204 })
}
