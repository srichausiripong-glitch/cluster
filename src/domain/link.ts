import type { DiseaseGroup, ExposureBand, Notice } from './types'

const GROUPS: readonly DiseaseGroup[] = ['mpox', 'gono_chlam', 'syphilis', 'hiv']
const BANDS: readonly ExposureBand[] = ['h72', 'w2', 'w4', 'm3']

export function encodeNotice(n: Notice): string {
  return btoa(JSON.stringify(n)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Returns null for anything that is not a well-formed version-1 notice. Never throws. */
export function decodeNotice(fragment: string): Notice | null {
  try {
    const raw = fragment.replace(/^#/, '')
    if (!raw) return null
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/')
    const data: unknown = JSON.parse(atob(padded + '='.repeat((4 - (padded.length % 4)) % 4)))
    if (!data || typeof data !== 'object') return null
    const n = data as Record<string, unknown>
    const groupOk = n.group === null || GROUPS.includes(n.group as DiseaseGroup)
    const ok =
      n.v === 1 && groupOk && (n.tier === 1 || n.tier === 2) &&
      BANDS.includes(n.band as ExposureBand) && typeof n.week === 'string' && /^\d{4}-W\d{2}$/.test(n.week) &&
      typeof n.code === 'string' && /^[A-Z]{2}\d{3}$/.test(n.code)
    if (!ok) return null
    return { v: 1, group: n.group as Notice['group'], tier: n.tier as 1 | 2, band: n.band as ExposureBand, week: n.week as string, code: n.code as string }
  } catch {
    return null
  }
}

/** The notice sits after `#`, so it is never sent to a server. */
export function buildLink(origin: string, n: Notice): string {
  return `${origin}/r#${encodeNotice(n)}`
}
