import { syncNextTest, unfollow } from '../push/follow'
import type { DiseaseGroup, MapLayer, PendingReport, PublishedFile, TestingLevel } from '../domain/types'
import { DISTRICT_IDS } from '../domain/districts'
import { takingNow } from '../envelope/send'
import { isoWeek, shiftWeek, weekIndex } from '../domain/weeks'
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

/** Sets or clears the day to be reminded to test again. A followed district's service worker learns it too. */
export function setNextTest(date: string | null): void {
  phone.update((s) => ({ ...s, nextTest: date }))
  void syncNextTest(date)
}

/**
 * The one-time "sent" note (2026-11-18 design, decision 2): shown for the weekly file of the week the
 * report went, or the one after, never for a suspended district. It claims only that the report
 * arrived: the server may drop a report silently on purpose, so the phone cannot know it was counted.
 */
export function countedNote(s: PhoneState, file: PublishedFile | null): { zone: string; testing: TestingLevel | null } | null {
  if (!s.counted || !file?.week) return null
  const age = weekIndex(s.counted.week, file.week)
  if (age < 1 || age > 2) return null
  const area = file.areas.find((a) => a.areaId === s.counted?.zone)
  if (area?.state === 'suspended') return null
  return { zone: s.counted.zone, testing: area?.testing ?? null }
}

export function dismissCounted(): void {
  phone.update((s) => ({ ...s, counted: null }))
}

/** "ไม่ต้อง": no reminder is offered again during this four-week wait. */
export function declineNextTest(): void {
  phone.update((s) => ({ ...s, nextTestDeclined: s.testedNextWeek }))
}

/**
 * What the status card's bottom line says about the next test (decision 3): a date reached, an offer
 * after a check-in, a date kept, or nothing. `today` is YYYY-MM-DD in Bangkok.
 */
export function nextTestState(s: PhoneState, today: string, week: string = currentWeek()): 'due' | 'offer' | 'set' | 'none' {
  if (s.nextTest && s.nextTest <= today) return 'due'
  if (s.nextTest) return 'set'
  const waiting = s.testedNextWeek !== null && s.testedNextWeek > week
  return waiting && s.nextTestDeclined !== s.testedNextWeek ? 'offer' : 'none'
}

/** Everything this app keeps on the phone outside the phone store: the sealed envelope waiting to go, the one made ready for leaving, and the week's send claim. */
const ENVELOPE_KEYS = ['cluster.envelope-outbox', 'cluster.envelope-ready', 'cluster.envelope-claim']

export function wipePhone(): void {
  // Any wipe stops the weekly notification too, the error screen's included (redesign spec 5.11).
  void unfollow()
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
    // A replaced report frees its wait, unless this week's envelope has sealed it: then it may have gone.
    const freed = s.pending && s.pending.kind !== report.kind && !takingNow(s.pending.savedAt) ? freeWait(s, s.pending.kind) : s
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
  // A new test answers any reminder kept: the card offers to set the next one (2026-11-18 design, decision 1).
  const had = phone.get().nextTest ?? null
  phone.update((s) => ({ ...s, myDistrict: district, nextTest: null, nextTestDeclined: null, counted: null }))
  if (had) void syncNextTest(null)
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
    const next = { ...s, counted: null }
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
  phone.update((s) => {
    const passed = s.testedNextWeek !== null && s.testedNextWeek <= week
    return {
      ...s,
      testedNextWeek: passed ? null : s.testedNextWeek,
      symptomsNextWeek: s.symptomsNextWeek != null && s.symptomsNextWeek <= week ? null : (s.symptomsNextWeek ?? null),
      // A "ไม่ต้อง" belongs to its wait, and the sent note to its two weeks: neither stays as a sign of a past report.
      nextTestDeclined: passed ? null : (s.nextTestDeclined ?? null),
      counted: s.counted && weekIndex(s.counted.week, week) > 2 ? null : (s.counted ?? null),
    }
  })
}
