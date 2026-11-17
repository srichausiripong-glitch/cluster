import { ChevronRight, Waves } from 'lucide-react'
import { useState } from 'react'
import { th } from '../copy/th'
import { PRESS } from '../design/look'
import type { Level } from '../map/geo'
import { PinMark } from '../map/legend'
import { useAreas } from '../map/published'
import { RealMap } from '../map/RealMap'
import { CARE_POINTS, orderedCarePoints } from '../data/carePoints'
import { districtLabel, districtName } from '../domain/districts'
import { CarePointSheet } from './CarePointSheet'
import { CheckIn } from './CheckIn'
import { SendSignalLink } from './SendSignalLink'
import { SignalSheet } from './SignalSheet'
import { carePointFor } from './useCity'

export function MapScreen() {
  const { districts, city, byId } = useAreas()
  const [showCare, setShowCare] = useState(true)
  const [showSignal, setShowSignal] = useState(true)
  const [areaId, setAreaId] = useState<string | null>(null)
  const [pointId, setPointId] = useState<string | null>(null)
  const [seen, setSeen] = useState<{ level: Level; areaId: string | null }>({ level: 'city', areaId: null })

  const selected = areaId === null ? null : byId(areaId)
  const selectedLabel = areaId && areaId !== 'bkk' ? districtLabel(areaId) : ''
  const selectedTitle = selectedLabel ? th.map.signalTitleOf.replace('{district}', selectedLabel) : th.map.signalTitle
  // Below city level, the state box speaks for the district in the middle of the map.
  const inView = seen.level !== 'city' && seen.areaId ? seen.areaId : null
  const place = inView
    ? { id: inView, name: districtName(inView), state: byId(inView).state }
    : { id: 'bkk', name: 'กรุงเทพฯ', state: city.state }
  const first = orderedCarePoints().at(0)
  const toggle = `min-h-9 rounded-full border-2 border-ink px-3 text-[13px] font-bold ${PRESS}`

  return (
    <div className="relative h-full overflow-hidden">
      <RealMap
        areas={districts}
        cityState={city.state}
        carePoints={showCare ? CARE_POINTS : []}
        phase={2}
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

      <CheckIn className="absolute bottom-[6.5rem] left-3" />
      <SendSignalLink className="absolute bottom-[6.5rem] right-3" />

      {first ? (
        <button type="button" onClick={() => setPointId(first.id)} className={`absolute inset-x-3 bottom-3 flex min-h-16 items-center gap-3 box px-3 text-left ${PRESS}`}>
          <PinMark kind={first.kind} />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] text-muted">{th.map.nearest}</span>
            <span className="block truncate font-semibold">{first.name}</span>
            <span className="block truncate text-[12px] text-muted">{districtLabel(first.districtId)}</span>
          </span>
          <ChevronRight size={20} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden="true" />
        </button>
      ) : (
        <p className="absolute inset-x-3 bottom-3 box px-3 py-3 text-[13px]">{th.care.noneVerified}</p>
      )}

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
