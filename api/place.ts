import { isPlaceId, PHONE_KINDS, PLACE_KINDS, thaiPhone, type PlaceKind } from '../src/app/placeReport.js'
import { clientIp, getDb } from '../server/env.js'
import { hiddenGroup, weekKey } from '../server/keys.js'
import { serverWeek } from '../server/week.js'

/** Corrections counted from one network group in one week, so a flood cannot bury a place's real reports. */
export const PLACE_CAP = 5

/**
 * Counts one correction to a place (2026-11-18 design, decision 4): its id, a fixed kind, and a Thai
 * number only for the two phone kinds. No other field is taken; no address, browser or time finer
 * than the week is kept. The team reads the counts on the admin page and calls before using anything.
 */
export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return new Response(null, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Object.keys(body).some((k) => !['place', 'kind', 'phone'].includes(k))) return new Response(null, { status: 400 })
  const { place, kind } = body
  if (!isPlaceId(place)) return new Response(null, { status: 400 })
  if (!(PLACE_KINDS as readonly unknown[]).includes(kind)) return new Response(null, { status: 400 })
  const takesPhone = PHONE_KINDS.includes(kind as PlaceKind)
  const phone = takesPhone ? thaiPhone(body.phone) : null
  if (takesPhone ? phone === null : body.phone !== undefined) return new Response(null, { status: 400 })
  const db = getDb()
  const week = serverWeek(new Date())
  const grp = hiddenGroup(await weekKey(db, week), clientIp(request))
  await db.query(
    `with cap as (
       insert into network_caps (week, grp, places) values ($1, $2, 1)
       on conflict (week, grp) do update set places = network_caps.places + 1 returning places
     )
     insert into place_reports (week, place, kind, value, n) select $1, $3, $4, $5, 1 from cap where cap.places <= $6
     on conflict (week, place, kind, value) do update set n = place_reports.n + 1`,
    [week, grp, place, kind, phone ?? '', PLACE_CAP],
  )
  return new Response(null, { status: 202 })
}
