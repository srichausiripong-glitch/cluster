import { stepFor } from './lifecycle'
import type { DensityBand, PublishedArea, SignalReport } from './types'
import { weekIndex } from './weeks'

/** Minimum number of reports behind every displayed attribute (spec 7.2). */
export const K = 10

export function densityBand(n: number): DensityBand | null {
  if (n < K) return null
  if (n < 20) return 'thin'
  if (n < 50) return 'medium'
  return 'dense'
}

/**
 * One area's entry in the weekly file. Gonorrhoea/chlamydia and syphilis are pooled;
 * HIV never reaches an area and mpox comes from official figures only (spec 3.2, 7.1).
 */
export function publishArea(areaId: string, reports: SignalReport[], nowWeek: string, hasPartner: boolean): PublishedArea {
  const hidden = (state: PublishedArea['state']): PublishedArea => ({ areaId, state, density: null, step: null })
  if (!hasPartner) return hidden('no_partner')

  const counts = { new: 0, followup: 0, expiring: 0 }
  for (const report of reports) {
    if (report.group !== 'gono_chlam' && report.group !== 'syphilis') continue
    const step = stepFor(report.group, weekIndex(report.week, nowWeek))
    if (step !== 'expired') counts[step] += 1
  }
  const total = counts.new + counts.followup + counts.expiring
  if (total === 0) return hidden('no_data')
  if (total < K) return hidden('below_threshold')

  const ranked = (Object.entries(counts) as [keyof typeof counts, number][]).sort((a, b) => b[1] - a[1])
  const [topStep, topCount] = ranked[0]
  const clearLeader = topCount >= K && topCount > ranked[1][1]
  return { areaId, state: 'shown', density: densityBand(total), step: clearLeader ? topStep : 'mixed' }
}
