/** What the launch check reads: the deploy's settings, the care-point registry, and the clinical register. */
export interface LaunchData {
  carePoints: { id: string; verified: unknown }[]
  clinical: { id: string; status: string }[]
}
const REQUIRED = ['VITE_CONTROLLER_NAME', 'VITE_CONTACT_EMAIL', 'ENVELOPE_PRIVATE_JWK', 'SESSION_SECRET', 'DATABASE_URL', 'CRON_SECRET'] as const

/** Every reason the app is not ready for real users (v1 spec 7.4). An empty list means ready. */
export function launchCheck(env: Record<string, string | undefined>, data: LaunchData): string[] {
  const reasons: string[] = []
  // A preview deploy may run on unconfirmed data to try the whole path; production never may.
  const preview = env.LAUNCH_CHECK_PREVIEW === '1' && env.VERCEL_ENV !== 'production'
  if (preview) data = { carePoints: [{ id: 'preview', verified: true }], clinical: [] }
  if (data.carePoints.length === 0) reasons.push('no care point in src/data/care-points.json')
  for (const p of data.carePoints) if (!p.verified) reasons.push(`care point ${p.id} is not verified`)
  for (const t of data.clinical) if (t.status !== 'signed') reasons.push(`clinical text ${t.id} is not signed by a physician`)
  for (const name of REQUIRED) if (!env[name]?.trim()) reasons.push(`${name} is not set`)
  let reviewers = 0
  try {
    const list: unknown = JSON.parse(env.ADMIN_USERS ?? '[]')
    reviewers = Array.isArray(list) ? new Set(list.map((r) => (r as { name?: unknown }).name)).size : 0
  } catch {
    reviewers = 0
  }
  if (reviewers < 2) reasons.push('ADMIN_USERS needs at least two reviewers')
  return reasons
}
