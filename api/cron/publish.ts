import { Q } from '../../src/domain/envelope.js'
import { env, getDb, json } from '../../server/env.js'
import { publishWeek } from '../../server/publish.js'
import { serverWeek } from '../../server/week.js'

/**
 * Vercel Cron calls this every day at 03:00 in Bangkok (live map, owner 25 Nov 2026): it holds this
 * week's jumps for two reviewers, stores the week's snapshot and deletes what is past keeping. The map
 * itself is live and does not wait for it.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = env('CRON_SECRET')
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return new Response(null, { status: 401 })
  const now = new Date()
  const file = await publishWeek(getDb(), serverWeek(now), now, Q)
  return json({ week: file.week })
}
