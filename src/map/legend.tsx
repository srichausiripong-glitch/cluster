// The map's own marks, drawn the same way wherever they are explained or repeated: in the legend,
// in lists, and on the map itself.
import type { DensityBand } from '../domain/types'
import type { CarePoint } from '../store/seed'
import { DOT_GAP, DOT_R, EDGE, HATCH, SAMPLE_PX } from './style'

/** A care point pin. Its point is at 0, 0 and its round head is centred 26 px above. */
const PIN_SHAPE = 'M0 0C0 0 14 -15 14 -26A14 14 0 1 0 -14 -26C-14 -15 0 0 0 0Z'

/** The mark inside a pin's head: a cross for a clinic or hospital, a square for a pharmacy, a dot for a lab. Always black on pink. */
function Glyph({ kind }: { kind: CarePoint['kind'] }) {
  if (kind === 'pharmacy') return <rect data-glyph x="-5.8" y="-31.8" width="11.6" height="11.6" rx="3" fill="none" stroke="var(--color-ink)" strokeWidth="2.6" />
  if (kind === 'lab') return <circle data-glyph cx="0" cy="-26" r="4.8" fill="var(--color-ink)" />
  return <path data-glyph d="M-6.6 -26h13.2M0 -32.6v13.2" fill="none" stroke="var(--color-ink)" strokeWidth="3.2" strokeLinecap="round" />
}

/** The pin itself, for the map layer: a hard shadow, the pink body with a black outline, and the mark. */
export function PinBody({ kind }: { kind: CarePoint['kind'] }) {
  return (
    <>
      <path d={PIN_SHAPE} transform="translate(2.5 2.5)" fill="var(--color-ink)" />
      <path data-pin-body d={PIN_SHAPE} fill="var(--color-care)" stroke="var(--color-ink)" strokeWidth="2.4" strokeLinejoin="round" />
      <Glyph kind={kind} />
    </>
  )
}

/** Several care points too close to tell apart at this level: one disc with their number. */
export function ManyBody({ count }: { count: number }) {
  return (
    <>
      <circle cx="2.5" cy="2.5" r="16" fill="var(--color-ink)" />
      <circle data-pin-body r="16" fill="var(--color-care)" stroke="var(--color-ink)" strokeWidth="2.4" />
      <text y="5.4" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--color-ink)">
        {count}
      </text>
    </>
  )
}

/** The map's pin as a small picture, for lists and the legend. */
export function PinMark({ kind, size = 28 }: { kind: CarePoint['kind']; size?: number }) {
  return (
    <svg width={size} height={(size * 47) / 36} viewBox="-16 -42 36 47" aria-hidden="true" className="shrink-0">
      <PinBody kind={kind} />
    </svg>
  )
}

const dash = (edge: (typeof EDGE)[keyof typeof EDGE]) => edge.dash?.join(' ')

/** A patch of signal: the map's dots at the size of a level, on the map's own ground, with the edge of an age if given. */
export function DotSwatch({ density, edge, large = false }: { density: DensityBand; edge?: keyof typeof EDGE; large?: boolean }) {
  const [w, h] = large ? [58, 40] : [34, 26]
  const r = DOT_R[density]
  const d = DOT_GAP * Math.SQRT2
  const dots: [number, number][] = []
  for (let row = 0, y = 2; y < h; row++, y += d / 2) for (let x = 2 + (row % 2 ? d / 2 : 0); x < w; x += d) dots.push([x, y])
  const id = `swatch-${density}-${large ? 'l' : 's'}`
  return (
    // The large patch shows the area's own state; the small ones are the legend's three sizes.
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0" {...(large ? {} : { 'data-dot-r': r })}>
      <clipPath id={id}>
        <rect x="2" y="2" width={w - 4} height={h - 4} rx="7" />
      </clipPath>
      <rect x="2" y="2" width={w - 4} height={h - 4} rx="7" fill="var(--color-land)" />
      <g clipPath={`url(#${id})`} fill="var(--color-signal)">
        {dots.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
        ))}
      </g>
      <rect
        x="2"
        y="2"
        width={w - 4}
        height={h - 4}
        rx="7"
        fill="none"
        stroke={edge ? 'var(--color-signal-edge)' : 'var(--color-ink)'}
        strokeWidth={edge ? EDGE[edge].width : 1.5}
        strokeDasharray={edge ? dash(EDGE[edge]) : undefined}
        strokeLinecap={edge && EDGE[edge].cap === 'round' ? 'round' : 'butt'}
      />
    </svg>
  )
}

/** The edge of a signal as a straight line: the same width and dash the map draws, with room for three repeats. */
export function EdgeSample({ step }: { step: keyof typeof EDGE }) {
  const edge = EDGE[step]
  return (
    <svg width={SAMPLE_PX + 4} height="12" viewBox={`0 0 ${SAMPLE_PX + 4} 12`} aria-hidden="true" className="shrink-0">
      <line x1="2" y1="6" x2={SAMPLE_PX + 2} y2="6" stroke="var(--color-signal-edge)" strokeWidth={edge.width} strokeDasharray={dash(edge)} strokeLinecap={edge.cap === 'round' ? 'round' : 'butt'} />
    </svg>
  )
}

/** How the map marks an area without a signal. `large` is the patch at the top of an area's sheet. */
export function QuietSwatch({ state, large = false }: { state: 'below_threshold' | 'no_data' | 'no_partner'; large?: boolean }) {
  const [w, h] = large ? [58, 40] : [34, 26]
  const id = `quiet-${state}-${large ? 'l' : 's'}`
  const lines: string[] = []
  if (state === 'below_threshold') for (let x = -h; x < w; x += HATCH.gap) lines.push(`M${x} 0L${x + h} ${h}`)
  if (state === 'no_partner') {
    for (let x = 6; x < w; x += 12) lines.push(`M${x} 0V${h}`)
    for (let y = 6; y < h; y += 12) lines.push(`M0 ${y}H${w}`)
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0">
      <clipPath id={id}>
        <rect x="2" y="2" width={w - 4} height={h - 4} rx="7" />
      </clipPath>
      <rect x="2" y="2" width={w - 4} height={h - 4} rx="7" fill="var(--color-land)" />
      <path d={lines.join('')} clipPath={`url(#${id})`} fill="none" stroke={state === 'below_threshold' ? 'var(--color-signal-soft)' : 'var(--color-ink)'} strokeWidth={state === 'below_threshold' ? HATCH.width : 1} opacity={state === 'below_threshold' ? HATCH.alpha : 0.22} />
      <rect
        x="2"
        y="2"
        width={w - 4}
        height={h - 4}
        rx="7"
        fill="none"
        stroke={state === 'below_threshold' ? 'var(--color-signal-edge)' : 'var(--color-ink)'}
        strokeWidth={state === 'below_threshold' ? 1.8 : 1.4}
        strokeDasharray={state === 'below_threshold' ? '4 5' : state === 'no_data' ? '0.1 5' : undefined}
        strokeLinecap={state === 'no_data' ? 'round' : 'butt'}
        opacity={state === 'below_threshold' ? 0.75 : 0.5}
      />
    </svg>
  )
}
