import { PGlite } from '@electric-sql/pglite'
import type { Db } from './db'

/** A real Postgres in this process, empty, for one test. */
export async function testDb(): Promise<Db> {
  const pg = new PGlite()
  await pg.waitReady
  return { query: async <T,>(text: string, params: unknown[] = []) => (await pg.query<T>(text, params)).rows }
}
