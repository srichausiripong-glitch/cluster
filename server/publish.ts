import { displayFile, type CountRow } from '../src/domain/display.js'
import { heldCells } from '../src/domain/held.js'
import type { PublishedFile, ReportKind } from '../src/domain/types.js'
import { weekIndex } from '../src/domain/weeks.js'
import type { Db } from './db.js'
import { serverWeek } from './week.js'

/** Totals older than this many weeks are deleted (amendment 7). */
const KEEP_WEEKS = 12

/**
 * The weekly job (v1 spec 4.3): holds sudden jumps, builds the file from the counts that are not
 * held or discarded, stores it, and deletes what the rules say must not be kept.
 */
export async function publishWeek(db: Db, endedWeek: string, now: Date, q: number): Promise<PublishedFile> {
  const counts = await db.query<CountRow>('select zone, kind, week, n from counts')

  type Held = { zone: string; kind: ReportKind; week: string }
  const heldNow = () => db.query<Held>("select zone, kind, week from held where status <> 'released'")
  const isIn = (held: Held[]) => (c: CountRow) => held.some((h) => h.zone === c.zone && h.kind === c.kind && h.week === c.week)

  // Every week since the last publication is checked, oldest first, so a week whose job failed
  // (Vercel does not retry a cron) is still held-checked before its counts reach a file.
  const [last] = await db.query<{ week: string }>('select max(week) as week from published')
  const toCheck = [...new Set(counts.map((c) => c.week))]
    .filter((w) => w === endedWeek || (weekIndex(w, endedWeek) > 1 && (!last?.week || weekIndex(last.week, w) > 1)))
    .sort((a, b) => 1 - weekIndex(a, b))
  for (const week of toCheck) {
    const rejected = isIn(await heldNow())
    const kept = counts.filter((c) => !rejected(c))
    for (const cell of heldCells(kept, week)) {
      const [seen] = await db.query('select id from held where zone = $1 and kind = $2 and week = $3', [cell.zone, cell.kind, week])
      if (!seen) await db.query("insert into held (zone, kind, week, n, status) values ($1, $2, $3, $4, 'pending')", [cell.zone, cell.kind, week, cell.n])
    }
  }
  const isHeld = isIn(await heldNow())

  const envelopes = Object.fromEntries((await db.query<{ week: string; n: number }>('select week, n from envelope_totals')).map((r) => [r.week, r.n]))
  const suspended = (await db.query<{ zone: string }>('select zone from suspensions where ended is null')).map((r) => r.zone)
  const [setting] = await db.query<{ value: string }>("select value from settings where name = 'intake'")

  const file: PublishedFile = {
    week: endedWeek,
    publishedAt: now.toISOString(),
    intakeOpen: setting?.value !== 'closed',
    areas: displayFile({ counts: counts.filter((c) => !isHeld(c)), envelopes, nowWeek: endedWeek, q, suspended }),
  }
  await db.query('insert into published (week, file) values ($1, $2) on conflict (week) do update set file = excluded.file', [endedWeek, JSON.stringify(file)])

  for (const table of ['counts', 'envelope_totals', 'harm_reports', 'place_reports']) {
    const weeks = (await db.query<{ week: string }>(`select distinct week from ${table}`)).map((r) => r.week)
    const old = weeks.filter((w) => weekIndex(w, endedWeek) > KEEP_WEEKS)
    if (old.length) await db.query(`delete from ${table} where week = any($1)`, [old])
  }
  const current = serverWeek(now)
  for (const table of ['seen_nonces', 'network_caps', 'week_keys']) await db.query(`delete from ${table} where week <> $1`, [current])
  return file
}

export async function latestPublished(db: Db): Promise<PublishedFile | null> {
  const [row] = await db.query<{ file: PublishedFile | string }>('select file from published order by week desc limit 1')
  if (!row) return null
  return typeof row.file === 'string' ? (JSON.parse(row.file) as PublishedFile) : row.file
}
