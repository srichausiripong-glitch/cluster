import type { LifecycleStep } from './types'

/** Last week (inclusive) of each step, counted from the publication week = 1 (spec 7.3). */
export const BANDS = {
  gono_chlam: { new: 1, followup: 2, expiring: 4 },
  syphilis: { new: 2, followup: 8, expiring: 12 },
} as const

export type ZonedGroup = keyof typeof BANDS

export function stepFor(group: ZonedGroup, weekIdx: number): LifecycleStep {
  const band = BANDS[group]
  if (weekIdx <= band.new) return 'new'
  if (weekIdx <= band.followup) return 'followup'
  if (weekIdx <= band.expiring) return 'expiring'
  return 'expired'
}
