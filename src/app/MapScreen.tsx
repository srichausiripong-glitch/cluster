import { ChevronRight, Radio, Waves } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { th } from '../copy/th'
import { SchematicMap } from '../map/SchematicMap'
import { ZONES } from '../map/zones'
import { usePartyStore } from '../store/partyStore'
import { CARE_POINTS, orderedCarePoints, PHASE2_AREAS } from '../store/seed'
import { demo } from '../store/stores'
import { PinGlyph, zoneName } from './CarePointRow'
import { CarePointSheet } from './CarePointSheet'
import { useEmbedTo } from './embed'
import { SignalSheet } from './SignalSheet'
import { carePointFor, useCity } from './useCity'

export function MapScreen() {
  const to = useEmbedTo()
  const city = useCity()
  const { phase } = usePartyStore(demo)
  const [showCare, setShowCare] = useState(true)
  const [showSignal, setShowSignal] = useState(true)
  const [areaId, setAreaId] = useState<string | null>(null)
  const [pointId, setPointId] = useState<string | null>(null)

  const areas = phase === 2 ? PHASE2_AREAS : [city]
  const selected = areaId === null ? null : areaId === 'bkk' ? city : (PHASE2_AREAS.find((a) => a.areaId === areaId) ?? city)
  const selectedTitle = areaId && areaId !== 'bkk' ? (ZONES.find((z) => z.id === areaId)?.name ?? th.map.signalTitle) : th.map.signalTitle
  const first = orderedCarePoints()[0]
  const toggle = 'min-h-9 rounded-full border-2 border-ink px-3 text-[13px] font-bold shadow-pop'

  return (
    <div className="relative h-full overflow-hidden">
      <SchematicMap
        areas={areas}
        cityState={city.state}
        carePoints={showCare ? CARE_POINTS : []}
        phase={phase}
        showSignal={showSignal}
        selectedArea={areaId}
        selectedPoint={pointId}
        onSelectArea={setAreaId}
        onSelectCarePoint={setPointId}
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
        onClick={() => setAreaId('bkk')}
        className="absolute left-3 top-14 flex min-h-11 max-w-[calc(100%-1.5rem)] items-center gap-2 box px-3 text-left text-[13px] shadow-pop"
      >
        <Waves size={18} strokeWidth={1.75} className="shrink-0 text-signal-edge" aria-hidden="true" />
        <span>
          <span className="font-semibold">กรุงเทพฯ</span> <span className="text-muted">{th.map.state[city.state]}</span>
        </span>
        <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden="true" />
      </button>

      <Link
        to={to('/app/report')}
        className="absolute bottom-[5.25rem] right-3 inline-flex min-h-14 items-center gap-2 rounded-full border-[2.5px] border-ink bg-care px-5 text-[17px] font-bold text-ink shadow-pop-lg"
      >
        <Radio size={22} strokeWidth={1.75} aria-hidden="true" />
        {th.report.cta}
      </Link>

      <button
        type="button"
        onClick={() => setPointId(first.id)}
        className="absolute inset-x-3 bottom-3 flex min-h-16 items-center gap-3 box px-3 text-left shadow-pop"
      >
        <PinGlyph kind={first.kind} />
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
