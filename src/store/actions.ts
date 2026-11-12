import type { DiseaseGroup, PendingReport } from '../domain/types'
import { isoWeek, shiftWeek } from '../domain/weeks'
import type { SignalCard } from './stores'
import { phone } from './stores'

/** Groups whose reports may go to an area's signal. HIV never; mpox only from official figures (spec 3.2, 7.1). */
export const MAPPED_GROUPS: readonly DiseaseGroup[] = ['gono_chlam', 'syphilis']

export function currentWeek(): string {
  return isoWeek(new Date())
}

export function saveCard(card: SignalCard): void {
  phone.update((s) => ({ ...s, card }))
}

export function addReminder(date: string): void {
  phone.update((s) => ({ ...s, reminders: [...s.reminders, { date }] }))
}

/** Everything this app keeps on the phone outside the phone store: the sealed envelope waiting to go. */
const ENVELOPE_KEYS = ['cluster.envelope-outbox']

export function wipePhone(): void {
  phone.reset()
  try {
    for (const key of ENVELOPE_KEYS) localStorage.removeItem(key)
  } catch {
    // storage unavailable: nothing was kept there either
  }
}

/** Puts a report on the phone to go with the next envelope. One at a time: a new one replaces the old. */
export function queueReport(report: PendingReport): void {
  phone.update((s) => ({ ...s, pending: report, testedNextWeek: report.kind === 'tested' ? shiftWeek(currentWeek(), 4) : s.testedNextWeek }))
}

export function cancelPending(): void {
  phone.update((s) => ({ ...s, pending: null }))
}
