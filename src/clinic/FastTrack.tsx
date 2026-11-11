import { th } from '../copy/th'
import { weeklyCode } from '../domain/fastTrack'
import type { DiseaseGroup } from '../domain/types'
import { isoWeek } from '../domain/weeks'
import { Button } from '../design/primitives/Button'
import { tallyFastTrack } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { clinic } from '../store/stores'
import { underK } from './format'

const GROUPS: DiseaseGroup[] = ['gono_chlam', 'syphilis', 'mpox', 'hiv']

/** One code per disease group per week, the same for every recipient. The clinic keeps a tally, not a list. */
export function FastTrack() {
  const { fastTrackTally } = usePartyStore(clinic)
  const week = isoWeek(new Date())
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-[24px] font-semibold">{th.clinic.nav.fastTrack}</h1>
      <p className="text-[13px] text-muted">{week}</p>
      <div className="space-y-3">
        {GROUPS.map((group) => (
          <section key={group} className="rounded-md border border-line bg-surface p-4">
            <h2 className="mb-2 font-semibold">{th.group[group]}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {([true, false] as const).map((withCode) => {
                const code = weeklyCode(group, withCode, week)
                return (
                  <div key={code} className="rounded-md bg-bg p-3">
                    <p className="text-[13px] text-muted">{withCode ? th.clinic.withCode : th.clinic.withoutCode}</p>
                    <p className="text-[24px] font-semibold tracking-[0.2em] text-care">{code}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[13px] text-muted">
                        {th.clinic.tallyCount}: {underK(fastTrackTally[code] ?? 0)}
                      </span>
                      <Button variant="secondary" aria-label={`${th.clinic.tally} ${code}`} onClick={() => tallyFastTrack(code)}>
                        +1
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
