import { Check } from 'lucide-react'
import { useId, useState } from 'react'
import { th } from '../copy/th'
import { Emoji } from '../design/Emoji'
import { DISTRICTS, matchDistrict } from '../domain/districts'

/**
 * The district a report is for: one of Bangkok's 50, found by typing part of its name or picked from
 * the list, never from the phone's position (redesign spec 5.2, 5.5). A district stays chosen while
 * a search hides it.
 */
export function DistrictPicker({ district, onDistrict, name }: { district: string | null; onDistrict: (id: string) => void; name: string }) {
  const [query, setQuery] = useState('')
  const searchId = useId()
  const shown = DISTRICTS.filter((d) => matchDistrict(query, d.name))
  return (
    <div className="space-y-2">
      <label htmlFor={searchId} className="sr-only">
        {th.picker.search}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          <Emoji name="search" size={18} />
        </span>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={th.picker.placeholder}
          autoComplete="off"
          className="min-h-11 w-full rounded-md border-2 border-ink bg-surface pl-10 pr-3 text-[15px]"
        />
      </div>
      <fieldset>
        <legend className="sr-only">{th.picker.legend}</legend>
        <div className="max-h-[30dvh] overflow-y-auto rounded-md border-2 border-ink bg-surface">
          {shown.map((d) => (
            <label
              key={d.id}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 border-b border-line px-3 last:border-b-0 has-[:focus-visible]:outline-[3px] has-[:focus-visible]:-outline-offset-4 has-[:focus-visible]:outline-ink ${district === d.id ? 'bg-care-soft font-bold' : ''}`}
            >
              <input type="radio" name={name} value={d.id} checked={district === d.id} onChange={() => onDistrict(d.id)} className="sr-only" />
              {d.name}
              {district === d.id && <Check size={18} strokeWidth={3} className="shrink-0" aria-hidden="true" />}
            </label>
          ))}
          {shown.length === 0 && <p className="px-3 py-2 text-[14px] text-muted">{th.picker.none}</p>}
        </div>
      </fieldset>
    </div>
  )
}
