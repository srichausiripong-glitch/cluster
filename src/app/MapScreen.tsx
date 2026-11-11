import { ChevronRight, Radio, Waves } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { th } from '../copy/th'
import type { PublishedArea } from '../domain/types'
import { SchematicMap } from '../map/SchematicMap'
import { ZONES } from '../map/zones'
import { usePartyStore } from '../store/partyStore'
import { CARE_POINTS, orderedCarePoints, PHASE2_AREAS } from '../store/seed'
import { demo, pub } from '../store/stores'
import { CarePointSheet } from './CarePointSheet'
import { useEmbedTo } from './embed'
import { SignalSheet } from './SignalSheet'

const NO_DATA: PublishedArea = { areaId: 'bkk', state: 'no_data', density: null, step: null }

export function MapScreen() {
  const to = useEmbedTo()
  const files = usePartyStore(pub).files
  const { phase } = usePartyStore(demo)
  const [showCare, setShowCare] = useState(true)
  const [showSignal, setShowSignal] = useState(true)
  const [areaId, setAreaId] = useState<string | null>(null)
  const [pointId, setPointId] = useState<string | null>(null)

  const city = files.at(-1)?.areas.find((a) => a.areaId === 'bkk') ?? NO_DATA
  const areas = phase === 2 ? PHASE2_AREAS : [city]
  const selected = areaId === null ? null : areaId === 'bkk' ? city : (PHASE2_AREAS.find((a) => a.areaId === areaId) ?? city)
  const selectedTitle = areaId && areaId !== 'bkk' ? (ZONES.find((z) => z.id === areaId)?.name ?? th.map.signalTitle) : th.map.signalTitle
  const nearest = orderedCarePoints()[0]
  const toggle = 'min-h-9 rounded-full border px-3 text-[13px] font-medium shadow-sm'

  return (
    <div className="relative h-full overflow-hidden">
      <SchematicMap
        areas={areas}
        carePoints={showCare ? CARE_POINTS : []}
        phase={phase}
        showSignal={showSignal}
        onSelectArea={setAreaId}
        onSelectCarePoint={setPointId}
      />

      <div className="absolute inset-x-3 top-3 flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={showCare} onClick={() => setShowCare((v) => !v)} className={`${toggle} ${showCare ? 'border-care bg-care text-white' : 'border-line bg-surface text-muted'}`}>
          {th.map.layers.care}
        </button>
        <button type="button" aria-pressed={showSignal} onClick={() => setShowSignal((v) => !v)} className={`${toggle} ${showSignal ? 'border-signal-edge bg-signal-edge text-white' : 'border-line bg-surface text-muted'}`}>
          {th.map.layers.signal}
        </button>
        {phase === 2 && <span className="rounded-full border border-dashed border-signal-edge bg-surface px-3 py-1 text-[12px] font-medium text-signal-edge">{th.map.phase2}</span>}
      </div>

      <button
        type="button"
        aria-label={th.map.openSignal}
        onClick={() => setAreaId('bkk')}
        className="absolute left-3 top-14 flex min-h-11 max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-md border border-line bg-surface/95 px-3 text-left text-[13px] shadow-sm"
      >
        <Waves size={18} strokeWidth={1.75} className="shrink-0 text-signal-edge" aria-hidden="true" />
        <span>
          <span className="font-semibold">กรุงเทพฯ</span> <span className="text-muted">{th.map.state[city.state]}</span>
        </span>
      </button>

      <p className="absolute bottom-[5.5rem] left-3 rounded-sm bg-surface/80 px-2 py-0.5 text-[11px] text-muted">{th.map.schematic}</p>

      <Link
        to={to('/app/report')}
        className="absolute bottom-[5.25rem] right-3 inline-flex min-h-14 items-center gap-2 rounded-full bg-care px-5 text-[17px] font-semibold text-white shadow-float transition active:scale-[0.98]"
      >
        <Radio size={22} strokeWidth={1.75} aria-hidden="true" />
        {th.report.cta}
      </Link>

      <button
        type="button"
        onClick={() => setPointId(nearest.id)}
        className="absolute inset-x-3 bottom-3 flex min-h-16 items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 text-left shadow-float"
      >
        <span className="min-w-0">
          <span className="block text-[12px] text-muted">{th.map.nearest}</span>
          <span className="block truncate font-semibold">{nearest.name}</span>
        </span>
        <ChevronRight size={20} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden="true" />
      </button>

      {selected && <SignalSheet area={selected} title={selectedTitle} open onClose={() => setAreaId(null)} />}
      <CarePointSheet point={CARE_POINTS.find((p) => p.id === pointId) ?? null} onClose={() => setPointId(null)} />
    </div>
  )
}
