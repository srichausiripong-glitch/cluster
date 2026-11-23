import { Check, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { th } from '../copy/th'
import { CARE_POINTS, canTest } from '../data/carePoints'
import { OFFICIAL } from '../data/official'
import { Emoji } from '../design/Emoji'
import type { EmojiName } from '../design/emojiCodes'
import { QUIET_LINK } from '../design/look'
import { FollowButton } from './FollowButton'
import { Chip } from '../design/primitives/Chip'
import { Sheet } from '../design/primitives/Sheet'
import { districtLabel } from '../domain/districts'
import type { DensityBand, PublishedArea, TestingLevel } from '../domain/types'
import { DotMark, EdgeSample, PinMark, QuietSwatch, ShadeSwatch } from '../map/legend'
import { toneOf, type ToneKind } from '../map/tone'
import { Go } from './Go'
import { levelOf } from './level'
import { LevelDots } from './LevelDots'
import { More } from './More'

const DENSITIES = ['thin', 'medium', 'dense'] as const
const STEPS = ['new', 'followup', 'expiring', 'mixed'] as const
const QUIET_STATES = ['below_threshold', 'no_data', 'suspended'] as const
const TONES: ToneKind[] = ['confirmed', 'symptoms', 'tested']

/** The value that applies now is marked with a tick and the word "ตอนนี้", never by weight or colour alone. */
function Value({ label, current }: { label: string; current: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-x-1.5">
      <span aria-current={current ? 'true' : undefined} className={current ? 'font-bold text-ink' : 'text-muted'}>
        {label}
      </span>
      {current && (
        <Chip tone="now" small>
          <Check size={12} strokeWidth={3} aria-hidden="true" />
          {th.map.current}
        </Chip>
      )}
    </span>
  )
}

/** A level as dots, named in words. Never a count (redesign spec 5.7). */
function Dots({ band }: { band: DensityBand | TestingLevel }) {
  const level = levelOf(band)
  return <LevelDots level={level} label={th.map.sheet.level[level - 1]} />
}

/** Why a row has no level: one state below the threshold whatever lies under it (redesign spec 5.5), or no file yet. */
function Without({ area }: { area: PublishedArea }) {
  return <span className="text-[14px] text-muted">{area.state === 'no_data' ? th.map.state.no_data : th.map.state.below_threshold}</span>
}

type Props = { area: PublishedArea; open: boolean; onClose: () => void }

/**
 * A district, or the city, in three rows: confirmed results, symptoms and testing, each as dots or
 * "ยังไม่ถึงเกณฑ์" (redesign spec 5.7). The marks, the age of a signal and what a signal is not wait
 * behind ⓘ. A way to care always closes the sheet (v1 spec 7.3).
 */
export function SignalSheet({ area, open, onClose }: Props) {
  const isCity = area.areaId === 'bkk'
  const shown = area.state === 'shown'
  /** The district's one colour, as the map draws it with both layers on (2026-11-23 design). */
  const tone = toneOf(area, { confirmed: true, symptoms: true })
  // A pharmacy is not a place to test (redesign spec 5.1), so it does not count here.
  const hasPlace = !isCity && CARE_POINTS.some((p) => p.districtId === area.areaId && canTest(p))
  const rows: { emoji: EmojiName; label: string; value: ReactNode }[] = [
    { emoji: 'confirmed', label: th.map.sheet.confirmed, value: shown && area.density ? <Dots band={area.density} /> : <span className="text-[14px] text-muted">{th.map.state[area.state]}</span> },
    { emoji: 'feverish', label: th.map.sheet.symptoms, value: area.symptoms ? <Dots band={area.symptoms} /> : <Without area={area} /> },
    { emoji: 'check', label: th.map.sheet.testing, value: area.testing ? <Dots band={area.testing} /> : <Without area={area} /> },
  ]

  return (
    // Tall, so a short screen still shows the way to care and 🔔 above the fold (round 4 plan, Task 7).
    <Sheet open={open} onClose={onClose} title={isCity ? th.map.city : districtLabel(area.areaId)} tall>
      {area.state === 'suspended' ? (
        <More
          summary={
            <span className="inline-flex items-center gap-1.5 text-[15px]">
              <Emoji name="pause" />
              {th.map.sheet.suspended}
            </span>
          }
        >
          <p>{th.map.stateHint.suspended}</p>
        </More>
      ) : (
        <dl className="divide-y divide-line rounded-md border-2 border-ink">
          {rows.map(({ emoji, label, value }) => (
            <div key={label} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2">
              <dt className="flex items-center gap-2 font-bold">
                <Emoji name={emoji} />
                {label}
              </dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-2">
        <More summary={th.map.sheet.from}>
          <p className="font-semibold">{th.map.legendNotSafe}</p>
          <p>{th.map.legendWhat}</p>
          <p>{th.map.testingNotSafe}</p>
          <p className="text-muted">
            {th.map.weekly} · {th.map.source}
          </p>
          <h3 className="pt-2 font-bold">{th.map.key}</h3>
          <p className="font-semibold">{th.map.sheet.shade}</p>
          <ul className="space-y-1.5">
            {TONES.map((t) => (
              <li key={t} data-tone-key={t} className="flex items-center gap-2">
                <ShadeSwatch tone={t} band="medium" />
                <span>{th.map.sheet.tones[t]}</span>
              </li>
            ))}
          </ul>
          <p className="pt-1 font-semibold">{th.map.sheet.depth}</p>
          <ul data-key="levels" className="space-y-1.5">
            {DENSITIES.map((d, i) => (
              <li key={d} className="flex items-center gap-2">
                <ShadeSwatch tone={tone?.kind ?? 'confirmed'} band={d} />
                <Value label={th.map.sheet.level[i]} current={tone?.band === d} />
              </li>
            ))}
          </ul>
          <p className="pt-1 font-semibold">{th.map.stepLabel}</p>
          <ul className="space-y-1.5">
            {STEPS.map((s) => (
              <li key={s} className="flex items-center gap-2">
                <EdgeSample step={s} />
                <Value label={th.map.step[s]} current={shown && area.step === s} />
              </li>
            ))}
          </ul>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2">
            {/* Keyed as drawn: a district below the threshold has no mark (redesign spec 5.7), so no hatch is taught. */}
            {QUIET_STATES.map((state) => (
              <li key={state} className="flex items-center gap-2">
                <QuietSwatch state={state === 'below_threshold' ? 'no_data' : state} />
                <span>{th.map.state[state]}</span>
              </li>
            ))}
            {/* The two levels of trust of a care point (redesign spec 5.8): a confirmed place's pin, any other's dot. */}
            <li className="flex items-center gap-2">
              <span className="grid w-[34px] shrink-0 place-items-center">
                <PinMark layer="sti" size={22} />
              </span>
              <span>{th.map.keyPins.verified}</span>
            </li>
            <li className="col-span-2 flex items-center gap-2">
              <span className="grid w-[34px] shrink-0 place-items-center">
                <DotMark layer="sti" size={22} />
              </span>
              <span>{th.map.keyPins.unverified}</span>
            </li>
          </ul>
        </More>
      </div>

      {/* A district without a place to test still leads to its own list, which then begins with its neighbours' places (spec 5.7). */}
      <Go to={isCity ? '/app/list?find=test' : `/app/list?district=${area.areaId}&find=test`} onClick={onClose} className={`mt-3 ${QUIET_LINK}`}>
        <Emoji name={hasPlace ? 'testTube' : 'pin'} />
        {hasPlace ? th.map.sheet.careHere : th.map.sheet.findCare}
        <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
      </Go>
      {/* What the phone saw of the district when it began to follow it: the state and the three rows, as published. */}
      {!isCity && <FollowButton district={area.areaId} seen={{ state: area.state, density: area.density, symptoms: area.symptoms, testing: area.testing }} />}

      {OFFICIAL.length > 0 && (
        <>
          <h3 className="mb-1 mt-4 text-[13px] font-medium text-muted">{th.map.official}</h3>
          <dl className="space-y-1 text-[15px]">
            {OFFICIAL.map((f) => (
              <div key={f.label}>
                <dt>
                  {f.label} <span className="text-[13px] text-muted">({f.period})</span>
                </dt>
                <dd className="text-muted">
                  {f.value} ·{' '}
                  <a href={f.source} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                    {th.map.officialSource}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </Sheet>
  )
}
