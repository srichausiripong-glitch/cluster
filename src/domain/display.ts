import { DISTRICT_IDS } from './districts.js'
import { BANDS, stepFor } from './lifecycle.js'
import { densityBand, K } from './publication.js'
import type { PublishedArea, ReportKind, TestingLevel } from './types.js'
import { weekIndex } from './weeks.js'

const KINDS: ReportKind[] = ['gono_chlam', 'syphilis', 'tested', 'symptoms']
const SIGNAL_KINDS = ['gono_chlam', 'syphilis'] as const
/** What counts as testing: a test with no result, and a positive result. Symptoms without a test do not. */
const TESTING_KINDS: ReportKind[] = ['gono_chlam', 'syphilis', 'tested']
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

/** One cell of the sum: what was counted and how much of it chance alone would explain. */
interface Cell {
  n: number
  expected: number
}
const estimate = (cells: Cell[]) => cells.reduce((sum, c) => sum + Math.max(0, c.n - c.expected), 0)
/** ceil(2 × √(expected random reports over the same cells)) (amendment 5). */
const margin = (cells: Cell[]) => Math.ceil(2 * Math.sqrt(cells.reduce((sum, c) => sum + c.expected, 0)))

/**
 * One area from its counts. `districts` is how many districts the counts were summed over: 1 for a
 * district, 50 for the city, whose expected random reports are those of all fifty districts.
 */
function entry(areaId: string, counts: CountRow[], input: DisplayInput, districts: number, isCity: boolean): PublishedArea {
  const count = (kind: ReportKind, week: string) => counts.filter((c) => c.kind === kind && c.week === week).reduce((sum, c) => sum + c.n, 0)
  const cell = (kind: ReportKind, week: string): Cell => ({ n: count(kind, week), expected: districts * expectedRandom(input.envelopes[week] ?? 0, input.q) })
  const weeks = [...new Set([...counts.map((c) => c.week), ...Object.keys(input.envelopes)])].filter((w) => weekIndex(w, input.nowWeek) >= 1)

  // The signal: positive reports of the two mapped groups that have not expired, by step.
  const byStep = { new: [] as Cell[], followup: [] as Cell[], expiring: [] as Cell[] }
  for (const kind of SIGNAL_KINDS) {
    for (const week of weeks) {
      const step = stepFor(kind, weekIndex(week, input.nowWeek))
      if (step !== 'expired') byStep[step].push(cell(kind, week))
    }
  }
  const signalCells = [...byStep.new, ...byStep.followup, ...byStep.expiring]
  const total = estimate(signalCells)
  const need = K + margin(signalCells)

  // Testing: "tested" plus positive reports over the last twelve weeks.
  const recent = weeks.filter((w) => weekIndex(w, input.nowWeek) <= TESTING_WEEKS)
  const testingCells = TESTING_KINDS.flatMap((kind) => recent.map((week) => cell(kind, week)))
  const tested = estimate(testingCells)
  const testing: TestingLevel | null = tested < K + margin(testingCells) ? null : tested < 50 ? 'low' : tested < 200 ? 'medium' : 'high'

  // Symptoms: their own estimate over the weeks they live, never added to the confirmed signal.
  const symptomCells = weeks.filter((w) => stepFor('symptoms', weekIndex(w, input.nowWeek)) !== 'expired').map((week) => cell('symptoms', week))
  const felt = estimate(symptomCells)
  const symptoms = felt < K + margin(symptomCells) ? null : densityBand(felt)

  // A district below the threshold says only that: whether it had none or a few would show that
  // someone there reported (redesign spec 5.5). The city, summed from all fifty, may say which.
  if (total < need) return { areaId, state: isCity && total === 0 ? 'no_data' : 'below_threshold', density: null, step: null, testing, symptoms }
  const steps = (Object.entries(byStep) as [keyof typeof byStep, Cell[]][]).map(([step, cells]) => [step, estimate(cells)] as const).sort((a, b) => b[1] - a[1])
  const clearLeader = steps[0][1] >= K && steps[0][1] > steps[1][1]
  return { areaId, state: 'shown', density: densityBand(total), step: clearLeader ? steps[0][0] : 'mixed', testing, symptoms }
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
