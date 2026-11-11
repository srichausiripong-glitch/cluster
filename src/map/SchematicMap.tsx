import { th } from '../copy/th'
import type { PublishedArea } from '../domain/types'
import type { CarePoint } from '../store/seed'
import { CANALS, CITY_PATH, RIVER_PATH, ROADS, ZONES } from './zones'

const TINT = { thin: 'var(--color-signal-1)', medium: 'var(--color-signal-2)', dense: 'var(--color-signal-3)' } as const
/** Freshness is carried by the edge, never by colour alone (spec 18). */
export const EDGE_DASH = { new: undefined, followup: '16 9', expiring: '2 11', mixed: '16 7 2 7' } as const

export function areaPaint(area: PublishedArea | undefined) {
  if (!area) return { fill: 'var(--color-bg)', stroke: 'var(--color-line)', strokeDasharray: undefined, strokeWidth: 2 }
  switch (area.state) {
    case 'shown':
      return { fill: TINT[area.density ?? 'thin'], stroke: 'var(--color-signal-edge)', strokeDasharray: EDGE_DASH[area.step ?? 'mixed'], strokeWidth: area.step === 'new' ? 6 : 4 }
    case 'below_threshold':
      return { fill: 'url(#hatch)', stroke: 'var(--color-signal-edge)', strokeDasharray: '6 9', strokeWidth: 2.5 }
    case 'no_data':
      return { fill: 'url(#dots)', stroke: 'var(--color-muted)', strokeDasharray: '2 9', strokeWidth: 2 }
    case 'no_partner':
      return { fill: 'url(#cross)', stroke: 'var(--color-muted)', strokeDasharray: undefined, strokeWidth: 2 }
  }
}

export function MapPatterns() {
  return (
    <defs>
      <pattern id="hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="14" height="14" fill="var(--color-veil)" />
        <line x1="0" y1="0" x2="0" y2="14" stroke="var(--color-signal-edge)" strokeWidth="3" opacity="0.4" />
      </pattern>
      <pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="var(--color-bg)" />
        <circle cx="8" cy="8" r="2" fill="var(--color-muted)" opacity="0.45" />
      </pattern>
      <pattern id="cross" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="var(--color-veil)" />
        <path d="M0 8H16M8 0V16" stroke="var(--color-muted)" strokeWidth="1.5" opacity="0.45" />
      </pattern>
    </defs>
  )
}

type Props = {
  areas: PublishedArea[]
  carePoints: CarePoint[]
  phase: 1 | 2
  showSignal: boolean
  onSelectArea: (areaId: string) => void
  onSelectCarePoint: (id: string) => void
}

function Glyph({ kind }: { kind: CarePoint['kind'] }) {
  if (kind === 'pharmacy') return <rect x="-5.5" y="-5.5" width="11" height="11" rx="3" fill="none" stroke="#fff" strokeWidth="2.6" />
  if (kind === 'lab') return <circle r="4.5" fill="#fff" />
  return <path d="M-6 0H6M0 -6V6" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
}

export function SchematicMap({ areas, carePoints, phase, showSignal, onSelectArea, onSelectCarePoint }: Props) {
  const byId = new Map(areas.map((a) => [a.areaId, a]))
  const city = phase === 1 && showSignal ? byId.get('bkk') : undefined
  const press = (run: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      run()
    }
  }
  return (
    <svg viewBox="0 0 1000 1100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full select-none" aria-label={th.map.schematic}>
      <MapPatterns />
      <rect width="1000" height="1100" fill="var(--color-land)" />
      <path
        d={CITY_PATH}
        {...areaPaint(city)}
        strokeLinecap="round"
        role="button"
        tabIndex={0}
        aria-label={`กรุงเทพฯ: ${th.map.state[(city ?? { state: 'no_data' as const }).state]}`}
        className="cursor-pointer outline-none"
        onClick={() => onSelectArea('bkk')}
        onKeyDown={press(() => onSelectArea('bkk'))}
      />
      {ROADS.map((d) => (
        <path key={d} d={d} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity="0.7" />
      ))}
      {ZONES.map((zone) => {
        const paint = phase === 2 && showSignal ? areaPaint(byId.get(zone.id)) : { fill: 'transparent', stroke: 'var(--color-line)', strokeDasharray: '3 7', strokeWidth: 1.5 }
        return <path key={zone.id} d={zone.path} {...paint} strokeLinecap="round" onClick={() => onSelectArea(phase === 2 ? zone.id : 'bkk')} className="cursor-pointer" />
      })}
      {CANALS.map((d) => (
        <path key={d} d={d} fill="none" stroke="var(--color-water)" strokeWidth="9" strokeLinecap="round" />
      ))}
      <path d={RIVER_PATH} fill="none" stroke="var(--color-water)" strokeWidth="46" strokeLinecap="round" />
      {ZONES.map((zone) => (
        <text key={zone.id} x={zone.labelX} y={zone.labelY} textAnchor="middle" fontSize="24" fontWeight="500" fill="var(--color-muted)" opacity="0.85" style={{ pointerEvents: 'none' }}>
          {zone.name}
        </text>
      ))}
      {carePoints.map((point) => (
        <g
          key={point.id}
          transform={`translate(${point.x} ${point.y})`}
          role="button"
          tabIndex={0}
          aria-label={point.name}
          className="cursor-pointer outline-none"
          onClick={() => onSelectCarePoint(point.id)}
          onKeyDown={press(() => onSelectCarePoint(point.id))}
        >
          <circle r="24" fill="transparent" />
          <circle r="19" fill="#fff" />
          <circle r="15" fill="var(--color-care)" />
          <Glyph kind={point.kind} />
        </g>
      ))}
    </svg>
  )
}
