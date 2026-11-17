import { env, getDb, json, vapidJwk } from '../../server/env.js'
import { sendWeekly } from '../../server/push.js'

/**
 * Vercel Cron calls this every Monday 12:00 in Bangkok, nine hours after the 03:00 publication, so no
 * notification wakes anyone at night (redesign spec 5.11). It sends the same empty push to every follower.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = env('CRON_SECRET')
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return new Response(null, { status: 401 })
  const subject = env('VAPID_SUBJECT')
  if (!subject) return new Response(null, { status: 503 })
  return json(await sendWeekly({ db: getDb(), jwk: vapidJwk(), subject, now: new Date() }))
}
