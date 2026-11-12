import { getDb, json } from '../server/env.js'
import { latestPublished } from '../server/publish.js'

/** Short, so a reviewer closing or opening intake reaches phones within a minute. */
const CACHE = 'public, max-age=60, s-maxage=60'

/**
 * The latest weekly file, the same for every phone, with the live intake setting laid over it.
 * Before the first publication, an empty one.
 */
export async function GET(_request?: Request): Promise<Response> {
  const db = getDb()
  const [setting] = await db.query<{ value: string }>("select value from settings where name = 'intake'")
  const intakeOpen = setting?.value !== 'closed'
  const file = await latestPublished(db)
  return json(file ? { ...file, intakeOpen } : { week: null, publishedAt: null, intakeOpen, areas: [] }, 200, CACHE)
}
