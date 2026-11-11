import { Check } from 'lucide-react'
import { useState } from 'react'
import { th } from '../copy/th'
import { weeklyCodes, type WeeklyCodeEntry } from '../domain/fastTrack'
import type { DiseaseGroup } from '../domain/types'
import { Button } from '../design/primitives/Button'
import { Card } from '../design/primitives/Card'
import { currentWeek, tallyFastTrack, untallyFastTrack } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { clinic, demo } from '../store/stores'
import { underK } from './format'

const GROUPS: DiseaseGroup[] = ['gono_chlam', 'syphilis', 'mpox', 'hiv']
const describe = (entry: WeeklyCodeEntry) => `${entry.withClinicCode ? th.clinic.withCode : th.clinic.withoutCode} · ${entry.named ? th.clinic.named : th.clinic.unnamed}`

/**
 * A visitor shows a code; staff type it in and are told what it means. The clinic keeps a
 * tally per code, never a list of people. Counting says so and can be undone, because the
 * tally itself stays hidden while it is under 10.
 */
export function FastTrack() {
  const { fastTrackTally } = usePartyStore(clinic)
  usePartyStore(demo)
  const week = currentWeek()
  const all = weeklyCodes(week)
  const [text, setText] = useState('')
  const [looked, setLooked] = useState<string | null>(null)
  const [counted, setCounted] = useState(false)
  const entry = all.find((e) => e.code === looked)

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[24px] font-semibold">{th.clinic.nav.fastTrack}</h1>
        <p className="text-[13px] text-muted">{week}</p>
      </header>

      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setLooked(text.trim().toUpperCase())
            setCounted(false)
          }}
        >
          <label htmlFor="fast-track-lookup" className="mb-1 block font-semibold">
            {th.clinic.lookup}
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="fast-track-lookup"
              aria-label={th.clinic.lookupInput}
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoComplete="off"
              className="min-h-11 min-w-0 flex-1 rounded-md border-2 border-ink bg-bg px-3 text-[17px] font-semibold uppercase tracking-widest"
            />
            <Button type="submit" disabled={text.trim() === ''}>
              {th.clinic.lookupCheck}
            </Button>
          </div>
        </form>
        {looked !== null &&
          (entry ? (
            <div role="status" className="mt-3 rounded-md bg-care-soft p-3">
              <p className="font-semibold">
                {th.group[entry.group]} · {describe(entry)}
              </p>
              {counted ? (
                <p className="mt-2 flex flex-wrap items-center gap-2 font-medium">
                  <Check size={18} strokeWidth={2} aria-hidden="true" />
                  {th.clinic.tallied}
                  <Button
                    variant="secondary"
                    onClick={() => {
                      untallyFastTrack(entry.code)
                      setCounted(false)
                    }}
                  >
                    {th.clinic.undo}
                  </Button>
                </p>
              ) : (
                <Button
                  className="mt-2"
                  onClick={() => {
                    tallyFastTrack(entry.code)
                    setCounted(true)
                  }}
                >
                  {th.clinic.tallyOne}
                </Button>
              )}
            </div>
          ) : (
            <p role="alert" className="mt-3 rounded-md border border-ink px-3 py-2 font-medium">
              {th.clinic.lookupNone}
            </p>
          ))}
      </Card>

      <section>
        <h2 className="mb-2 text-[17px] font-semibold">{th.clinic.weekCodes}</h2>
        <div className="space-y-3">
          {GROUPS.map((group) => (
            <div key={group} className="box p-4">
              <h3 className="mb-2 font-semibold">{th.group[group]}</h3>
              <ul className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                {all
                  .filter((e) => e.group === group)
                  .map((e) => (
                    <li key={e.code}>
                      <p className="text-[13px] text-muted">{describe(e)}</p>
                      <p className="text-[20px] font-semibold tracking-[0.2em] text-care-ink">{e.code}</p>
                      <p className="text-[13px] text-muted">
                        {th.clinic.tallyCount}: {underK(fastTrackTally[e.code] ?? 0)}
                      </p>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
