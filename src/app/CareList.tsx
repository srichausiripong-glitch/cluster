import { ChevronRight, Waves, X } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { th } from '../copy/th'
import { CARE_POINTS, canTest, orderedCarePoints } from '../data/carePoints'
import { Emoji } from '../design/Emoji'
import { Mascot } from '../design/Logo'
import { PRESS, TEXT_LINK } from '../design/look'
import { DISTRICT_IDS, districtLabel } from '../domain/districts'
import { useAreas } from '../map/published'
import { usePartyStore } from '../store/partyStore'
import { phone } from '../store/stores'
import { CarePointRow } from './CarePointRow'
import { CarePointSheet } from './CarePointSheet'
import { Go } from './Go'
import { SignalSheet } from './SignalSheet'
import { StatusCard } from './StatusCard'
import { carePointFor } from './useCity'

/**
 * Everything the map says, as a list, equal to the map (v1 spec 5.1, 18): the status card, the city's
 * signal, the nearest place, and the care points. `?find=test` keeps the places to test;
 * `?district=<id>` the places in one district (redesign spec 5.1, 5.7).
 */
export function CareList() {
  const { city } = useAreas()
  const { myDistrict } = usePartyStore(phone)
  const [params] = useSearchParams()
  const [pointId, setPointId] = useState<string | null>(null)
  const [signalOpen, setSignalOpen] = useState(false)

  const find = params.get('find') === 'test'
  const asked = params.get('district')
  // A district that is not one of the 50 filters nothing: the list is never blank by mistake.
  const district = asked && DISTRICT_IDS.includes(asked) ? asked : null
  const filtered = find || district !== null
  const points = orderedCarePoints().filter((p) => (!find || canTest(p)) && (!district || p.districtId === district))
  const nearest = filtered ? undefined : carePointFor(myDistrict ?? 'bkk')
  const inMine = nearest !== undefined && myDistrict !== undefined && nearest.districtId === myDistrict
  const filterLabel = district ? districtLabel(district) : th.care.filterTest

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

      {nearest && (
        <div>
          <p className="mb-1 text-[13px] font-semibold text-muted">{inMine ? th.care.inMyDistrict : th.care.nearest}</p>
          <CarePointRow point={nearest} onOpen={() => setPointId(nearest.id)} />
        </div>
      )}

      {filtered && (
        <Go to="/app/list" aria-label={`${filterLabel} ${th.care.showAll}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 border-ink bg-care-soft px-3 text-[13px] font-bold">
          <Emoji name={district ? 'pin' : 'testTube'} size={16} />
          {filterLabel}
          <X size={14} strokeWidth={2.5} aria-hidden="true" />
        </Go>
      )}

      {CARE_POINTS.length === 0 ? (
        <div className="flex items-center gap-3 box px-4 py-3">
          <Mascot size={48} />
          <p className="text-[13px]">{th.care.noneVerified}</p>
        </div>
      ) : points.length === 0 ? (
        <div className="space-y-1 box px-4 py-3 text-[13px]">
          <p>{th.care.noneHere}</p>
          <Go to="/app/list" className={`inline-flex min-h-11 items-center ${TEXT_LINK}`}>
            {th.care.showAll}
          </Go>
        </div>
      ) : (
        <ul className="space-y-3">
          {points.map((point) => (
            <li key={point.id}>
              <CarePointRow point={point} onOpen={() => setPointId(point.id)} />
            </li>
          ))}
        </ul>
      )}

      {signalOpen && <SignalSheet area={city} open onClose={() => setSignalOpen(false)} />}
      <CarePointSheet point={CARE_POINTS.find((p) => p.id === pointId) ?? null} onClose={() => setPointId(null)} />
    </main>
  )
}
