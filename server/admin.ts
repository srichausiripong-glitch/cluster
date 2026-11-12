import { ZONES_IN_FILE } from '../src/domain/display.js'
import type { Db } from './db.js'
import { serverWeek } from './week.js'

const day = (now: Date) => new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10)

async function log(db: Db, now: Date, reviewer: string, action: string, detail: string) {
  await db.query('insert into admin_log (week, day, reviewer, action, detail) values ($1, $2, $3, $4, $5)', [serverWeek(now), day(now), reviewer, action, detail])
}

/** What a reviewer sees: totals only (v1 spec 6). */
export async function adminState(db: Db) {
  const [setting] = await db.query<{ value: string }>("select value from settings where name = 'intake'")
  return {
    intakeOpen: setting?.value !== 'closed',
    envelopes: await db.query('select week, n from envelope_totals order by week desc'),
    held: await db.query('select id, zone, kind, week, n, status, first_reviewer, first_choice from held order by id desc'),
    suspensions: await db.query('select id, zone, reason, started, ended from suspensions order by id desc'),
    harm: await db.query('select week, kind, n from harm_reports order by week desc, kind'),
  }
}

export async function setIntake(db: Db, now: Date, reviewer: string, open: boolean) {
  await db.query("insert into settings (name, value) values ('intake', $1) on conflict (name) do update set value = excluded.value", [open ? 'open' : 'closed'])
  await log(db, now, reviewer, 'intake', open ? 'เปิดรับรายงาน' : 'ปิดรับรายงาน')
}

/**
 * A held cell is released or discarded when two different reviewers choose the same. The first
 * reviewer may change their own choice; a second who disagrees leaves it pending (amendment 6).
 */
export async function decideHeld(db: Db, now: Date, reviewer: string, id: number, choice: 'release' | 'discard') {
  const [row] = await db.query<{ status: string; first_reviewer: string | null; first_choice: string | null }>('select status, first_reviewer, first_choice from held where id = $1', [id])
  if (!row || row.status !== 'pending') return
  await log(db, now, reviewer, 'held', `${id} ${choice}`)
  if (!row.first_reviewer || row.first_reviewer === reviewer) {
    await db.query('update held set first_reviewer = $2, first_choice = $3 where id = $1', [id, reviewer, choice])
    return
  }
  if (row.first_choice !== choice) return
  await db.query('update held set status = $2, decided_at = $3 where id = $1', [id, choice === 'release' ? 'released' : 'discarded', now])
}

export async function suspend(db: Db, now: Date, reviewer: string, zone: string, reason: string) {
  if (!(ZONES_IN_FILE as readonly string[]).includes(zone) || !reason.trim()) return false
  await db.query('insert into suspensions (zone, reason, started) values ($1, $2, $3)', [zone, reason.trim().slice(0, 200), day(now)])
  await log(db, now, reviewer, 'suspend', `${zone}: ${reason.trim().slice(0, 200)}`)
  return true
}

export async function unsuspend(db: Db, now: Date, reviewer: string, id: number) {
  await db.query('update suspensions set ended = $2 where id = $1 and ended is null', [id, day(now)])
  await log(db, now, reviewer, 'unsuspend', String(id))
}

/** What anyone may read: every decision with the reviewer's name, and the weekly totals (v1 spec 6). */
export async function transparencyReport(db: Db) {
  return {
    decisions: await db.query("select day, reviewer, action, detail from admin_log where action in ('intake', 'held', 'suspend', 'unsuspend') order by id desc"),
    held: await db.query('select zone, kind, week, n, status, decided_at from held order by id desc'),
    suspensions: await db.query('select zone, reason, started, ended from suspensions order by id desc'),
    envelopes: await db.query('select week, n from envelope_totals order by week desc'),
  }
}
