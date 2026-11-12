import { transparencyReport } from '../server/admin'
import { getDb, json } from '../server/env'

/** The public transparency report: decisions with reviewers' names, and weekly totals. */
export async function GET(_request?: Request): Promise<Response> {
  return json(await transparencyReport(getDb()), 200, 'public, max-age=300')
}
