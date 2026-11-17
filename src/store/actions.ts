import type { DiseaseGroup, PendingReport } from '../domain/types'
import { DISTRICT_IDS } from '../domain/districts'
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
  const later = shiftWeek(currentWeek(), 4)
  phone.update((s) => ({
    ...s,
    pending: report,
    testedNextWeek: report.kind === 'tested' ? later : s.testedNextWeek,
    symptomsNextWeek: report.kind === 'symptoms' ? later : (s.symptomsNextWeek ?? null),
  }))
}

/** Takes back the waiting report. A waiting "tested" or "symptoms" report frees the next one at once: it never left the phone. */
export function cancelPending(): void {
  phone.update((s) => ({
    ...s,
    pending: null,
    testedNextWeek: s.pending?.kind === 'tested' ? null : s.testedNextWeek,
    symptomsNextWeek: s.pending?.kind === 'symptoms' ? null : (s.symptomsNextWeek ?? null),
  }))
}

/** Queues a "tested" report for the district and remembers the district for the next check-in. */
export function checkIn(district: string): void {
  queueReport({ kind: 'tested', zone: district, savedAt: new Date().toISOString() })
  phone.update((s) => ({ ...s, myDistrict: district }))
}

export function forgetMyDistrict(): void {
  phone.update((s) => {
    const next = { ...s }
    delete next.myDistrict
    return next
  })
}

/**
 * Drops what the phone kept under an area that is not one of the 50 districts: a report waiting since
 * the six zones would be refused by the server week after week, so it is never sent (redesign spec 5.5).
 */
export function dropStaleAreas(): void {
  phone.update((s) => {
    const next = { ...s }
    if (next.pending && !DISTRICT_IDS.includes(next.pending.zone)) next.pending = null
    if (next.myDistrict !== undefined && !DISTRICT_IDS.includes(next.myDistrict)) delete next.myDistrict
    return next
  })
}
