import type { DiseaseGroup, MapLayer, PendingReport } from '../domain/types'
import { DISTRICT_IDS } from '../domain/districts'
import { takingNow } from '../envelope/send'
import { isoWeek, shiftWeek } from '../domain/weeks'
import type { PhoneState, SignalCard } from './stores'
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

/** The four-week waits a waiting report holds, freed when it goes without being sent: it never left the phone. */
const freeWait = (s: PhoneState, kind: PendingReport['kind'] | undefined): PhoneState => ({
  ...s,
  testedNextWeek: kind === 'tested' ? null : s.testedNextWeek,
  symptomsNextWeek: kind === 'symptoms' ? null : (s.symptomsNextWeek ?? null),
})

/** Puts a report on the phone to go with the next envelope. One at a time: a new one replaces the old, and frees its wait. */
export function queueReport(report: PendingReport): void {
  const later = shiftWeek(currentWeek(), 4)
  phone.update((s) => {
    const freed = s.pending && s.pending.kind !== report.kind ? freeWait(s, s.pending.kind) : s
    return {
      ...freed,
      pending: report,
      testedNextWeek: report.kind === 'tested' ? later : freed.testedNextWeek,
      symptomsNextWeek: report.kind === 'symptoms' ? later : (freed.symptomsNextWeek ?? null),
    }
  })
}

/**
 * Takes back the waiting report. A waiting "tested" or "symptoms" report frees the next one at once:
 * it never left the phone. While this week's envelope is taking it, nothing changes and the answer
 * says so, so the app never calls a report cancelled that went (round 2 plan, decision 10).
 */
export function cancelPending(): 'cancelled' | 'sending' | 'none' {
  const pending = phone.get().pending
  if (!pending) return 'none'
  if (takingNow(pending.savedAt)) return 'sending'
  phone.update((s) => ({ ...freeWait(s, s.pending?.kind), pending: null }))
  return 'cancelled'
}

/** Queues a "tested" report for the district and remembers the district for the next check-in. */
export function checkIn(district: string): void {
  queueReport({ kind: 'tested', zone: district, savedAt: new Date().toISOString() })
  phone.update((s) => ({ ...s, myDistrict: district }))
}

/** Remembers the district this phone reports for, without sending anything. Only one of the 50. */
export function setMyDistrict(id: string): void {
  if (!DISTRICT_IDS.includes(id)) return
  phone.update((s) => ({ ...s, myDistrict: id }))
}

/** The map's layers, in the order of their switches (redesign spec 5.1). */
export const MAP_LAYERS: readonly MapLayer[] = ['confirmed', 'symptoms', 'sti', 'health_centre', 'hospital', 'pharmacy']

/** What the person switched, when the store holds an object at all. */
const switched = (s: PhoneState): Partial<Record<MapLayer, unknown>> => (s.layers && typeof s.layers === 'object' ? s.layers : {})

/** Which layers are on: every one but pharmacies until the person switches it. Only a stored true or false counts. */
export function layersOn(s: PhoneState): Record<MapLayer, boolean> {
  const kept = switched(s)
  return Object.fromEntries(MAP_LAYERS.map((layer) => [layer, typeof kept[layer] === 'boolean' ? kept[layer] : layer !== 'pharmacy'])) as Record<MapLayer, boolean>
}

export function toggleLayer(layer: MapLayer): void {
  phone.update((s) => ({ ...s, layers: { ...(switched(s) as Partial<Record<MapLayer, boolean>>), [layer]: !layersOn(s)[layer] } }))
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
    const next = s.pending && !DISTRICT_IDS.includes(s.pending.zone) ? { ...freeWait(s, s.pending.kind), pending: null } : { ...s }
    if (next.myDistrict !== undefined && !DISTRICT_IDS.includes(next.myDistrict)) delete next.myDistrict
    return next
  })
}

/**
 * Forgets a four-week wait once its week has come. Kept longer, "may send symptoms again from…" would
 * be a lasting sign on the phone that its owner reported symptoms (amendment 7: the phone keeps only
 * what it needs).
 */
export function clearPassedWaits(): void {
  const week = currentWeek()
  phone.update((s) => ({
    ...s,
    testedNextWeek: s.testedNextWeek !== null && s.testedNextWeek <= week ? null : s.testedNextWeek,
    symptomsNextWeek: s.symptomsNextWeek != null && s.symptomsNextWeek <= week ? null : (s.symptomsNextWeek ?? null),
  }))
}
