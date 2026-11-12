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
  await db.query("insert into held (zone, kind, week, n, status) values ('north', 'syphilis', '2026-W46', 40, 'pending')")
})
const call = (body: unknown, cookie?: string) => admin(new Request('https://cluster.test/api/admin', { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }))
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
  expect((await call({ action: 'suspend', zone: 'east', reason: 'เรื่องร้องเรียน' }, koi)).status).toBe(200)
  const file = await publishWeek(db, '2026-W46', new Date('2026-11-16T20:00:00Z'), 0.002)
  expect(file.areas.find((a) => a.areaId === 'east')?.state).toBe('suspended')
  const page = await (await transparency(new Request('https://cluster.test/api/transparency'))).json()
  expect(JSON.stringify(page)).toContain('ก้อย')
  expect(page.suspensions[0]).toMatchObject({ zone: 'east', reason: 'เรื่องร้องเรียน' })
})
it('closes and opens intake, and gives totals only, never one envelope', async () => {
  const koi = await login('ก้อย', 'pw-koi')
  await call({ action: 'intake', open: false }, koi)
  expect((await db.query<{ value: string }>("select value from settings where name = 'intake'"))[0].value).toBe('closed')
  const state = await (await call({ action: 'state' }, koi)).json()
  expect(state.intakeOpen).toBe(false)
  expect(Object.keys(state).sort()).toEqual(['envelopes', 'harm', 'held', 'intakeOpen', 'suspensions'])
})
