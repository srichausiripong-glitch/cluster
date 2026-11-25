// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { expect, it } from 'vitest'
import { login } from './auth'
import { migrate } from './db'
import { setEnvForTest } from './env'
import { testDb } from './testDb'

it('makes a hash the sign-in accepts', async () => {
  const hash = execFileSync('node', ['scripts/admin-hash.ts', 'a long passphrase'], { encoding: 'utf8' }).trim()
  setEnvForTest({ ADMIN_USERS: JSON.stringify([{ name: 'ก้อย', hash }]), SESSION_SECRET: 's' })
  const db = await testDb()
  await migrate(db)
  expect(await login(db, 'ก้อย', 'a long passphrase', Date.now())).toBe('ok')
  expect(await login(db, 'ก้อย', 'another', Date.now())).toBe('wrong')
  setEnvForTest(null)
})
