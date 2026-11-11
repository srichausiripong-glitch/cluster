import { ChevronRight, Waves } from 'lucide-react'
import { useState } from 'react'
import { th } from '../copy/th'
import { PRESS } from '../design/look'
import { ZONES } from '../map/areas'
import type { Level } from '../map/geo'
import { PinMark } from '../map/legend'
import { RealMap } from '../map/RealMap'
import { usePartyStore } from '../store/partyStore'
import { CARE_POINTS, orderedCarePoints, PHASE2_AREAS } from '../store/seed'
import { demo } from '../store/stores'
import { zoneName } from './CarePointRow'
import { CarePointSheet } from './CarePointSheet'
import { SendSignalLink } from './SendSignalLink'
import { SignalSheet } from './SignalSheet'
import { carePointFor, useCity } from './useCity'

export function MapScreen() {
  const city = useCity()
  const { phase } = usePartyStore(demo)
  const [showCare, setShowCare] = useState(true)
  const [showSignal, setShowSignal] = useState(true)
  const [areaId, setAreaId] = useState<string | null>(null)
  const [pointId, setPointId] = useState<string | null>(null)
  const [seen, setSeen] = useState<{ level: Level; zoneId: string | null }>({ level: 'city', zoneId: null })

  const areas = phase === 2 ? PHASE2_AREAS : [city]
  const selected = areaId === null ? null : areaId === 'bkk' ? city : (PHASE2_AREAS.find((a) => a.areaId === areaId) ?? city)
  const selectedZone = areaId && areaId !== 'bkk' ? ZONES.find((z) => z.id === areaId) : undefined
  const selectedTitle = selectedZone ? th.map.signalTitleOf.replace('{zone}', selectedZone.name) : th.map.signalTitle
  // In the phase 2 preview, below city level, the state box speaks for the zone in the middle of the map.
  const zoneInView = phase === 2 && seen.level !== 'city' ? ZONES.find((z) => z.id === seen.zoneId) : undefined
  const place = zoneInView
    ? { id: zoneInView.id, name: zoneInView.name, state: PHASE2_AREAS.find((a) => a.areaId === zoneInView.id)?.state ?? ('no_data' as const) }
    : { id: 'bkk', name: 'กรุงเทพฯ', state: city.state }
  const first = orderedCarePoints()[0]
  const toggle = `min-h-9 rounded-full border-2 border-ink px-3 text-[13px] font-bold ${PRESS}`

  return (
    <div className="relative h-full overflow-hidden">
      <RealMap
        areas={areas}
        cityState={city.state}
        carePoints={showCare ? CARE_POINTS : []}
        phase={phase}
        showSignal={showSignal}
        selectedArea={areaId}
        selectedPoint={pointId}
        onSelectArea={setAreaId}
        onSelectCarePoint={setPointId}
        onView={setSeen}
      />

      <div className="absolute inset-x-3 top-3 flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={showCare} onClick={() => setShowCare((v) => !v)} className={`${toggle} ${showCare ? 'bg-care text-ink' : 'bg-surface text-muted'}`}>
          {th.map.layers.care}
        </button>
        <button type="button" aria-pressed={showSignal} onClick={() => setShowSignal((v) => !v)} className={`${toggle} ${showSignal ? 'bg-signal text-white' : 'bg-surface text-muted'}`}>
          {th.map.layers.signal}
        </button>
        {phase === 2 && <span className="rounded-full border-2 border-ink bg-surface px-3 py-1 text-[12px] font-bold text-ink">{th.map.phase2}</span>}
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

      <SendSignalLink className="absolute bottom-[5.25rem] right-3" />

      <button type="button" onClick={() => setPointId(first.id)} className={`absolute inset-x-3 bottom-3 flex min-h-16 items-center gap-3 box px-3 text-left ${PRESS}`}>
        <PinMark kind={first.kind} />
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] text-muted">{th.map.nearest}</span>
          <span className="block truncate font-semibold">{first.name}</span>
          <span className="block truncate text-[12px] text-muted">{zoneName(first.zoneId)}</span>
        </span>
        <ChevronRight size={20} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden="true" />
      </button>

      {selected && areaId && (
        <SignalSheet
          area={selected}
          title={selectedTitle}
          open
          onClose={() => setAreaId(null)}
          pair={carePointFor(areaId)}
          onOpenCarePoint={(id) => {
            setAreaId(null)
            setPointId(id)
          }}
        />
      )}
      <CarePointSheet point={CARE_POINTS.find((p) => p.id === pointId) ?? null} onClose={() => setPointId(null)} />
    </div>
  )
}
