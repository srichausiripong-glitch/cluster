import { HARM_KINDS } from '../src/app/harm'
import { getDb } from '../server/env'
import { serverWeek } from '../server/week'

/** Counts one harm report by its fixed kind. No text, no address, no time finer than the week. */
export async function POST(request: Request): Promise<Response> {
  let kind: unknown
  try {
    kind = ((await request.json()) as { kind?: unknown }).kind
  } catch {
    return new Response(null, { status: 400 })
  }
  if (!(HARM_KINDS as readonly unknown[]).includes(kind)) return new Response(null, { status: 400 })
  await getDb().query('insert into harm_reports (week, kind, n) values ($1, $2, 1) on conflict (week, kind) do update set n = harm_reports.n + 1', [serverWeek(new Date()), kind])
  return new Response(null, { status: 202 })
}
