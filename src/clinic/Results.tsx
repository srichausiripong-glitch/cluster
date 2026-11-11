import { th } from '../copy/th'
import type { DiseaseGroup } from '../domain/types'
import { Card } from '../design/primitives/Card'
import { Chip } from '../design/primitives/Chip'
import { flagPositive } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { clinic } from '../store/stores'

const GROUPS: DiseaseGroup[] = ['gono_chlam', 'syphilis', 'mpox', 'hiv']

/** The positive flag lives here, at the clinic. The code itself says nothing about the result. */
export function Results() {
  const { codes } = usePartyStore(clinic)
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-[24px] font-semibold">{th.clinic.nav.results}</h1>
      {codes.length === 0 && (
        <Card>
          <p className="text-muted">{th.data.empty}</p>
        </Card>
      )}
      <ul className="space-y-2">
        {[...codes].reverse().map((code) => (
          <li key={code.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3">
            <span className="font-semibold tracking-widest">{code.id}</span>
            <span className="flex flex-wrap items-center gap-2">
              {code.positiveGroup && (code.cityConsent ? <Chip tone="care">{th.clinic.consent}</Chip> : <Chip>{th.clinic.noConsent}</Chip>)}
              <select
                aria-label={`${th.clinic.setPositive} ${code.id}`}
                value={code.positiveGroup ?? ''}
                onChange={(e) => {
                  if (e.target.value) flagPositive(code.id, e.target.value as DiseaseGroup)
                }}
                className="min-h-11 rounded-md border border-line bg-bg px-3"
              >
                <option value="">{th.clinic.noResult}</option>
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {th.clinic.setPositive}: {th.group[g]}
                  </option>
                ))}
              </select>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
