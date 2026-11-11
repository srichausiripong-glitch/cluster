import { Check } from 'lucide-react'
import { th } from '../copy/th'
import type { PublishedArea } from '../domain/types'
import { Chip } from '../design/primitives/Chip'
import { Sheet } from '../design/primitives/Sheet'
import { DotSwatch, EdgeSample, PinMark, QuietSwatch } from '../map/legend'
import { OFFICIAL_FIGURES, type CarePoint } from '../store/seed'
import { CarePointRow } from './CarePointRow'

const DENSITIES = ['thin', 'medium', 'dense'] as const
const STEPS = ['new', 'followup', 'expiring', 'mixed'] as const
const QUIET_STATES = ['below_threshold', 'no_data', 'no_partner'] as const
const PIN_KINDS = ['clinic', 'pharmacy', 'lab'] as const

/** The area's own patch: the map's dots and edge when it has a signal, the map's quiet mark when it has none. */
function Swatch({ area }: { area: PublishedArea }) {
  if (area.state === 'shown') return <DotSwatch density={area.density ?? 'thin'} edge={area.step ?? 'mixed'} large />
  return <QuietSwatch state={area.state} large />
}

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

type Props = { area: PublishedArea; title: string; open: boolean; onClose: () => void; pair: CarePoint; onOpenCarePoint: (id: string) => void }

/** The signal for one area: level and age as words and marks, never a count (spec 7.2), always with a care point (spec 7.3). */
export function SignalSheet({ area, title, open, onClose, pair, onOpenCarePoint }: Props) {
  const shown = area.state === 'shown'
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="flex items-center gap-3">
        <Swatch area={area} />
        <div>
          <h3 className="font-bold">{th.map.state[area.state]}</h3>
          <p className="text-[13px] text-muted">{th.map.stateHint[area.state]}</p>
        </div>
      </div>

      {shown && (
        <div className="mt-4 grid grid-cols-1 gap-4 min-[360px]:grid-cols-[2fr_3fr]">
          <div>
            <h3 className="mb-1 text-[13px] font-medium text-muted">{th.map.densityLabel}</h3>
            <ul className="space-y-1.5">
              {DENSITIES.map((d) => (
                <li key={d} className="flex items-center gap-2">
                  <DotSwatch density={d} />
                  <Value label={th.map.density[d]} current={area.density === d} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-1 text-[13px] font-medium text-muted">{th.map.stepLabel}</h3>
            <ul className="space-y-1.5">
              {STEPS.map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <EdgeSample step={s} />
                  <Value label={th.map.step[s]} current={area.step === s} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-md border-2 border-ink bg-bg p-3 text-[13px]">
        <p className="font-semibold">{th.map.legendNotSafe}</p>
        <p className="text-muted">{th.map.legendWhat}</p>
        <p className="text-muted">
          {th.map.weekly} · {th.map.source}
        </p>
      </div>

      <h3 className="mb-2 mt-4 text-[13px] font-medium text-muted">{th.map.pair}</h3>
      <CarePointRow point={pair} onOpen={() => onOpenCarePoint(pair.id)} />

      <h3 className="mb-2 mt-4 text-[13px] font-medium text-muted">{th.map.key}</h3>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
        {QUIET_STATES.map((state) => (
          <li key={state} className="flex items-center gap-2">
            <QuietSwatch state={state} />
            <span>{th.map.state[state]}</span>
          </li>
        ))}
        {PIN_KINDS.map((kind) => (
          <li key={kind} className="flex items-center gap-2">
            <span className="grid w-[34px] shrink-0 place-items-center">
              <PinMark kind={kind} size={22} />
            </span>
            <span>{th.map.keyPins[kind]}</span>
          </li>
        ))}
      </ul>

      <h3 className="mb-1 mt-4 flex items-center gap-2 text-[13px] font-medium text-muted">
        {th.map.official} <Chip>{th.common.sample}</Chip>
      </h3>
      <dl className="space-y-1 text-[15px]">
        {OFFICIAL_FIGURES.map((f) => (
          <div key={f.label}>
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
