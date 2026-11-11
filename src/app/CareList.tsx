import { ChevronRight, Waves } from 'lucide-react'
import { useState } from 'react'
import { th } from '../copy/th'
import { PRESS } from '../design/look'
import { CARE_POINTS, orderedCarePoints } from '../store/seed'
import { CarePointRow } from './CarePointRow'
import { CarePointSheet } from './CarePointSheet'
import { SendSignalLink } from './SendSignalLink'
import { SignalSheet } from './SignalSheet'
import { carePointFor, useCity } from './useCity'

/**
 * Everything the map says, as a list: the area's signal, the way to send one, and the same
 * care points. Equal to the map, not a fallback (spec 5.1, 18).
 */
export function CareList() {
  const city = useCity()
  const [pointId, setPointId] = useState<string | null>(null)
  const [signalOpen, setSignalOpen] = useState(false)
  return (
    <main className="p-4">
      <h1 className="mb-3 text-[20px] font-bold">{th.care.listTitle}</h1>

      <button
        type="button"
        aria-label={th.map.openSignal}
        onClick={() => setSignalOpen(true)}
        className={`mb-4 flex min-h-13 w-full items-center gap-3 rounded-md border-2 border-ink bg-yellow px-3 text-left text-ink ${PRESS}`}
      >
        <Waves size={20} strokeWidth={2} className="shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="font-bold">กรุงเทพฯ</span> {th.map.state[city.state]}
        </span>
        <ChevronRight size={18} strokeWidth={2.25} className="shrink-0" aria-hidden="true" />
      </button>

      <ul className="space-y-3">
        {orderedCarePoints().map((point) => (
          <li key={point.id}>
            <CarePointRow point={point} onOpen={() => setPointId(point.id)} />
          </li>
        ))}
      </ul>

      <div className="pointer-events-none sticky bottom-3 mt-3 flex justify-end">
        <SendSignalLink className="pointer-events-auto" />
      </div>

      {signalOpen && (
        <SignalSheet
          area={city}
          title={th.map.signalTitle}
          open
          onClose={() => setSignalOpen(false)}
          pair={carePointFor('bkk')}
          onOpenCarePoint={(id) => {
            setSignalOpen(false)
            setPointId(id)
          }}
        />
      )}
      <CarePointSheet point={CARE_POINTS.find((p) => p.id === pointId) ?? null} onClose={() => setPointId(null)} />
    </main>
  )
}
