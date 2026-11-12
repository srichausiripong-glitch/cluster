import { getDb, json } from '../server/env'
import { latestPublished } from '../server/publish'

/** The latest weekly file, the same for every phone. Before the first publication, an empty one. */
export async function GET(_request?: Request): Promise<Response> {
  const db = getDb()
  const file = await latestPublished(db)
  if (file) return json(file, 200, 'public, max-age=3600')
  const [setting] = await db.query<{ value: string }>("select value from settings where name = 'intake'")
  return json({ week: null, publishedAt: null, intakeOpen: setting?.value !== 'closed', areas: [] }, 200, 'public, max-age=3600')
}
