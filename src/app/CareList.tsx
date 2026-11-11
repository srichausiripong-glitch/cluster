import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { th } from '../copy/th'
import { Chip } from '../design/primitives/Chip'
import { CARE_POINTS, orderedCarePoints } from '../store/seed'
import { CarePointSheet } from './CarePointSheet'

/** The same care points as the map, as a list: equal to the map, not a fallback (spec 18). */
export function CareList() {
  const [pointId, setPointId] = useState<string | null>(null)
  return (
    <main className="p-4">
      <h1 className="mb-3 text-[20px] font-semibold">{th.care.listTitle}</h1>
      <ul className="space-y-2">
        {orderedCarePoints().map((point) => (
          <li key={point.id}>
            <button type="button" onClick={() => setPointId(point.id)} className="flex min-h-16 w-full items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-2 text-left">
              <span className="min-w-0">
                <span className="block font-semibold">{point.name}</span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {point.free && <Chip tone="care">{th.common.free}</Chip>}
                  {point.pep && <Chip tone="care">{th.care.pep}</Chip>}
                  <Chip>{point.klass === 'A' ? th.care.klassA : th.care.klassB}</Chip>
                </span>
              </span>
              <ChevronRight size={20} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <CarePointSheet point={CARE_POINTS.find((p) => p.id === pointId) ?? null} onClose={() => setPointId(null)} />
    </main>
  )
}
