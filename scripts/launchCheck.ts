import { SOURCE_HOSTS } from '../src/copy/clinical.ts'

/** What the launch check reads: the deploy's settings, every care point that ships, and the clinical register. */
export interface LaunchData {
  carePoints: { id: string; verified: unknown; source?: unknown; fetched?: unknown; pep?: unknown; phoneSource?: unknown; phoneConfirmed?: unknown; open?: unknown; openSource?: unknown }[]
  clinical: { id: string; source?: { url?: unknown } }[]
}
const DAY = /^\d{4}-\d{2}-\d{2}$/
const METHODS: unknown[] = ['phone', 'visit', 'partner']

/**
 * Why one care point may not ship (redesign spec 5.8). Every point names its https source and the
 * day it was copied; a point not yet confirmed may ship like that, as "call first". A confirmed
 * one says when, by whom and how, and a place that gives PEP is confirmed by phone.
 */
function carePointReasons(p: LaunchData['carePoints'][number]): string[] {
  const reasons: string[] = []
  if (typeof p.source !== 'string' || !p.source.startsWith('https://')) reasons.push(`care point ${p.id} needs an https source`)
  if (typeof p.fetched !== 'string' || !DAY.test(p.fetched)) reasons.push(`care point ${p.id} needs the day its data was copied (fetched, YYYY-MM-DD)`)
  if (p.phoneSource !== undefined && (typeof p.phoneSource !== 'string' || !p.phoneSource.startsWith('https://'))) reasons.push(`care point ${p.id} has a phone number whose page is not an https link (phoneSource)`)
  if (p.phoneConfirmed !== undefined) {
    const c = (typeof p.phoneConfirmed === 'object' && p.phoneConfirmed !== null ? p.phoneConfirmed : {}) as { date?: unknown; by?: unknown }
    if (!(typeof c.date === 'string' && DAY.test(c.date) && typeof c.by === 'string' && c.by.trim() !== '')) reasons.push(`care point ${p.id} has a phone number confirmed without saying when and by whom (phoneConfirmed)`)
  }
  if (p.open !== undefined && (typeof p.openSource !== 'string' || !p.openSource.startsWith('https://'))) reasons.push(`care point ${p.id} has hours without an https page they come from (openSource)`)
  if (p.open !== undefined && !spansOk(p.open)) reasons.push(`care point ${p.id} has hours that are not spans of days 0–6 with HH:MM times (open)`)
  if (p.verified === null || p.verified === undefined) return reasons
  const v = (typeof p.verified === 'object' ? p.verified : {}) as { date?: unknown; by?: unknown; method?: unknown }
  const whole = typeof v.date === 'string' && DAY.test(v.date) && typeof v.by === 'string' && v.by.trim() !== '' && METHODS.includes(v.method)
  if (!whole) reasons.push(`care point ${p.id} is marked verified without saying when, by whom and how`)
  else if (p.pep === true && v.method !== 'phone') reasons.push(`care point ${p.id} gives PEP, so it must be verified by phone`)
  return reasons
}
/** A clinical text is general guidance backed by a public page on an allowed publisher (2026-11-18 design, decision 2). */
function trustedSource(url: unknown): boolean {
  if (typeof url !== 'string') return false
  try {
    const { protocol, hostname } = new URL(url)
    return protocol === 'https:' && SOURCE_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`))
  } catch {
    return false
  }
}
const HHMM = /^([01]\d|2[0-4]):[0-5]\d$/
/** Opening hours as the app reads them: each span names days 0–6 and HH:MM times. */
function spansOk(open: unknown): boolean {
  return (
    Array.isArray(open) &&
    open.length > 0 &&
    open.every((s: { days?: unknown; from?: unknown; to?: unknown }) => Array.isArray(s?.days) && s.days.length > 0 && s.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) && typeof s.from === 'string' && HHMM.test(s.from) && typeof s.to === 'string' && HHMM.test(s.to))
  )
}
const REQUIRED = ['VITE_CONTROLLER_NAME', 'VITE_CONTACT_EMAIL', 'ENVELOPE_PRIVATE_JWK', 'SESSION_SECRET', 'DATABASE_URL', 'CRON_SECRET'] as const
/** Needed by a real deploy only: a preview may try everything else without the push key (round 4 plan, decision 2). */
const PRODUCTION_ONLY = ['VAPID_PRIVATE_JWK', 'VAPID_SUBJECT'] as const
/** A push service turns away a contact that is not mailto: or https:, and a key that is not P-256 signs nothing. */
const SUBJECT = /^(mailto:\S+@\S+|https:\/\/\S+)$/
function p256Key(raw: string): boolean {
  try {
    const key = JSON.parse(raw) as Record<string, unknown>
    return key.kty === 'EC' && key.crv === 'P-256' && [key.x, key.y, key.d].every((part) => typeof part === 'string' && part.length > 0)
  } catch {
    return false
  }
}

/** Every reason the app is not ready for real users (v1 spec 7.4). An empty list means ready. */
export function launchCheck(env: Record<string, string | undefined>, data: LaunchData): string[] {
  const reasons: string[] = []
  // A preview deploy may run on unconfirmed data to try the whole path; production never may.
  const preview = env.LAUNCH_CHECK_PREVIEW === '1' && env.VERCEL_ENV !== 'production'
  if (preview) data = { carePoints: [{ id: 'preview', verified: null, source: 'https://example.org', fetched: '2026-01-01' }], clinical: [] }
  if (data.carePoints.length === 0) reasons.push('no care point to show')
  for (const p of data.carePoints) reasons.push(...carePointReasons(p))
  for (const t of data.clinical) if (!trustedSource(t.source?.url)) reasons.push(`clinical text ${t.id} needs an https source from a trusted publisher`)
  for (const name of REQUIRED) if (!env[name]?.trim()) reasons.push(`${name} is not set`)
  if (!preview) {
    for (const name of PRODUCTION_ONLY) if (!env[name]?.trim()) reasons.push(`${name} is not set`)
    const subject = env.VAPID_SUBJECT?.trim()
    if (subject && !SUBJECT.test(subject)) reasons.push('VAPID_SUBJECT must be mailto:… or https://… for the push services')
    const key = env.VAPID_PRIVATE_JWK?.trim()
    if (key && !p256Key(key)) reasons.push('VAPID_PRIVATE_JWK is not a P-256 private key (make one with npm run make-vapid)')
  }
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
