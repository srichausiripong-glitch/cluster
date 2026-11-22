/**
 * Which database to use. A preview deploy uses PREVIEW_DATABASE_URL when it is set, so trying a
 * preview never writes test data into the database people use; production, and a preview without
 * its own database, use DATABASE_URL. Shared by the server and scripts/migrate.ts.
 */
export function databaseUrl(get: (name: string) => string | undefined): { url: string | undefined; preview: boolean } {
  const preview = get('VERCEL_ENV') === 'preview' ? get('PREVIEW_DATABASE_URL') : undefined
  return preview ? { url: preview, preview: true } : { url: get('DATABASE_URL'), preview: false }
}
