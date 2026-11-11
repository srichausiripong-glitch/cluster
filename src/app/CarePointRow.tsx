import { ChevronRight } from 'lucide-react'
import { th } from '../copy/th'
import { PRESS } from '../design/look'
import { ZONES } from '../map/areas'
import { PinMark } from '../map/legend'
import type { CarePoint } from '../store/seed'

export const zoneName = (zoneId: string): string => ZONES.find((zone) => zone.id === zoneId)?.name ?? ''

/** What kind of place this is, in words. A pharmacy is a pharmacy, even where it may list what it offers. */
export function carePointType(point: CarePoint): string {
  if (point.kind === 'pharmacy') return th.care.type.pharmacy
  if (point.kind === 'lab') return th.care.type.lab
  return point.klass === 'A' ? th.care.klassA : th.care.klassB
}

type Props = { point: CarePoint; onOpen?: () => void; tone?: 'light' | 'dark' }

/**
 * One care point, drawn the same way wherever it appears: its map mark, name, place and kind,
 * hours and cost in words where the law lets them be shown (class A), and a tag only for PEP.
 */
export function CarePointRow({ point, onOpen, tone = 'light' }: Props) {
  const sub = tone === 'dark' ? 'text-white/85' : 'text-muted'
  const detail = point.klass === 'A' ? [point.hours, point.cost].filter(Boolean).join(' · ') : ''
  const body = (
    <>
      <PinMark kind={point.kind} />
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{point.name}</span>
        <span className={`block text-[13px] ${sub}`}>
          {zoneName(point.zoneId)} · {carePointType(point)}
        </span>
        {detail && <span className={`block text-[13px] ${sub}`}>{detail}</span>}
        {point.pep && <span className="mt-1 inline-block rounded-full border-[1.5px] border-ink bg-care-soft px-2.5 py-0.5 text-[12px] font-semibold text-ink">{th.care.pep}</span>}
      </span>
      {onOpen && <ChevronRight size={18} strokeWidth={1.75} className={`shrink-0 ${sub}`} aria-hidden="true" />}
    </>
  )
  const cls = `flex min-h-16 w-full items-center gap-3 rounded-md px-3 py-2 text-left ${tone === 'dark' ? 'border-2 border-white/60 bg-white/10 text-white' : `border-2 border-ink bg-surface ${onOpen ? PRESS : ''}`}`
  return onOpen ? (
    <button type="button" onClick={onOpen} className={cls}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}
