// @vitest-environment node
import { beforeEach, expect, it } from 'vitest'
import type { PublishedFile } from '../src/domain/types'
import { shiftWeek } from '../src/domain/weeks'
import { migrate, type Db } from './db'
import { latestPublished, publishWeek } from './publish'
import { testDb } from './testDb'
import { serverWeek } from './week'

const NOW = new Date('2026-11-16T20:00:00Z') // Monday 03:00 in Bangkok
const ENDED = shiftWeek(serverWeek(NOW), -1)
const Q = 0.002
let db: Db
beforeEach(async () => {
  db = await testDb()
  await migrate(db)
})
const put = (zone: string, kind: string, week: string, n: number) => db.query('insert into counts (zone, kind, week, n) values ($1, $2, $3, $4)', [zone, kind, week, n])
const area = (file: PublishedFile, id: string) => file.areas.find((a) => a.areaId === id)!

it('publishes the week that just ended from the counts, and says whether intake is open', async () => {
  await put('bang_rak', 'syphilis', ENDED, 12)
  const file = await publishWeek(db, ENDED, NOW, Q)
  expect(file.week).toBe(ENDED)
  expect(file.intakeOpen).toBe(true)
  expect(area(file, 'bang_rak')).toMatchObject({ state: 'shown', step: 'new' })
  expect(await latestPublished(db)).toEqual(file)
  await db.query("insert into settings (name, value) values ('intake', 'closed')")
  expect((await publishWeek(db, ENDED, NOW, Q)).intakeOpen).toBe(false)
})
it('holds a sudden jump out of the file until two reviewers release it', async () => {
  await put('chatuchak', 'syphilis', shiftWeek(ENDED, -1), 2)
  await put('chatuchak', 'syphilis', ENDED, 40)
  const held = await publishWeek(db, ENDED, NOW, Q)
  // Only the week before (2 reports) remains while the jump is held.
  expect(area(held, 'chatuchak').state).toBe('below_threshold')
  const rows = await db.query<{ id: number; status: string }>('select id, status from held')
  expect(rows).toEqual([{ id: expect.any(Number), status: 'pending' }])
  await db.query("update held set status = 'released'")
  expect(area(await publishWeek(db, ENDED, NOW, Q), 'chatuchak').state).toBe('shown')
  expect(await db.query('select * from held')).toHaveLength(1)
})
it('marks a suspended zone as suspended', async () => {
  await put('bang_kapi', 'syphilis', ENDED, 30)
  await db.query("insert into suspensions (zone, reason, started) values ('bang_kapi', 'เรื่องร้องเรียน', '2026-11-15')")
  expect(area(await publishWeek(db, ENDED, NOW, Q), 'bang_kapi').state).toBe('suspended')
})
it('takes the expected random reports off using the envelopes of each week', async () => {
  await put('bang_rak', 'syphilis', ENDED, 13)
  // 100000 envelopes: one random report expected in each of the 50 × 4 cells, so 13 counted is an estimate of 12, under 10 + 3.
  await db.query('insert into envelope_totals (week, n) values ($1, 100000)', [ENDED])
  expect(area(await publishWeek(db, ENDED, NOW, Q), 'bang_rak').state).toBe('below_threshold')
})
it('deletes totals older than twelve weeks, and the keys, nonces and network counts', async () => {
  const old = shiftWeek(ENDED, -12)
  const kept = shiftWeek(ENDED, -11)
  await put('bang_rak', 'syphilis', old, 3)
  await put('bang_rak', 'syphilis', kept, 3)
  for (const table of ['envelope_totals', 'harm_reports']) await db.query(`insert into ${table} (week, ${table === 'harm_reports' ? 'kind, ' : ''}n) values ($1, ${table === 'harm_reports' ? "'other', " : ''}1)`, [old])
  await db.query("insert into seen_nonces (week, nonce) values ($1, 'a'), ($2, 'b')", [ENDED, serverWeek(NOW)])
  await db.query("insert into network_caps (week, grp, n) values ($1, 'x', 1)", [ENDED])
  await db.query("insert into week_keys (week, key) values ($1, 'x')", [ENDED])
  await publishWeek(db, ENDED, NOW, Q)
  expect((await db.query<{ week: string }>('select week from counts')).map((r) => r.week)).toEqual([kept])
  expect(await db.query('select * from envelope_totals where week = $1', [old])).toHaveLength(0)
  expect(await db.query('select * from harm_reports')).toHaveLength(0)
  expect((await db.query<{ week: string }>('select week from seen_nonces')).map((r) => r.week)).toEqual([serverWeek(NOW)])
  expect(await db.query('select * from network_caps')).toHaveLength(0)
  expect(await db.query('select * from week_keys')).toHaveLength(0)
})
it('replaces the file when the same week is published again, without holding a cell twice', async () => {
  await put('chatuchak', 'syphilis', ENDED, 40)
  await publishWeek(db, ENDED, NOW, Q)
  await publishWeek(db, ENDED, NOW, Q)
  expect(await db.query('select * from published')).toHaveLength(1)
  expect(await db.query('select * from held')).toHaveLength(1)
})
it('does not let a held or discarded jump become the baseline for the next week', async () => {
  await put('chatuchak', 'syphilis', shiftWeek(ENDED, -2), 2)
  await put('chatuchak', 'syphilis', shiftWeek(ENDED, -1), 30)
  await db.query("insert into held (zone, kind, week, n, status) values ('chatuchak', 'syphilis', $1, 30, 'discarded')", [shiftWeek(ENDED, -1)])
  await put('chatuchak', 'syphilis', ENDED, 90)
  const file = await publishWeek(db, ENDED, NOW, Q)
  expect(await db.query("select week, status from held where week = $1", [ENDED])).toEqual([{ week: ENDED, status: 'pending' }])
  expect(area(file, 'chatuchak').state).not.toBe('shown')
})
it('checks a week the job missed for jumps before publishing the next one', async () => {
  const missed = shiftWeek(ENDED, -1)
  await db.query("insert into published (week, file) values ($1, '{}')", [shiftWeek(ENDED, -2)])
  await put('chatuchak', 'syphilis', shiftWeek(ENDED, -2), 2)
  await put('chatuchak', 'syphilis', missed, 40)
  await publishWeek(db, ENDED, NOW, Q)
  expect(await db.query('select week, status from held')).toEqual([{ week: missed, status: 'pending' }])
})
