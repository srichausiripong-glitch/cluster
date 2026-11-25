import { adminState, decideHeld, setIntake, suspend, unsuspend } from '../server/admin.js'
import { login, reviewerOf, sessionCookie, sessionValue } from '../server/auth.js'
import { clientIp, getDb, json } from '../server/env.js'

/** The back office, one endpoint: { action, … } (v1 spec 6). Every action but login needs a session. */
export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return new Response(null, { status: 400 })
  }
  const db = getDb()
  const now = new Date()
  if (body.action === 'login') {
    const name = String(body.name ?? '')
    const result = await login(db, name, String(body.password ?? ''), now.getTime(), clientIp(request))
    if (result === 'locked') return new Response(null, { status: 429 })
    if (result === 'wrong') return new Response(null, { status: 401 })
    return new Response(null, { status: 200, headers: { 'set-cookie': sessionCookie(sessionValue(name, now.getTime())) } })
  }
  if (body.action === 'logout') return new Response(null, { status: 200, headers: { 'set-cookie': 'cluster_admin=; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=0' } })

  const reviewer = reviewerOf(request, now.getTime())
  if (!reviewer) return new Response(null, { status: 401 })
  switch (body.action) {
    case 'state':
      return json(await adminState(db, now))
    case 'intake':
      await setIntake(db, now, reviewer, body.open === true)
      return json({ ok: true })
    case 'held':
      if (body.choice !== 'release' && body.choice !== 'discard') return new Response(null, { status: 400 })
      await decideHeld(db, now, reviewer, Number(body.id), body.choice)
      return json({ ok: true })
    case 'suspend':
      return (await suspend(db, now, reviewer, String(body.zone ?? ''), String(body.reason ?? ''))) ? json({ ok: true }) : new Response(null, { status: 400 })
    case 'unsuspend':
      await unsuspend(db, now, reviewer, Number(body.id))
      return json({ ok: true })
    default:
      return new Response(null, { status: 400 })
  }
}
