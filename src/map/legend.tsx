// The map's own marks, drawn the same way wherever they are explained or repeated: in the legend,
// in lists, and on the map itself.
import type { CareLayer, DensityBand } from '../domain/types'
import { isVerified, type CarePoint } from '../data/carePoints'
import { LAYER_EMOJI } from '../design/emojiCodes'
import { emojiUrl } from '../design/emojiUrl'
import { EDGE, HATCH, SAMPLE_PX, SHADE_GROUND, SIGNAL_SHADE, SYMPTOM_GAP, SYMPTOM_LINE } from './style'

/** A care point pin. Its point is at 0, 0 and its round head is centred 26 px above. */
const PIN_SHAPE = 'M0 0C0 0 14 -15 14 -26A14 14 0 1 0 -14 -26C-14 -15 0 0 0 0Z'

/** A layer's emoji as a picture inside a mark, centred at (0, y). */
function MarkEmoji({ layer, size, y }: { layer: CareLayer; size: number; y: number }) {
  return <image data-emoji href={emojiUrl(LAYER_EMOJI[layer])} x={-size / 2} y={y - size / 2} width={size} height={size} />
}

/** A confirmed place's pin, for the map layer: a hard shadow, the pink body with a black outline, and its layer's emoji (redesign spec 5.8). */
export function PinBody({ layer }: { layer: CareLayer }) {
  return (
    <>
      <path d={PIN_SHAPE} transform="translate(2.5 2.5)" fill="var(--color-ink)" />
      <path data-pin-body d={PIN_SHAPE} fill="var(--color-care)" stroke="var(--color-ink)" strokeWidth="2.4" strokeLinejoin="round" />
      <MarkEmoji layer={layer} size={18} y={-26} />
    </>
  )
}

/** A place nobody has confirmed: a small white dot centred on its point, with its layer's emoji, never a pin (redesign spec 5.8). */
export function DotBody({ layer }: { layer: CareLayer }) {
  return (
    <>
      <circle cx="2" cy="2" r="9" fill="var(--color-ink)" />
      <circle data-dot r="9" fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth="2" />
      <MarkEmoji layer={layer} size={12} y={0} />
    </>
  )
}

/**
 * Several care points too close to tell apart at this level: one white disc with their number. It
 * claims no trust, by colour or otherwise: each place's own mark says that, a pin or a dot, one
 * level in (redesign spec 5.8; no state told by colour alone, spec 2).
 */
export function ManyBody({ count }: { count: number }) {
  return (
    <>
      <circle cx="2.5" cy="2.5" r="16" fill="var(--color-ink)" />
      <circle data-dot r="16" fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth="2.4" />
      <text y="5.4" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--color-ink)">
        {count}
      </text>
    </>
  )
}

/** The map's pin as a small picture, for the key. */
export function PinMark({ layer, size = 28 }: { layer: CareLayer; size?: number }) {
  return (
    <svg width={size} height={(size * 47) / 36} viewBox="-16 -42 36 47" aria-hidden="true" className="shrink-0">
      <PinBody layer={layer} />
    </svg>
  )
}

/** The map's dot as a small picture, for the key. */
export function DotMark({ layer, size = 22 }: { layer: CareLayer; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-11 -11 24 24" aria-hidden="true" className="shrink-0">
      <DotBody layer={layer} />
    </svg>
  )
}

/** A place's mark as the map draws it, for lists: the pin when confirmed, else the dot, in a box of one width. */
export function PointMark({ point, size = 28 }: { point: CarePoint; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center" style={{ width: size }}>
      {isVerified(point) ? <PinMark layer={point.layer} size={size} /> : <DotMark layer={point.layer} size={Math.round(size * 0.8)} />}
    </span>
  )
}

const dash = (edge: (typeof EDGE)[keyof typeof EDGE]) => edge.dash?.join(' ')

const STEPS: Record<DensityBand, number> = { thin: 1, medium: 2, dense: 3 }
/**
 * A level as three 5 px circles in a row, for SVG: filled ink for each step reached, an outline for
 * the rest (●●○). The first circle's centre is at (x, 0); they sit 8 px apart.
 */
export function LevelMarks({ level, x = 0, y = 0 }: { level: DensityBand; x?: number; y?: number }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <circle key={i} data-level-dot cx={x + i * 8} cy={y} r="2.5" fill={i < STEPS[level] ? 'var(--color-ink)' : 'var(--color-surface)'} stroke="var(--color-ink)" strokeWidth="1.2" />
      ))}
    </>
  )
}

/** A patch of signal for the key: the map's violet at the strength of a level on the map's own ground, with the level's dots beside it as the name box writes them. */
export function ShadeSwatch({ density }: { density: DensityBand }) {
  const [w, h] = [34, 26]
  return (
    <svg width={w + 30} height={h} viewBox={`0 0 ${w + 30} ${h}`} aria-hidden="true" className="shrink-0" data-shade={density}>
      <rect x="2" y="2" width={w - 4} height={h - 4} rx="7" fill="var(--color-land)" />
      <rect x="2" y="2" width={w - 4} height={h - 4} rx="7" fill="var(--color-surface)" opacity={SHADE_GROUND} />
      <rect x="2" y="2" width={w - 4} height={h - 4} rx="7" fill="var(--color-signal)" opacity={SIGNAL_SHADE[density]} />
      <rect x="2" y="2" width={w - 4} height={h - 4} rx="7" fill="none" stroke="var(--color-ink)" strokeWidth="1.5" />
      <LevelMarks level={density} x={w + 6} y={h / 2} />
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
export function QuietSwatch({ state, large = false }: { state: 'below_threshold' | 'no_data' | 'suspended'; large?: boolean }) {
  const [w, h] = large ? [58, 40] : [34, 26]
  const id = `quiet-${state}-${large ? 'l' : 's'}`
  const lines: string[] = []
  if (state === 'below_threshold') for (let x = -h; x < w; x += HATCH.gap) lines.push(`M${x} 0L${x + h} ${h}`)
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
        opacity={state === 'below_threshold' ? 0.75 : state === 'suspended' ? 0.6 : 0.5}
      />
    </svg>
  )
}

/** How the map marks symptoms: black slanted lines on the map's own ground, as far apart as the map draws that level. */
export function HatchSwatch({ level }: { level: DensityBand }) {
  const [w, h] = [34, 26]
  const gap = SYMPTOM_GAP[level]
  const id = `symptoms-${level}`
  const lines: string[] = []
  for (let x = -h; x < w; x += gap) lines.push(`M${x} ${h}L${x + h} 0`)
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0" data-gap={gap}>
      <clipPath id={id}>
        <rect x="2" y="2" width={w - 4} height={h - 4} rx="7" />
      </clipPath>
      <rect x="2" y="2" width={w - 4} height={h - 4} rx="7" fill="var(--color-land)" />
      <path d={lines.join('')} clipPath={`url(#${id})`} fill="none" stroke="var(--color-ink)" strokeWidth={SYMPTOM_LINE.width} opacity={SYMPTOM_LINE.alpha} />
      <rect x="2" y="2" width={w - 4} height={h - 4} rx="7" fill="none" stroke="var(--color-ink)" strokeWidth="1.5" />
    </svg>
  )
}
