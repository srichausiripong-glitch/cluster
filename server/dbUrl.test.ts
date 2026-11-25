// @vitest-environment node
import { expect, it } from 'vitest'
import { databaseUrl } from './dbUrl'

// Preview has its own database, so trying a preview never writes into the one people use.
// Production always reads DATABASE_URL; only a preview deploy may read PREVIEW_DATABASE_URL.
const from = (vars: Record<string, string>) => (name: string) => vars[name]

it('uses the preview database on a preview deploy, and the shared one everywhere else', () => {
  const both = { DATABASE_URL: 'postgres://main', PREVIEW_DATABASE_URL: 'postgres://preview' }
  expect(databaseUrl(from({ ...both, VERCEL_ENV: 'preview' }))).toEqual({ url: 'postgres://preview', preview: true })
  expect(databaseUrl(from({ ...both, VERCEL_ENV: 'production' }))).toEqual({ url: 'postgres://main', preview: false })
  expect(databaseUrl(from(both))).toEqual({ url: 'postgres://main', preview: false })
})
it('falls back to the shared database on a preview that has no database of its own', () => {
  expect(databaseUrl(from({ DATABASE_URL: 'postgres://main', VERCEL_ENV: 'preview' }))).toEqual({ url: 'postgres://main', preview: false })
  expect(databaseUrl(from({}))).toEqual({ url: undefined, preview: false })
})
