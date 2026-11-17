import { ChevronRight, Waves } from 'lucide-react'
import { useState } from 'react'
import { th } from '../copy/th'
import { PRESS } from '../design/look'
import type { Level } from '../map/geo'
import { useAreas } from '../map/published'
import { RealMap } from '../map/RealMap'
import { CARE_POINTS } from '../data/carePoints'
import { districtName } from '../domain/districts'
import { CarePointSheet } from './CarePointSheet'
import { SignalSheet } from './SignalSheet'
import { StatusCard } from './StatusCard'
import { LayerChips } from './LayerChips'
import { layersOn, toggleLayer } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { phone } from '../store/stores'

export function MapScreen() {
  const { districts, city, byId } = useAreas()
  const on = layersOn(usePartyStore(phone))
  const [areaId, setAreaId] = useState<string | null>(null)
  const [pointId, setPointId] = useState<string | null>(null)
  const [seen, setSeen] = useState<{ level: Level; areaId: string | null }>({ level: 'city', areaId: null })

  const selected = areaId === null ? null : byId(areaId)
  // Below city level, the state box speaks for the district in the middle of the map.
  const inView = seen.level !== 'city' && seen.areaId ? seen.areaId : null
  const place = inView
    ? { id: inView, name: districtName(inView), state: byId(inView).state }
    : { id: 'bkk', name: 'กรุงเทพฯ', state: city.state }

  return (
    <div className="relative h-full overflow-hidden">
      <RealMap
        areas={districts}
        cityState={city.state}
        carePoints={CARE_POINTS.filter((p) => on[p.layer])}
        phase={2}
        showSignal={on.confirmed}
        showSymptoms={on.symptoms}
        selectedArea={areaId}
        selectedPoint={pointId}
        onSelectArea={setAreaId}
        onSelectCarePoint={setPointId}
        onView={setSeen}
      />

      <div className="absolute inset-x-0 top-3">
        <LayerChips on={on} onToggle={toggleLayer} />
      </div>

      <button
        type="button"
        aria-label={th.map.openSignal}
        onClick={() => setAreaId(place.id)}
        className={`absolute left-3 top-14 flex min-h-11 max-w-[calc(100%-5.5rem)] items-center gap-2 rounded-md border-2 border-ink bg-yellow px-3 text-left text-[13px] text-ink ${PRESS}`}
      >
        <Waves size={18} strokeWidth={2} className="shrink-0" aria-hidden="true" />
        <span>
          <span className="font-bold">{place.name}</span> {th.map.state[place.state]}
        </span>
        <ChevronRight size={16} strokeWidth={2.25} className="shrink-0" aria-hidden="true" />
      </button>

      {/* The credit keeps its own line right above the status card, which floats over the map (owner's design A). */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col items-start gap-1">
        <p className="max-w-full rounded-md bg-bg/85 px-1.5 text-[9.5px] leading-4 text-muted">{th.map.credit}</p>
        <div className="pointer-events-auto w-full">
          <StatusCard />
        </div>
      </div>

      {selected && <SignalSheet area={selected} open onClose={() => setAreaId(null)} />}
      <CarePointSheet point={CARE_POINTS.find((p) => p.id === pointId) ?? null} onClose={() => setPointId(null)} />
    </div>
  )
}
