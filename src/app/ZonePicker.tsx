import { useId, useState } from 'react'
import { th } from '../copy/th'
import { ZONES } from '../map/areas'
import { DISTRICT_LIST } from '../map/districts'
import { ZONE_IDS } from '../store/seed'

const PICK = ZONE_IDS.map((id) => ZONES.find((z) => z.id === id)!)

/**
 * The six zones to pick from, and for someone who knows their district but not their zone, a list
 * of the 50 districts that picks the zone for them. Only the zone is used: the district stays in
 * this component's state and is gone when the picker closes.
 */
export function ZonePicker({ zone, onZone, name }: { zone: string | null; onZone: (id: string) => void; name: string }) {
  const [district, setDistrict] = useState('')
  const legendId = useId()
  const selectId = useId()
  const found = DISTRICT_LIST.find((d) => d.name === district)
  const foundZone = found && ZONES.find((z) => z.id === found.zone)

  return (
    <fieldset>
      <legend id={legendId} className="mb-1 font-bold">
        {th.report.zone}
      </legend>
      <p className="mb-2 text-[13px] text-muted">{th.report.zoneHint}</p>
      <div role="radiogroup" aria-labelledby={legendId} className="grid grid-cols-2 gap-2">
        {PICK.map((z) => (
          <label key={z.id} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border-2 border-ink px-3 text-[14px] font-semibold ${zone === z.id ? 'bg-care-soft' : 'bg-surface'}`}>
            <input
              type="radio"
              name={name}
              className="size-4 shrink-0 accent-[var(--color-ink)]"
              checked={zone === z.id}
              onChange={() => {
                setDistrict('')
                onZone(z.id)
              }}
            />
            {z.name}
          </label>
        ))}
      </div>
      <label htmlFor={selectId} className="mt-3 block text-[13px] font-semibold">
        {th.report.byDistrict}
      </label>
      <select
        id={selectId}
        value={district}
        onChange={(e) => {
          const picked = DISTRICT_LIST.find((d) => d.name === e.target.value)
          setDistrict(picked ? picked.name : '')
          if (picked) onZone(picked.zone)
        }}
        className="mt-1 min-h-11 w-full rounded-md border-2 border-ink bg-surface px-3 text-[15px]"
      >
        <option value="">{th.report.districtPlaceholder}</option>
        {DISTRICT_LIST.map((d) => (
          <option key={d.name} value={d.name}>
            {d.name}
          </option>
        ))}
      </select>
      {found && foundZone && <p className="mt-2 text-[13px] font-semibold">{th.report.districtIn.replace('{district}', found.name).replace('{zone}', foundZone.name)}</p>}
      <p className="mt-1 text-[12px] text-muted">{th.report.districtStays}</p>
    </fieldset>
  )
}
