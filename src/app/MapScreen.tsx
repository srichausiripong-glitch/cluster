import { ChevronRight, Waves } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { th } from '../copy/th'
import { PRESS } from '../design/look'
import type { Level } from '../map/geo'
import { useAreas } from '../map/published'
import { RealMap } from '../map/RealMap'
import { CARE_POINTS } from '../data/carePoints'
import { usePharmacies } from '../data/pharmacies'
import type { CareLayer } from '../domain/types'
import { districtName } from '../domain/districts'
import { CarePointSheet } from './CarePointSheet'
import { useGo } from './Go'
import { SignalSheet } from './SignalSheet'
import { StatusCard } from './StatusCard'
import { LayerChips } from './LayerChips'
import { layersOn, toggleLayer } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { phone } from '../store/stores'

export function MapScreen() {
  const { districts, city, byId } = useAreas()
  const stored = usePartyStore(phone)
  const on = layersOn(stored)
  const location = useLocation()
  const go = useGo()
  const [areaId, setAreaId] = useState<string | null>(null)
  const [pointId, setPointId] = useState<string | null>(null)
  const [seen, setSeen] = useState<{ level: Level; areaId: string | null }>({ level: 'city', areaId: null })
  const { sti, health_centre, hospital, pharmacy } = on
  const pharmacies = usePharmacies(pharmacy)
  const atCity = seen.level === 'city'
  // The places on the map, kept between renders so the map groups them again only when they change.
  // None at city level: the whole city reads as its districts only, and places show one level in
  // (owner, 18 Nov 2026: the numbered groups made the city too busy). "หาที่ตรวจ" and the list still find them.
  const points = useMemo(() => {
    if (atCity) return []
    const shown: Record<CareLayer, boolean> = { sti, health_centre, hospital, pharmacy }
    return [...CARE_POINTS, ...pharmacies.points].filter((p) => shown[p.layer])
  }, [sti, health_centre, hospital, pharmacy, atCity, pharmacies.points])
  const anyCare = sti || health_centre || hospital || pharmacy

  // Opened from the weekly notification (/app#follow): the followed district's sheet, from this phone's own store (redesign spec 5.11).
  const openId = areaId ?? (location.hash === '#follow' ? (stored.follow ?? null) : null)
  const selected = openId === null ? null : byId(openId)
  const closeArea = () => {
    setAreaId(null)
    if (location.hash) go('/app')
  }
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
        carePoints={points}
        phase={2}
        showSignal={on.confirmed}
        showSymptoms={on.symptoms}
        selectedArea={openId}
        selectedPoint={pointId}
        onSelectArea={setAreaId}
        onSelectCarePoint={setPointId}
        onView={setSeen}
        note={pharmacy && pharmacies.failed ? th.care.pharmaciesFailed : atCity && anyCare ? th.map.careZoom : undefined}
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

      {selected && <SignalSheet area={selected} open onClose={closeArea} />}
      <CarePointSheet point={points.find((p) => p.id === pointId) ?? null} onClose={() => setPointId(null)} />
    </div>
  )
}
