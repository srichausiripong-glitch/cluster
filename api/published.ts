import { Q } from '../src/domain/envelope.js'
import { getDb, json } from '../server/env.js'
import { liveFile } from '../server/publish.js'

/** Seconds, so a report reaches every phone within moments while the database is asked at most every ten seconds. */
const CACHE = 'public, max-age=0, s-maxage=10, stale-while-revalidate=20'

/** The live map (owner, 25 Nov 2026): the same file for every phone, worked out from the counts as they stand. */
export async function GET(_request?: Request): Promise<Response> {
  return json(await liveFile(getDb(), new Date(), Q), 200, CACHE)
}
