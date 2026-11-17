import { useId } from 'react'
import { th } from '../copy/th'
import { DISTRICTS } from '../domain/districts'

/**
 * The district a report or check-in is for: one of Bangkok's 50, chosen by the person, never from
 * the phone's position (redesign spec 5.5). A plain list for round 1; round 2 gives it its look.
 */
export function DistrictPicker({ district, onDistrict, name }: { district: string | null; onDistrict: (id: string) => void; name: string }) {
  const selectId = useId()
  return (
    <fieldset>
      <legend className="mb-1 font-bold">{th.report.zone}</legend>
      <p className="mb-2 text-[13px] text-muted">{th.report.zoneHint}</p>
      <label htmlFor={selectId} className="block text-[13px] font-semibold">
        {th.report.pickDistrict}
      </label>
      <select
        id={selectId}
        name={name}
        value={district ?? ''}
        onChange={(e) => e.target.value && onDistrict(e.target.value)}
        className="mt-1 min-h-11 w-full rounded-md border-2 border-ink bg-surface px-3 text-[15px]"
      >
        <option value="">{th.report.districtPlaceholder}</option>
        {DISTRICTS.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
    </fieldset>
  )
}
