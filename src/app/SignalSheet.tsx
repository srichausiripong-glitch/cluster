import { Check } from 'lucide-react'
import { th } from '../copy/th'
import type { PublishedArea } from '../domain/types'
import { Chip } from '../design/primitives/Chip'
import { Sheet } from '../design/primitives/Sheet'
import { areaPaint, EDGE_STYLE, MapPatterns, SAMPLE_PX } from '../map/SchematicMap'
import { OFFICIAL_FIGURES, type CarePoint } from '../store/seed'
import { CarePointRow, PinGlyph } from './CarePointRow'

const DENSITIES = ['thin', 'medium', 'dense'] as const
const STEPS = ['new', 'followup', 'expiring', 'mixed'] as const
const QUIET_STATES = ['below_threshold', 'no_data', 'no_partner'] as const
const PIN_KINDS = ['clinic', 'pharmacy', 'lab'] as const

/** A patch drawn with the map's own fill and edge. */
function Swatch({ area, large = false }: { area: PublishedArea; large?: boolean }) {
  const [w, h] = large ? [56, 36] : [34, 22]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0">
      <MapPatterns suffix="-key" />
      <rect x="3" y="3" width={w - 6} height={h - 6} rx="7" {...areaPaint(area, '-key')} strokeLinecap="round" />
    </svg>
  )
}

/** The edge of a signal as a straight line: the same width and dash the map draws, with room for three repeats. */
function EdgeSample({ step }: { step: (typeof STEPS)[number] }) {
  const edge = EDGE_STYLE[step]
  return (
    <svg width={SAMPLE_PX + 4} height="12" viewBox={`0 0 ${SAMPLE_PX + 4} 12`} aria-hidden="true" className="shrink-0">
      <line x1="2" y1="6" x2={SAMPLE_PX + 2} y2="6" stroke="var(--color-signal-edge)" strokeWidth={edge.width} strokeDasharray={edge.dash} strokeLinecap="round" />
    </svg>
  )
}

/** The value that applies now is marked with a tick and the word "ตอนนี้", never by weight or colour alone. */
function Value({ label, current }: { label: string; current: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-x-1.5">
      <span aria-current={current ? 'true' : undefined} className={current ? 'font-semibold text-ink' : 'text-muted'}>
        {label}
      </span>
      {current && (
        <span className="inline-flex items-center gap-0.5 rounded-full border border-ink px-1.5 text-[11px] font-medium text-ink">
          <Check size={12} strokeWidth={2.5} aria-hidden="true" />
          {th.map.current}
        </span>
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
        <Swatch area={area} large />
        <div>
          <h3 className="font-semibold">{th.map.state[area.state]}</h3>
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
                  <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="shrink-0">
                    <rect x="1" y="1" width="20" height="20" rx="6" fill={`var(--color-signal-${DENSITIES.indexOf(d) + 1})`} stroke="var(--color-line)" />
                  </svg>
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

      <div className="mt-4 rounded-md bg-bg p-3 text-[13px]">
        <p className="font-semibold">{th.map.legendNotSafe}</p>
        <p className="text-muted">{th.map.legendWhat}</p>
        <p className="text-muted">
          {th.map.weekly} · {th.map.schematic}
        </p>
      </div>

      <h3 className="mb-2 mt-4 text-[13px] font-medium text-muted">{th.map.pair}</h3>
      <CarePointRow point={pair} onOpen={() => onOpenCarePoint(pair.id)} />

      <h3 className="mb-2 mt-4 text-[13px] font-medium text-muted">{th.map.key}</h3>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
        {QUIET_STATES.map((state) => (
          <li key={state} className="flex items-center gap-2">
            <Swatch area={{ areaId: 'key', state, density: null, step: null }} />
            <span>{th.map.state[state]}</span>
          </li>
        ))}
        {PIN_KINDS.map((kind) => (
          <li key={kind} className="flex items-center gap-2">
            <span className="grid w-[34px] shrink-0 place-items-center">
              <PinGlyph kind={kind} size={22} />
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
