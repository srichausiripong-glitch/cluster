import { HARM_KINDS } from '../src/app/harm.js'
import { clientIp, getDb } from '../server/env.js'
import { hiddenGroup, weekKey } from '../server/keys.js'
import { serverWeek } from '../server/week.js'

/** Harm reports counted from one network group in one week, so a flood cannot drive a suspension. */
export const HARM_CAP = 3

/** Counts one harm report by its fixed kind. No text, no address, no time finer than the week. */
export async function POST(request: Request): Promise<Response> {
  let kind: unknown
  try {
    kind = ((await request.json()) as { kind?: unknown }).kind
  } catch {
    return new Response(null, { status: 400 })
  }
  if (!(HARM_KINDS as readonly unknown[]).includes(kind)) return new Response(null, { status: 400 })
  const db = getDb()
  const week = serverWeek(new Date())
  const grp = hiddenGroup(await weekKey(db, week), clientIp(request))
  await db.query(
    `with cap as (
       insert into network_caps (week, grp, harm) values ($1, $2, 1)
       on conflict (week, grp) do update set harm = network_caps.harm + 1 returning harm
     )
     insert into harm_reports (week, kind, n) select $1, $3, 1 from cap where cap.harm <= $4
     on conflict (week, kind) do update set n = harm_reports.n + 1`,
    [week, grp, kind, HARM_CAP],
  )
  return new Response(null, { status: 202 })
}
