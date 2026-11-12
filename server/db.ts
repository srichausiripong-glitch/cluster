import { neon } from '@neondatabase/serverless'
import { SCHEMA } from './schema.js'

/** The one thing the server needs from a database: run a statement with parameters, get rows back. */
export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>
}

/** Postgres on Neon over HTTP, as Vercel Functions reach it. */
export function neonDb(url: string): Db {
  const sql = neon(url)
  return { query: async <T,>(text: string, params: unknown[] = []) => (await sql.query(text, params)) as T[] }
}


/** Creates the tables that are missing. Safe to run again. */
export async function migrate(db: Db): Promise<void> {
  const statements = SCHEMA.split(';')
    .map((s) => s.replace(/^\s*--[^\n]*$/gm, '').trim())
    .filter(Boolean)
  for (const statement of statements) await db.query(statement)
}
