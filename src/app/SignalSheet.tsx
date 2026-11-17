import { Check, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { th } from '../copy/th'
import { CARE_POINTS } from '../data/carePoints'
import { OFFICIAL } from '../data/official'
import { Emoji } from '../design/Emoji'
import type { EmojiName } from '../design/emojiCodes'
import { QUIET_LINK } from '../design/look'
import { Chip } from '../design/primitives/Chip'
import { Sheet } from '../design/primitives/Sheet'
import { districtLabel } from '../domain/districts'
import type { DensityBand, PublishedArea, TestingLevel } from '../domain/types'
import { DotMark, DotSwatch, EdgeSample, HatchSwatch, PinMark, QuietSwatch } from '../map/legend'
import { Go } from './Go'
import { levelOf } from './level'
import { LevelDots } from './LevelDots'
import { More } from './More'

const DENSITIES = ['thin', 'medium', 'dense'] as const
const STEPS = ['new', 'followup', 'expiring', 'mixed'] as const
const QUIET_STATES = ['below_threshold', 'no_data', 'suspended'] as const

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
  const hasPlace = !isCity && CARE_POINTS.some((p) => p.districtId === area.areaId)
  const rows: { emoji: EmojiName; label: string; value: ReactNode }[] = [
    { emoji: 'confirmed', label: th.map.sheet.confirmed, value: shown && area.density ? <Dots band={area.density} /> : <span className="text-[14px] text-muted">{th.map.state[area.state]}</span> },
    { emoji: 'feverish', label: th.map.sheet.symptoms, value: area.symptoms ? <Dots band={area.symptoms} /> : <Without area={area} /> },
    { emoji: 'check', label: th.map.sheet.testing, value: area.testing ? <Dots band={area.testing} /> : <Without area={area} /> },
  ]

  return (
    <Sheet open={open} onClose={onClose} title={isCity ? th.map.city : districtLabel(area.areaId)}>
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
          <p className="font-semibold">{th.map.sheet.dots}</p>
          <ul className="space-y-1.5">
            {DENSITIES.map((d, i) => (
              <li key={d} className="flex items-center gap-2">
                <DotSwatch density={d} />
                <Value label={th.map.sheet.level[i]} current={shown && area.density === d} />
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
          <p className="pt-1 font-semibold">{th.map.sheet.hatch}</p>
          <ul className="space-y-1.5">
            {DENSITIES.map((d, i) => (
              <li key={d} className="flex items-center gap-2">
                <HatchSwatch level={d} />
                <Value label={th.map.sheet.level[i]} current={area.symptoms === d} />
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

      <Go to={hasPlace ? `/app/list?district=${area.areaId}` : '/app/list?find=test'} onClick={onClose} className={`mt-3 ${QUIET_LINK}`}>
        <Emoji name={hasPlace ? 'testTube' : 'pin'} />
        {hasPlace ? th.map.sheet.careHere : th.map.sheet.findCare}
        <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
      </Go>

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
