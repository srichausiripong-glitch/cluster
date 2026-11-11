import { ChevronRight, Radio, Waves } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { th } from '../copy/th'
import { CARE_POINTS, orderedCarePoints } from '../store/seed'
import { CarePointRow } from './CarePointRow'
import { CarePointSheet } from './CarePointSheet'
import { useEmbedTo } from './embed'
import { SignalSheet } from './SignalSheet'
import { carePointFor, useCity } from './useCity'

/**
 * Everything the map says, as a list: the area's signal, the way to send one, and the same
 * care points. Equal to the map, not a fallback (spec 5.1, 18).
 */
export function CareList() {
  const to = useEmbedTo()
  const city = useCity()
  const [pointId, setPointId] = useState<string | null>(null)
  const [signalOpen, setSignalOpen] = useState(false)
  return (
    <main className="p-4">
      <h1 className="mb-3 text-[20px] font-semibold">{th.care.listTitle}</h1>

      <button
        type="button"
        aria-label={th.map.openSignal}
        onClick={() => setSignalOpen(true)}
        className="mb-3 flex min-h-13 w-full items-center gap-3 box px-3 text-left"
      >
        <Waves size={20} strokeWidth={1.75} className="shrink-0 text-signal-edge" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="font-semibold">กรุงเทพฯ</span> <span className="text-muted">{th.map.state[city.state]}</span>
        </span>
        <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden="true" />
      </button>

      <ul className="space-y-2">
        {orderedCarePoints().map((point) => (
          <li key={point.id}>
            <CarePointRow point={point} onOpen={() => setPointId(point.id)} />
          </li>
        ))}
      </ul>

      <div className="pointer-events-none sticky bottom-3 mt-3 flex justify-end">
        <Link
          to={to('/app/report')}
          className="pointer-events-auto inline-flex min-h-14 items-center gap-2 rounded-full border-[2.5px] border-ink bg-care px-5 text-[17px] font-bold text-ink shadow-pop-lg"
        >
          <Radio size={22} strokeWidth={1.75} aria-hidden="true" />
          {th.report.cta}
        </Link>
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
