import { useEffect, useRef, useState } from 'react'
import { th } from '../copy/th'
import type { AreaState, PublishedArea } from '../domain/types'
import type { CarePoint } from '../store/seed'
import { clampPan, fitMap, HIT_PX, LABEL_PX, MAP_INSET, markScale, PIN_PX } from './pan'
import { CANALS, CITY_PATH, RIVER_PATH, ROADS, ZONES } from './zones'

const TINT = { thin: 'var(--color-signal-1)', medium: 'var(--color-signal-2)', dense: 'var(--color-signal-3)' } as const
/**
 * Freshness is carried by the edge, never by colour alone (spec 18). Widths and dashes are
 * screen pixels, so the legend can draw exactly the line the map draws.
 */
export const EDGE_STYLE = {
  new: { width: 4, dash: undefined },
  followup: { width: 3, dash: '10 6' },
  expiring: { width: 3, dash: '1.5 7' },
  mixed: { width: 3, dash: '8 4 1.5 4' },
} as const
/** Length of a legend line sample, in pixels. */
export const SAMPLE_PX = 60
/** Where a selected pin or zone is brought to, so it stays in view above the sheet. */
const FOCUS_Y = 160

/** Paint for one area. `suffix` picks a pattern set, because pattern ids are shared by the whole page. */
export function areaPaint(area: PublishedArea | undefined, suffix = '') {
  if (!area) return { fill: 'var(--color-bg)', stroke: 'var(--color-line)', strokeDasharray: undefined, strokeWidth: 1.5, strokeOpacity: 1 }
  switch (area.state) {
    case 'shown': {
      const edge = EDGE_STYLE[area.step ?? 'mixed']
      return { fill: TINT[area.density ?? 'thin'], stroke: 'var(--color-signal-edge)', strokeDasharray: edge.dash, strokeWidth: edge.width, strokeOpacity: 1 }
    }
    // The three states without a signal are drawn quieter than any signal: they must read as
    // "nothing can be said here", never as louder than a real level.
    case 'below_threshold':
      return { fill: `url(#hatch${suffix})`, stroke: 'var(--color-signal-edge)', strokeDasharray: '4 5', strokeWidth: 1.5, strokeOpacity: 0.7 }
    case 'no_data':
      return { fill: `url(#dots${suffix})`, stroke: 'var(--color-muted)', strokeDasharray: '1.5 5', strokeWidth: 1.25, strokeOpacity: 0.7 }
    case 'no_partner':
      return { fill: `url(#cross${suffix})`, stroke: 'var(--color-muted)', strokeDasharray: undefined, strokeWidth: 1.25, strokeOpacity: 0.6 }
  }
}

/** Fill patterns, sized in screen pixels. `unit` is how many map units one pixel is. */
export function MapPatterns({ unit = 1, suffix = '' }: { unit?: number; suffix?: string }) {
  const scale = `scale(${unit})`
  return (
    <defs>
      <pattern id={`hatch${suffix}`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform={`${scale} rotate(45)`}>
        <rect width="9" height="9" fill="var(--color-veil)" />
        <line x1="0" y1="0" x2="0" y2="9" stroke="var(--color-signal-edge)" strokeWidth="1.6" opacity="0.3" />
      </pattern>
      <pattern id={`dots${suffix}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform={scale}>
        <rect width="10" height="10" fill="var(--color-bg)" />
        <circle cx="5" cy="5" r="1.2" fill="var(--color-muted)" opacity="0.4" />
      </pattern>
      <pattern id={`cross${suffix}`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform={scale}>
        <rect width="12" height="12" fill="var(--color-veil)" />
        <path d="M0 6H12M6 0V12" stroke="var(--color-muted)" strokeWidth="1" opacity="0.32" />
      </pattern>
    </defs>
  )
}

type Props = {
  areas: PublishedArea[]
  /** The city's published state, for its spoken name, whatever layers are shown. */
  cityState: AreaState
  carePoints: CarePoint[]
  phase: 1 | 2
  showSignal: boolean
  selectedArea?: string | null
  selectedPoint?: string | null
  onSelectArea: (areaId: string) => void
  onSelectCarePoint: (id: string) => void
}

/** The mark inside a care point pin, drawn for a pin of radius 15. */
export function Glyph({ kind }: { kind: CarePoint['kind'] }) {
  if (kind === 'pharmacy') return <rect x="-5.5" y="-5.5" width="11" height="11" rx="3" fill="none" stroke="#fff" strokeWidth="2.6" />
  if (kind === 'lab') return <circle r="4.5" fill="#fff" />
  return <path d="M-6 0H6M0 -6V6" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
}

export function SchematicMap({ areas, cityState, carePoints, phase, showSignal, selectedArea, selectedPoint, onSelectArea, onSelectCarePoint }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ px: number; py: number; x: number; y: number; moved: boolean } | null>(null)

  useEffect(() => {
    const el = wrap.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      setBox({ w: el.clientWidth, h: el.clientHeight })
      setPos(null)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const fit = box && box.w > 0 && box.h > 0 ? fitMap(box.w, box.h, MAP_INSET) : null
  // Map units per screen pixel. Before the first measurement, assume a phone.
  const unit = fit ? 1 / fit.scale : 2.3
  const mark = fit ? markScale(fit.scale) : 1
  const labelPx = Math.max(10, LABEL_PX * mark)
  const pinPx = PIN_PX * mark

  // A selected pin or zone is brought up under the chips, where the sheet does not cover it.
  const point = carePoints.find((p) => p.id === selectedPoint)
  const zone = ZONES.find((z) => z.id === selectedArea)
  const focus = point ? { x: point.x, y: point.y } : zone ? { x: zone.labelX, y: zone.labelY } : null
  const rest = fit ? (pos ?? { x: fit.x, y: fit.y }) : null
  const at = fit && box && focus ? { x: box.w / 2 - focus.x * fit.scale, y: FOCUS_Y - focus.y * fit.scale } : rest

  const byId = new Map(areas.map((a) => [a.areaId, a]))
  const city = phase === 1 && showSignal ? byId.get('bkk') : undefined
  const press = (run: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      run()
    }
  }
  const outline = { fill: 'none', stroke: 'var(--color-ink)', strokeWidth: 2.5, vectorEffect: 'non-scaling-stroke' as const, style: { pointerEvents: 'none' as const } }

  return (
    <div
      ref={wrap}
      className="absolute inset-0 touch-none overflow-hidden bg-land"
      onPointerDown={(e) => {
        if (rest) drag.current = { px: e.clientX, py: e.clientY, x: rest.x, y: rest.y, moved: false }
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d || !fit || !box) return
        const dx = e.clientX - d.px
        const dy = e.clientY - d.py
        if (Math.abs(dx) + Math.abs(dy) > 6 && !d.moved) {
          d.moved = true
          setDragging(true)
        }
        if (d.moved) setPos(clampPan(fit, box.w, box.h, d.x + dx, d.y + dy))
      }}
      onPointerUp={() => {
        setDragging(false)
        setTimeout(() => (drag.current = null), 0)
      }}
      onPointerLeave={() => {
        setDragging(false)
        drag.current = null
      }}
      onClickCapture={(e) => {
        // A drag that ends on a marker must not open it.
        if (drag.current?.moved) e.stopPropagation()
      }}
    >
      <svg
        viewBox="0 0 1000 1100"
        preserveAspectRatio="xMidYMid meet"
        className={`select-none ${at ? 'absolute left-0 top-0 max-w-none' : 'absolute inset-0 h-full w-full'}`}
        style={at && fit ? { width: fit.width, height: fit.height, transform: `translate(${at.x}px, ${at.y}px)`, transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)' } : undefined}
        aria-label={th.map.schematic}
      >
        <MapPatterns unit={unit} />
        <clipPath id="city-clip">
          <path d={CITY_PATH} />
        </clipPath>
        <path
          d={CITY_PATH}
          {...areaPaint(city)}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          role="button"
          tabIndex={0}
          aria-label={`กรุงเทพฯ: ${th.map.state[cityState]}`}
          className="map-area cursor-pointer"
          onClick={() => onSelectArea('bkk')}
          onKeyDown={press(() => onSelectArea('bkk'))}
        />
        <g clipPath="url(#city-clip)" style={{ pointerEvents: 'none' }}>
          {ROADS.map((d) => (
            <path key={d} d={d} fill="none" stroke="#fff" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" opacity="0.7" />
          ))}
        </g>
        {ZONES.map((z) => {
          const area = byId.get(z.id)
          if (phase === 1) {
            return <path key={z.id} d={z.path} fill="transparent" stroke="var(--color-line)" strokeWidth="1" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" strokeLinecap="round" className="cursor-pointer" onClick={() => onSelectArea('bkk')} />
          }
          return (
            <path
              key={z.id}
              d={z.path}
              {...(showSignal ? areaPaint(area) : { fill: 'transparent', stroke: 'var(--color-line)', strokeWidth: 1, strokeDasharray: '2 4' })}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              role="button"
              tabIndex={0}
              aria-label={`${z.name}: ${th.map.state[area?.state ?? 'no_data']}`}
              className="map-area cursor-pointer"
              onClick={() => onSelectArea(z.id)}
              onKeyDown={press(() => onSelectArea(z.id))}
            />
          )
        })}
        {/* Water stops at the city's edge: the drawing is one patch, not a slice of a larger map. */}
        <g clipPath="url(#city-clip)" style={{ pointerEvents: 'none' }}>
          {CANALS.map((d) => (
            <path key={d} d={d} fill="none" stroke="var(--color-water)" strokeWidth="3.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
          ))}
          <path d={RIVER_PATH} fill="none" stroke="var(--color-water)" strokeWidth="46" strokeLinecap="round" />
        </g>
        {selectedArea === 'bkk' && <path d={CITY_PATH} {...outline} />}
        {zone && <path d={zone.path} {...outline} />}
        {ZONES.map((z) => (
          <text
            key={z.id}
            x={z.labelX}
            y={z.labelY}
            textAnchor="middle"
            fontSize={labelPx * unit}
            fontWeight="600"
            fill="var(--color-ink)"
            stroke="var(--color-bg)"
            strokeWidth={3.5 * unit}
            strokeOpacity="0.92"
            strokeLinejoin="round"
            style={{ paintOrder: 'stroke', pointerEvents: 'none' }}
          >
            {z.name}
          </text>
        ))}
        {carePoints.map((p) => {
          const selected = p.id === selectedPoint
          return (
            <g
              key={p.id}
              transform={`translate(${p.x} ${p.y}) scale(${unit})`}
              role="button"
              tabIndex={0}
              aria-label={p.name}
              data-selected={selected}
              className="map-pin cursor-pointer"
              onClick={() => onSelectCarePoint(p.id)}
              onKeyDown={press(() => onSelectCarePoint(p.id))}
            >
              <circle data-hit r={HIT_PX} fill="transparent" />
              <circle className="map-pin-ring" r={pinPx + 6} fill="none" stroke="var(--color-ink)" strokeWidth="2.5" />
              <g transform={`scale(${selected ? 1.15 : 1})`}>
                <circle r={pinPx + 2} fill="#fff" />
                <circle r={pinPx} fill="var(--color-care)" />
                <g transform={`scale(${pinPx / 15})`}>
                  <Glyph kind={p.kind} />
                </g>
              </g>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
