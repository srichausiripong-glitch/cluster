// @vitest-environment node
import { beforeEach, expect, it } from 'vitest'
import type { PublishedFile } from '../src/domain/types'
import { shiftWeek } from '../src/domain/weeks'
import { migrate, type Db } from './db'
import { latestPublished, liveFile, publishWeek } from './publish'
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
  // Only the week before (2 reports, thin) remains while the jump is held.
  expect(area(held, 'chatuchak')).toMatchObject({ state: 'shown', density: 'thin' })
  const rows = await db.query<{ id: number; status: string }>('select id, status from held')
  expect(rows).toEqual([{ id: expect.any(Number), status: 'pending' }])
  await db.query("update held set status = 'released'")
  expect(area(await publishWeek(db, ENDED, NOW, Q), 'chatuchak')).toMatchObject({ state: 'shown', density: 'dense' })
  expect(await db.query('select * from held')).toHaveLength(1)
})
it('marks a suspended zone as suspended', async () => {
  await put('bang_kapi', 'syphilis', ENDED, 30)
  await db.query("insert into suspensions (zone, reason, started) values ('bang_kapi', 'เรื่องร้องเรียน', '2026-11-15')")
  expect(area(await publishWeek(db, ENDED, NOW, Q), 'bang_kapi').state).toBe('suspended')
})
it('raises the bar by the random reports expected from the envelopes of each week', async () => {
  await put('bang_rak', 'syphilis', ENDED, 5)
  // 100000 envelopes: one random report expected in each of the 50 × 4 cells; red counts two cells that
  // week, so λ = 2 and it needs round(1 + 2 + 2√2) = 6 (owner, 25 Nov 2026).
  await db.query('insert into envelope_totals (week, n) values ($1, 100000)', [ENDED])
  expect(area(await publishWeek(db, ENDED, NOW, Q), 'bang_rak').state).toBe('below_threshold')
  await db.query("update counts set n = 6 where zone = 'bang_rak' and kind = 'syphilis'")
  expect(area(await publishWeek(db, ENDED, NOW, Q), 'bang_rak')).toMatchObject({ state: 'shown', density: 'medium' })
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
  // Only the 2 from two weeks back count: neither the discarded 30 nor the held 90.
  expect(area(file, 'chatuchak')).toMatchObject({ state: 'shown', density: 'thin' })
})
it('checks a week the job missed for jumps before publishing the next one', async () => {
  const missed = shiftWeek(ENDED, -1)
  await db.query("insert into published (week, file) values ($1, '{}')", [shiftWeek(ENDED, -2)])
  await put('chatuchak', 'syphilis', shiftWeek(ENDED, -2), 2)
  await put('chatuchak', 'syphilis', missed, 40)
  await publishWeek(db, ENDED, NOW, Q)
  expect(await db.query('select week, status from held')).toEqual([{ week: missed, status: 'pending' }])
})
it('forgets corrections older than twelve weeks', async () => {
  await db.query("insert into place_reports (week, place, kind, value, n) values ($1, 'osm-node-1', 'closed', '', 1), ($2, 'osm-node-2', 'closed', '', 1)", [shiftWeek(ENDED, -12), shiftWeek(ENDED, -11)])
  await publishWeek(db, ENDED, NOW, Q)
  expect((await db.query<{ place: string }>('select place from place_reports')).map((r) => r.place)).toEqual(['osm-node-2'])
})

// ---- the live map (owner, 25 Nov 2026) -------------------------------------------------------------
const WEEK = serverWeek(NOW)
it('works the file out from the counts as they stand, with this week as the first', async () => {
  await put('bang_rak', 'syphilis', WEEK, 1)
  const file = await liveFile(db, NOW, Q)
  expect(file.week).toBe(WEEK)
  expect(area(file, 'bang_rak')).toMatchObject({ state: 'shown', density: 'thin', step: 'new' })
  expect(await db.query('select * from published')).toHaveLength(0)
})
it('leaves a jump this week off the live map before the daily job has held it, and stores nothing', async () => {
  await put('chatuchak', 'syphilis', shiftWeek(WEEK, -1), 2)
  await put('chatuchak', 'syphilis', WEEK, 40)
  const file = await liveFile(db, NOW, Q)
  expect(area(file, 'chatuchak')).toMatchObject({ state: 'shown', density: 'thin' })
  expect(await db.query('select * from held')).toHaveLength(0)
})
it('leaves held and discarded cells off the live map, and shows them once released', async () => {
  await put('bang_kapi', 'syphilis', WEEK, 3)
  await db.query("insert into held (zone, kind, week, n, status) values ('bang_kapi', 'syphilis', $1, 3, 'pending')", [WEEK])
  expect(area(await liveFile(db, NOW, Q), 'bang_kapi').state).toBe('below_threshold')
  await db.query("update held set status = 'released'")
  expect(area(await liveFile(db, NOW, Q), 'bang_kapi').state).toBe('shown')
})
it('says live whether intake is open', async () => {
  await db.query("insert into settings (name, value) values ('intake', 'closed')")
  expect((await liveFile(db, NOW, Q)).intakeOpen).toBe(false)
})
it('checks last week again on the first run of a new week, so a jump on its last evening is held', async () => {
  const last = shiftWeek(WEEK, -1)
  await publishWeek(db, last, NOW, Q)
  await put('chatuchak', 'syphilis', last, 40)
  expect(area(await liveFile(db, NOW, Q), 'chatuchak').state).toBe('below_threshold')
  await publishWeek(db, WEEK, NOW, Q)
  expect(await db.query('select zone, week, status from held')).toEqual([{ zone: 'chatuchak', week: last, status: 'pending' }])
})
// Final review of the live map (25 Nov 2026).
it('shows a jump on the live map once two reviewers released it', async () => {
  await put('chatuchak', 'syphilis', shiftWeek(WEEK, -1), 2)
  await put('chatuchak', 'syphilis', WEEK, 40)
  await db.query("insert into held (zone, kind, week, n, status) values ('chatuchak', 'syphilis', $1, 40, 'released')", [WEEK])
  expect(area(await liveFile(db, NOW, Q), 'chatuchak')).toMatchObject({ state: 'shown', density: 'dense' })
})
it('does not take last week’s unheld jump as the baseline for this week', async () => {
  await put('chatuchak', 'syphilis', shiftWeek(WEEK, -1), 25)
  await put('chatuchak', 'syphilis', WEEK, 30)
  expect(area(await liveFile(db, NOW, Q), 'chatuchak').state).toBe('below_threshold')
})
