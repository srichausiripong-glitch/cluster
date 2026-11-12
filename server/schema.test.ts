// @vitest-environment node
import { expect, it } from 'vitest'
import { migrate } from './db'
import { testDb } from './testDb'

it('keeps no address, browser or envelope content in any table', async () => {
  const db = await testDb()
  await migrate(db)
  const columns = await db.query<{ table_name: string; column_name: string }>("select table_name, column_name from information_schema.columns where table_schema = 'public'")
  expect(columns.length).toBeGreaterThan(20)
  expect(columns.filter((c) => /ip|addr|agent|body|^ct$|payload|epk/.test(c.column_name)).map((c) => `${c.table_name}.${c.column_name}`)).toEqual([])
  expect(new Set(columns.map((c) => c.table_name))).toEqual(
    new Set(['counts', 'envelope_totals', 'seen_nonces', 'network_caps', 'week_keys', 'held', 'published', 'suspensions', 'harm_reports', 'settings', 'admin_log', 'login_failures']),
  )
})
it('can be set up twice without failing', async () => {
  const db = await testDb()
  await migrate(db)
  await migrate(db)
})
