import { Q } from '../../src/domain/envelope'
import { shiftWeek } from '../../src/domain/weeks'
import { env, getDb, json } from '../../server/env'
import { publishWeek } from '../../server/publish'
import { serverWeek } from '../../server/week'

/** Vercel Cron calls this every Monday 03:00 in Bangkok to publish the week that just ended. */
export async function GET(request: Request): Promise<Response> {
  const secret = env('CRON_SECRET')
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return new Response(null, { status: 401 })
  const now = new Date()
  const file = await publishWeek(getDb(), shiftWeek(serverWeek(now), -1), now, Q)
  return json({ week: file.week })
}
