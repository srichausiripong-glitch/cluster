import { neonDb, type Db } from './db'

/** The server's settings, from Vercel's environment variables. Tests lay their own over them. */
let override: Record<string, string> | null = null
export function setEnvForTest(values: Record<string, string> | null): void {
  override = values
}
export function env(name: string): string | undefined {
  return override ? override[name] : process.env[name]
}

let db: Db | null = null
export function setDbForTest(test: Db | null): void {
  db = test
}
export function getDb(): Db {
  if (db) return db
  const url = env('DATABASE_URL')
  if (!url) throw new Error('DATABASE_URL is not set')
  db = neonDb(url)
  return db
}

export function privateJwk(): JsonWebKey {
  const raw = env('ENVELOPE_PRIVATE_JWK')
  if (!raw) throw new Error('ENVELOPE_PRIVATE_JWK is not set')
  return JSON.parse(raw) as JsonWebKey
}
/** Leading zero bits of the proof of work: 19 takes about ten seconds on a mid-range phone (amendment 6). */
export const powBits = () => Number(env('POW_BITS') ?? 19)

/** The address the request came from, as Vercel passes it. Used only to find its network group, never kept. */
export function clientIp(request: Request): string {
  return (request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '').split(',')[0].trim()
}

export const json = (body: unknown, status = 200, cache = 'no-store') => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': cache } })
