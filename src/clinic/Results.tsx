import { ChevronDown } from 'lucide-react'
import { th } from '../copy/th'
import type { DiseaseGroup } from '../domain/types'
import { Card } from '../design/primitives/Card'
import { Chip } from '../design/primitives/Chip'
import { flagPositive } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { clinic } from '../store/stores'

const GROUPS: DiseaseGroup[] = ['gono_chlam', 'syphilis', 'mpox', 'hiv']

/** The result lives here, at the clinic. The code itself says nothing about it, and the app is never told. */
export function Results() {
  const { codes } = usePartyStore(clinic)
  return (
    <div className="space-y-4">
      <h1 className="text-[24px] font-bold">{th.clinic.nav.results}</h1>
      {codes.length === 0 && (
        <Card>
          <p className="text-muted">{th.clinic.codesEmpty}</p>
        </Card>
      )}
      <ul className="space-y-2">
        {[...codes].reverse().map((code) => (
          <li key={code.id} className="box flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span className="font-bold tracking-widest">{code.id}</span>
            <span className="flex flex-wrap items-center gap-2">
              {code.cityConsent ? <Chip tone="care">{th.clinic.consent}</Chip> : <Chip>{th.clinic.noConsent}</Chip>}
              <span className="relative">
                <select
                  aria-label={`${th.clinic.setPositive} ${code.id}`}
                  value={code.positiveGroup ?? ''}
                  onChange={(e) => flagPositive(code.id, (e.target.value || null) as DiseaseGroup | null)}
                  className="min-h-11 appearance-none rounded-md border-2 border-ink bg-bg py-2 pl-3 pr-9 font-semibold"
                >
                  <option value="">{th.clinic.noResult}</option>
                  {GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {th.clinic.setPositive}: {th.group[g]}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} strokeWidth={2.25} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
