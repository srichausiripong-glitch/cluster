import { th } from '../copy/th'
import type { PublishedArea } from '../domain/types'
import { Chip } from '../design/primitives/Chip'
import { Sheet } from '../design/primitives/Sheet'
import { areaPaint, MapPatterns } from '../map/SchematicMap'
import { OFFICIAL_FIGURES } from '../store/seed'

const DENSITIES = ['thin', 'medium', 'dense'] as const
const STEPS = ['new', 'followup', 'expiring', 'mixed'] as const

function Swatch({ area }: { area: PublishedArea }) {
  return (
    <svg width="34" height="24" viewBox="0 0 34 24" aria-hidden="true" className="shrink-0">
      <MapPatterns />
      <rect x="3" y="3" width="28" height="18" rx="6" {...areaPaint(area)} strokeWidth={2.2} />
    </svg>
  )
}

/** The signal for one area: level and age as words and patterns, never a count (spec 7.2). */
export function SignalSheet({ area, title, open, onClose }: { area: PublishedArea; title: string; open: boolean; onClose: () => void }) {
  const shown = area.state === 'shown'
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="flex items-center gap-3">
        <Swatch area={area} />
        <div>
          <p className="font-semibold">{th.map.state[area.state]}</p>
          <p className="text-[13px] text-muted">{th.map.stateHint[area.state]}</p>
        </div>
      </div>

      {shown && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <h3 className="mb-1 text-[13px] font-medium text-muted">{th.map.densityLabel}</h3>
            <ul className="space-y-1">
              {DENSITIES.map((d) => (
                <li key={d} className="flex items-center gap-2">
                  <Swatch area={{ areaId: 'legend', state: 'shown', density: d, step: 'new' }} />
                  <span aria-current={area.density === d ? 'true' : undefined} className={area.density === d ? 'font-semibold text-ink' : 'text-muted'}>
                    {th.map.density[d]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-1 text-[13px] font-medium text-muted">{th.map.stepLabel}</h3>
            <ul className="space-y-1">
              {STEPS.map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <Swatch area={{ areaId: 'legend', state: 'shown', density: 'thin', step: s }} />
                  <span aria-current={area.step === s ? 'true' : undefined} className={area.step === s ? 'font-semibold text-ink' : 'text-muted'}>
                    {th.map.step[s]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-md bg-bg p-3 text-[13px]">
        <p className="font-semibold">{th.map.legendNotSafe}</p>
        <p className="text-muted">{th.map.legendWhat}</p>
        <p className="text-muted">{th.map.weekly}</p>
      </div>

      <h3 className="mb-1 mt-4 flex items-center gap-2 text-[13px] font-medium text-muted">
        {th.map.official} <Chip>{th.common.sample}</Chip>
      </h3>
      <dl className="space-y-1 text-[15px]">
        {OFFICIAL_FIGURES.map((f) => (
          <div key={f.label} className="flex flex-wrap justify-between gap-x-3">
            <dt>
              {f.label} <span className="text-[13px] text-muted">({f.period})</span>
            </dt>
            <dd className="text-muted">{f.value}</dd>
          </div>
        ))}
      </dl>
    </Sheet>
  )
}
