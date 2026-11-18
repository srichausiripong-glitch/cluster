import { ChevronRight, Waves, X } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { th } from '../copy/th'
import { CARE_POINTS, canTest, nearSort, type CarePoint } from '../data/carePoints'
import { usePharmacies } from '../data/pharmacies'
import { Emoji } from '../design/Emoji'
import { Mascot } from '../design/Logo'
import { NOTE, PRESS, TEXT_LINK } from '../design/look'
import { Button } from '../design/primitives/Button'
import { Sheet } from '../design/primitives/Sheet'
import { DISTRICT_IDS, districtLabel } from '../domain/districts'
import type { CareLayer } from '../domain/types'
import { NEIGHBOURS } from '../map/areas'
import { useAreas } from '../map/published'
import { layersOn, toggleLayer } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { phone } from '../store/stores'
import { CarePointRow } from './CarePointRow'
import { CarePointSheet } from './CarePointSheet'
import { DistrictPicker } from './DistrictPicker'
import { Go, useGo } from './Go'
import { LayerChips } from './LayerChips'
import { SignalSheet } from './SignalSheet'
import { StatusCard } from './StatusCard'

/** The list shows places, so it takes the map's four care switches and leaves the signal ones on the map. */
const CARE_LAYERS: readonly CareLayer[] = ['sti', 'health_centre', 'hospital', 'pharmacy']

/** The list's address for a district and the test filter, always in this order. */
function listPath(district: string | null, find: boolean): string {
  const query = new URLSearchParams()
  if (district) query.set('district', district)
  if (find) query.set('find', 'test')
  const text = query.toString()
  return text ? `/app/list?${text}` : '/app/list'
}

function Places({ label, points, onOpen }: { label: string; points: CarePoint[]; onOpen: (id: string) => void }) {
  return (
    <ul aria-label={label} className="space-y-3">
      {points.map((point) => (
        <li key={point.id}>
          <CarePointRow point={point} onOpen={() => onOpen(point.id)} />
        </li>
      ))}
    </ul>
  )
}

/**
 * Everything the map says, as a list, equal to the map (v1 spec 5.1, 18): the status card, the
 * city's signal, the nearest place, and the care points of the layers switched on, the same
 * switches as the map's (plan decision 10). `?find=test` keeps the places to test; `?district=<id>`
 * shows the places in one district, then those in the districts next to it (redesign spec 5.7, 5.8).
 */
export function CareList() {
  const { city } = useAreas()
  const state = usePartyStore(phone)
  const { myDistrict } = state
  const on = layersOn(state)
  const pharmacies = usePharmacies(on.pharmacy)
  const go = useGo()
  const [params] = useSearchParams()
  const [pointId, setPointId] = useState<string | null>(null)
  const [signalOpen, setSignalOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  const [chosen, setChosen] = useState<string | null>(null)

  const find = params.get('find') === 'test'
  const asked = params.get('district')
  // A district that is not one of the 50 filters nothing: the list is never blank by mistake.
  const district = asked && DISTRICT_IDS.includes(asked) ? asked : null
  const all = [...CARE_POINTS, ...pharmacies.points]
  const shown = all.filter((p) => on[p.layer] && (!find || canTest(p)))
  const sorted = nearSort(shown, district ?? myDistrict ?? null)
  const here = district ? sorted.filter((p) => p.districtId === district) : sorted
  // Without a filter the list begins at the nearest place, so it is named there, once (redesign spec 5.7).
  const nearest = find || district ? undefined : here.at(0)
  const inMine = nearest !== undefined && myDistrict !== undefined && nearest.districtId === myDistrict
  const nearby = district ? sorted.filter((p) => NEIGHBOURS[district].includes(p.districtId)) : []

  const pick = () => {
    setChosen(district)
    setPicking(true)
  }
  const choose = (next: string | null) => {
    setPicking(false)
    go(listPath(next, find))
  }

  return (
    <main className="space-y-4 p-4">
      <div>
        <h1 className="text-[20px] font-bold">{th.care.listTitle}</h1>
        <p className="text-[13px] text-muted">{th.care.anyAge}</p>
      </div>

      <StatusCard />

      <button
        type="button"
        aria-label={th.map.openSignal}
        onClick={() => setSignalOpen(true)}
        className={`flex min-h-13 w-full items-center gap-3 rounded-md border-2 border-ink bg-yellow px-3 text-left text-ink ${PRESS}`}
      >
        <Waves size={20} strokeWidth={2} className="shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="font-bold">{th.map.city}</span> {th.map.state[city.state]}
        </span>
        <ChevronRight size={18} strokeWidth={2.25} className="shrink-0" aria-hidden="true" />
      </button>

      <div className="-mx-3">
        <LayerChips on={on} onToggle={toggleLayer} layers={CARE_LAYERS} />
      </div>

      <button type="button" onClick={pick} className={`flex min-h-12 w-full items-center gap-2 rounded-md border-2 border-ink bg-surface px-3 text-left font-bold ${PRESS}`}>
        <Emoji name="pin" />
        <span className="min-w-0 flex-1">{district ? districtLabel(district) : th.care.allDistricts}</span>
        <ChevronRight size={18} strokeWidth={2.25} className="shrink-0" aria-hidden="true" />
      </button>

      {find && (
        <Go to={listPath(district, false)} aria-label={`${th.care.filterTest} ${th.care.showAll}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 border-ink bg-care-soft px-3 text-[13px] font-bold">
          <Emoji name="testTube" size={16} />
          {th.care.filterTest}
          <X size={14} strokeWidth={2.5} aria-hidden="true" />
        </Go>
      )}

      {pharmacies.failed && <p className={`px-3 py-2 text-[14px] ${NOTE}`}>{th.care.pharmaciesFailed}</p>}

      {CARE_POINTS.length === 0 ? (
        <div className="flex items-center gap-3 box px-4 py-3">
          <Mascot size={48} />
          <p className="text-[13px]">{th.care.noneVerified}</p>
        </div>
      ) : here.length + nearby.length === 0 ? (
        <div className="space-y-1 box px-4 py-3 text-[13px]">
          <p>{th.care.noneHere}</p>
          <Go to="/app/list" className={`inline-flex min-h-11 items-center ${TEXT_LINK}`}>
            {th.care.showAll}
          </Go>
        </div>
      ) : (
        <>
          {here.length > 0 && (
            <div>
              {nearest && <p className="mb-1 text-[13px] font-semibold text-muted">{inMine ? th.care.inMyDistrict : th.care.nearest}</p>}
              <Places label={district ? districtLabel(district) : th.care.listTitle} points={here} onOpen={setPointId} />
            </div>
          )}
          {nearby.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-[15px] font-bold">{th.care.nearby}</h2>
              <Places label={th.care.nearby} points={nearby} onOpen={setPointId} />
            </section>
          )}
        </>
      )}

      {signalOpen && <SignalSheet area={city} open onClose={() => setSignalOpen(false)} />}
      <CarePointSheet point={all.find((p) => p.id === pointId) ?? null} onClose={() => setPointId(null)} />
      <Sheet open={picking} onClose={() => setPicking(false)} title={th.picker.legend} tall>
        <div className="space-y-3">
          <DistrictPicker district={chosen} onDistrict={setChosen} name="list-district" />
          {/* Kept at the foot of the sheet, so the press stays in view below a long list, as on the ✅ sheet. */}
          <div className="sticky -bottom-6 -mx-4 -mb-6 space-y-1 border-t-2 border-ink bg-surface px-4 pb-7 pt-1">
            <Button size="lg" className="w-full" disabled={chosen === null} onClick={() => choose(chosen)}>
              <Emoji name="pin" />
              {th.picker.use}
            </Button>
            {district && (
              <Button variant="ghost" className="w-full" onClick={() => choose(null)}>
                {th.care.allDistricts}
              </Button>
            )}
          </div>
        </div>
      </Sheet>
    </main>
  )
}
