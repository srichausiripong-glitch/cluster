// @vitest-environment node
import { beforeEach, expect, it } from 'vitest'
import { POST as admin } from '../api/admin'
import { GET as transparency } from '../api/transparency'
import { hashPassword } from './auth'
import { migrate, type Db } from './db'
import { setDbForTest, setEnvForTest } from './env'
import { publishWeek } from './publish'
import { testDb } from './testDb'

let db: Db
beforeEach(async () => {
  db = await testDb()
  await migrate(db)
  setDbForTest(db)
  setEnvForTest({ ADMIN_USERS: JSON.stringify([{ name: 'ก้อย', hash: hashPassword('pw-koi') }, { name: 'บอล', hash: hashPassword('pw-ball') }]), SESSION_SECRET: 'session-secret-for-tests' })
  await db.query("insert into held (zone, kind, week, n, status) values ('chatuchak', 'syphilis', '2026-W46', 40, 'pending')")
})
const call = (body: unknown, cookie?: string, ip = '198.51.100.7') =>
  admin(new Request('https://cluster.test/api/admin', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }))
async function login(name: string, password: string): Promise<string> {
  const res = await call({ action: 'login', name, password })
  expect(res.status, name).toBe(200)
  const cookie = res.headers.get('set-cookie')!
  expect(cookie).toMatch(/HttpOnly/)
  expect(cookie).toMatch(/Secure/)
  expect(cookie).toMatch(/SameSite=Strict/)
  return cookie.split(';')[0]
}
const heldStatus = async () => (await db.query<{ status: string }>('select status from held'))[0].status

it('refuses an unknown name or a wrong password', async () => {
  expect((await call({ action: 'login', name: 'ใครก็ไม่รู้', password: 'x' })).status).toBe(401)
  expect((await call({ action: 'login', name: 'ก้อย', password: 'wrong' })).status).toBe(401)
})
it('locks a name for fifteen minutes after five wrong passwords, even for the right one', async () => {
  for (let i = 0; i < 5; i++) await call({ action: 'login', name: 'ก้อย', password: 'wrong' })
  expect((await call({ action: 'login', name: 'ก้อย', password: 'pw-koi' })).status).toBe(429)
})
it('never lets wrong guesses from another network lock a reviewer out, since reviewer names are public', async () => {
  for (let i = 0; i < 12; i++) await call({ action: 'login', name: 'ก้อย', password: 'wrong' }, undefined, '203.0.113.5')
  expect((await call({ action: 'login', name: 'ก้อย', password: 'pw-koi' }, undefined, '198.51.100.7')).status).toBe(200)
})
it('records no failure for a name that is not a reviewer', async () => {
  for (let i = 0; i < 6; i++) await call({ action: 'login', name: `x${i}`.repeat(200), password: 'wrong' })
  expect(await db.query('select * from login_failures')).toEqual([])
})
it('still locks after five wrong guesses sent at the same moment', async () => {
  await Promise.all(Array.from({ length: 8 }, () => call({ action: 'login', name: 'ก้อย', password: 'wrong' })))
  expect((await call({ action: 'login', name: 'ก้อย', password: 'pw-koi' })).status).toBe(429)
})
it('keeps a reviewer whose name has a dot signed in as that reviewer, and only that one', async () => {
  setEnvForTest({ ADMIN_USERS: JSON.stringify([{ name: 'a', hash: hashPassword('pw-a') }, { name: 'a.b', hash: hashPassword('pw-ab') }]), SESSION_SECRET: 'session-secret-for-tests' })
  const ab = await login('a.b', 'pw-ab')
  expect((await call({ action: 'state' }, ab)).status).toBe(200)
  const [{ id }] = await db.query<{ id: number }>('select id from held')
  await call({ action: 'held', id, choice: 'release' }, ab)
  expect((await db.query<{ first_reviewer: string }>('select first_reviewer from held'))[0].first_reviewer).toBe('a.b')
})
it('refuses every action without a valid session', async () => {
  for (const action of ['state', 'intake', 'held', 'suspend', 'unsuspend']) expect((await call({ action })).status, action).toBe(401)
  expect((await call({ action: 'state' }, 'cluster_admin=forged.9999999999999.abc')).status).toBe(401)
})
it('releases a held cell only when two different reviewers choose the same', async () => {
  const koi = await login('ก้อย', 'pw-koi')
  const ball = await login('บอล', 'pw-ball')
  const [{ id }] = await db.query<{ id: number }>('select id from held')
  await call({ action: 'held', id, choice: 'release' }, koi)
  await call({ action: 'held', id, choice: 'release' }, koi)
  const second = await login('ก้อย', 'pw-koi')
  await call({ action: 'held', id, choice: 'release' }, second)
  expect(await heldStatus()).toBe('pending')
  await call({ action: 'held', id, choice: 'discard' }, ball)
  expect(await heldStatus()).toBe('pending')
  await call({ action: 'held', id, choice: 'release' }, ball)
  expect(await heldStatus()).toBe('released')
  const log = await db.query<{ reviewer: string; action: string }>('select reviewer, action from admin_log order by id')
  expect(log.filter((l) => l.action === 'held').map((l) => l.reviewer)).toEqual(['ก้อย', 'ก้อย', 'ก้อย', 'บอล', 'บอล'])
})
it('suspends a zone so the next file says so, and shows the decision on the transparency page with the reviewer', async () => {
  const koi = await login('ก้อย', 'pw-koi')
  expect((await call({ action: 'suspend', zone: 'bang_kapi', reason: 'เรื่องร้องเรียน' }, koi)).status).toBe(200)
  const file = await publishWeek(db, '2026-W46', new Date('2026-11-16T20:00:00Z'), 0.002)
  expect(file.areas.find((a) => a.areaId === 'bang_kapi')?.state).toBe('suspended')
  const page = await (await transparency(new Request('https://cluster.test/api/transparency'))).json()
  expect(JSON.stringify(page)).toContain('ก้อย')
  expect(page.suspensions[0]).toMatchObject({ zone: 'bang_kapi', reason: 'เรื่องร้องเรียน' })
})
it('closes and opens intake, and gives totals only, never one envelope', async () => {
  const koi = await login('ก้อย', 'pw-koi')
  await call({ action: 'intake', open: false }, koi)
  expect((await db.query<{ value: string }>("select value from settings where name = 'intake'"))[0].value).toBe('closed')
  const state = await (await call({ action: 'state' }, koi)).json()
  expect(state.intakeOpen).toBe(false)
  expect(Object.keys(state).sort()).toEqual(['city', 'districts', 'envelopes', 'followers', 'harm', 'held', 'intakeOpen', 'lastPublished', 'places', 'suspensions', 'week'])
})

it('suspends a district by id and refuses an old zone id', async () => {
  const koi = await login('ก้อย', 'pw-koi')
  expect((await call({ action: 'suspend', zone: 'bang_rak', reason: 'เรื่องร้องเรียน' }, koi)).status).toBe(200)
  expect((await call({ action: 'suspend', zone: 'east', reason: 'เรื่องร้องเรียน' }, koi)).status).toBe(400)
})
it('shows corrections to reviewers, newest week first', async () => {
  await db.query("insert into place_reports (week, place, kind, value, n) values ('2026-W45', 'osm-node-1', 'closed', '', 2), ('2026-W46', 'osm-node-2', 'add_phone', '021234567', 1)")
  const koi = await login('ก้อย', 'pw-koi')
  const state = await (await call({ action: 'state' }, koi)).json()
  expect(state.places).toEqual([
    { week: '2026-W46', place: 'osm-node-2', kind: 'add_phone', value: '021234567', n: 1 },
    { week: '2026-W45', place: 'osm-node-1', kind: 'closed', value: '', n: 2 },
  ])
})

// The overview (owner, 22 Nov 2026): what the server already keeps, summed. A district is sent only at
// ten or more, as the map never says whether a district below the threshold had none or a few.
it('sums the city per week and kind, sends a district only at ten or more, and counts followers', async () => {
  await db.query(
    "insert into counts (zone, kind, week, n) values ('bang_rak', 'syphilis', '2026-W46', 12), ('chatuchak', 'syphilis', '2026-W46', 3), ('bang_rak', 'tested', '2026-W45', 4), ('chatuchak', 'tested', '2026-W45', 9)",
  )
  await db.query("insert into push_subscriptions (endpoint, created_on) values ('https://push.example/1', '2026-11-01'), ('https://push.example/2', '2026-11-02')")
  const koi = await login('ก้อย', 'pw-koi')
  const state = await (await call({ action: 'state' }, koi)).json()
  expect(state.city).toEqual([
    { week: '2026-W46', kind: 'syphilis', n: 15 },
    { week: '2026-W45', kind: 'tested', n: 13 },
  ])
  expect(state.districts).toEqual([{ week: '2026-W46', zone: 'bang_rak', kind: 'syphilis', n: 12 }])
  expect(state.followers).toBe(2)
  expect(state.week).toMatch(/^\d{4}-W\d{2}$/)
  expect(JSON.stringify(state)).not.toMatch(/push\.example/)
})
it('names the districts the last weekly file showed, and nothing before the first one', async () => {
  const koi = await login('ก้อย', 'pw-koi')
  expect((await (await call({ action: 'state' }, koi)).json()).lastPublished).toBeNull()
  const area = (areaId: string, state: string) => ({ areaId, state, density: null, step: null, testing: null, symptoms: null })
  const file = { week: '2026-W46', publishedAt: '2026-11-16T20:00:00.000Z', intakeOpen: true, areas: [area('bang_rak', 'shown'), area('chatuchak', 'below_threshold'), area('bkk', 'shown')] }
  await db.query('insert into published (week, file) values ($1, $2)', ['2026-W46', JSON.stringify(file)])
  expect((await (await call({ action: 'state' }, koi)).json()).lastPublished).toEqual({ week: '2026-W46', publishedAt: '2026-11-16T20:00:00.000Z', shown: ['bang_rak'] })
})
