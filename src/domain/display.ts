import { DISTRICT_IDS } from './districts.js'
import { BANDS, stepFor } from './lifecycle.js'
import { bandOf, reaches, SIGNAL_MIN, TESTED_MIN } from './publication.js'
import type { PublishedArea, ReportKind, TestingLevel } from './types.js'
import { weekIndex } from './weeks.js'

const KINDS: ReportKind[] = ['gono_chlam', 'syphilis', 'tested', 'symptoms']
const SIGNAL_KINDS = ['gono_chlam', 'syphilis'] as const
/** Green counts tests that found nothing, alone: a positive is never green (2026-11-23 design). */
const TESTING_KINDS: ReportKind[] = ['tested']
/** Testing is counted over the last twelve weeks (amendment 4.4). */
const TESTING_WEEKS = 12

export interface CountRow {
  zone: string
  kind: ReportKind
  week: string
  n: number
}
export interface DisplayInput {
  counts: CountRow[]
  /** Envelopes received per week. */
  envelopes: Record<string, number>
  /** The week being published: the one that just ended. */
  nowWeek: string
  q: number
  suspended: string[]
}

/** Random reports expected in one (district, kind, week) cell: q × envelopes ÷ (districts × kinds) (amendment 5). */
export function expectedRandom(envelopes: number, q: number): number {
  return (q * envelopes) / (DISTRICT_IDS.length * KINDS.length)
}

/** One cell of the sum: what was counted and how many random reports it is expected to hold. */
interface Cell {
  n: number
  expected: number
}
const count = (cells: Cell[]) => cells.reduce((sum, c) => sum + c.n, 0)
const lambda = (cells: Cell[]) => cells.reduce((sum, c) => sum + c.expected, 0)
/** A row's band when its raw count reaches the bar for its minimum (2026-11-23 design), or null. */
const row = (cells: Cell[], min: number) => (reaches(count(cells), min, lambda(cells)) ? bandOf(count(cells)) : null)
const TESTING_BAND = { thin: 'low', medium: 'medium', dense: 'high' } as const

/**
 * One area from its counts. `districts` is how many districts the counts were summed over: 1 for a
 * district, 50 for the city, whose expected random reports are those of all fifty districts.
 * Red from three positives, orange from three symptoms, green from one tested (2026-11-23 design),
 * each banded by its own raw count.
 */
function entry(areaId: string, counts: CountRow[], input: DisplayInput, districts: number, isCity: boolean): PublishedArea {
  const kindCount = (kind: ReportKind, week: string) => counts.filter((c) => c.kind === kind && c.week === week).reduce((sum, c) => sum + c.n, 0)
  const cell = (kind: ReportKind, week: string): Cell => ({ n: kindCount(kind, week), expected: districts * expectedRandom(input.envelopes[week] ?? 0, input.q) })
  const weeks = [...new Set([...counts.map((c) => c.week), ...Object.keys(input.envelopes)])].filter((w) => weekIndex(w, input.nowWeek) >= 1)

  // Red: positive reports of the two mapped groups that have not expired, by step.
  const byStep = { new: [] as Cell[], followup: [] as Cell[], expiring: [] as Cell[] }
  for (const kind of SIGNAL_KINDS) {
    for (const week of weeks) {
      const step = stepFor(kind, weekIndex(week, input.nowWeek))
      if (step !== 'expired') byStep[step].push(cell(kind, week))
    }
  }
  const density = row([...byStep.new, ...byStep.followup, ...byStep.expiring], SIGNAL_MIN)

  // Green: tests that found nothing over the last twelve weeks.
  const recent = weeks.filter((w) => weekIndex(w, input.nowWeek) <= TESTING_WEEKS)
  const tested = row(TESTING_KINDS.flatMap((kind) => recent.map((week) => cell(kind, week))), TESTED_MIN)
  const testing: TestingLevel | null = tested && TESTING_BAND[tested]

  // Orange: symptoms over the weeks they live, never added to red.
  const symptoms = row(weeks.filter((w) => stepFor('symptoms', weekIndex(w, input.nowWeek)) !== 'expired').map((week) => cell('symptoms', week)), SIGNAL_MIN)

  // A district with nothing to show says only that: whether it had none or a few would show that
  // someone there reported (redesign spec 5.5). The city, summed from all fifty, may say which.
  if (!density && !testing && !symptoms) {
    const any = counts.some((c) => c.n > 0 && weeks.includes(c.week))
    return { areaId, state: isCity && !any ? 'no_data' : 'below_threshold', density: null, step: null, testing: null, symptoms: null }
  }
  let step: PublishedArea['step'] = null
  if (density) {
    const steps = (Object.entries(byStep) as [keyof typeof byStep, Cell[]][]).map(([s, cells]) => [s, count(cells)] as const).sort((a, b) => b[1] - a[1])
    step = steps[0][1] >= SIGNAL_MIN && steps[0][1] > steps[1][1] ? steps[0][0] : 'mixed'
  }
  return { areaId, state: 'shown', density, step, testing, symptoms }
}

/**
 * The fifty districts, in list order, and the city as the weekly file shows them. Rows for anything
 * that is not a district (zones from before the change) are left out, of the city too. Held cells
 * must be left out by the caller.
 */
export function displayFile(input: DisplayInput): PublishedArea[] {
  const known = input.counts.filter((c) => DISTRICT_IDS.includes(c.zone))
  const districts = DISTRICT_IDS.map((id): PublishedArea => {
    if (input.suspended.includes(id)) return { areaId: id, state: 'suspended', density: null, step: null, testing: null, symptoms: null }
    return entry(id, known.filter((c) => c.zone === id), input, 1, false)
  })
  return [...districts, entry('bkk', known, input, DISTRICT_IDS.length, true)]
}

// Kept in one place with the lifecycle so a reader sees how long each kind counts.
export const SIGNAL_WEEKS = { gono_chlam: BANDS.gono_chlam.expiring, syphilis: BANDS.syphilis.expiring } as const
