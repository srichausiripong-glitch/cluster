import { useState } from 'react'
import { th } from '../copy/th'
import type { DiseaseGroup } from '../domain/types'
import { isoWeek } from '../domain/weeks'
import { Button } from '../design/primitives/Button'
import { Card } from '../design/primitives/Card'
import { sendWeeklyBatch, weeklyCounts } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { clinic } from '../store/stores'

/** Shows exactly what will leave the clinic: counts per disease group, and nothing else. */
export function WeeklyBatch() {
  const { codes } = usePartyStore(clinic)
  const [sent, setSent] = useState(false)
  const week = isoWeek(new Date())
  const counts = Object.entries(weeklyCounts(codes, week)) as [DiseaseGroup, number][]
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-[24px] font-semibold">{th.clinic.nav.batch}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold">{th.clinic.batchLeaves}</h2>
          {counts.length === 0 ? (
            <p className="text-muted">{th.data.empty}</p>
          ) : (
            <dl className="space-y-1">
              {counts.map(([group, n]) => (
                <div key={group} className="flex justify-between gap-3">
                  <dt>{th.group[group]}</dt>
                  <dd className="font-semibold tabular-nums">{n}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-2 text-[13px] text-muted">{week}</p>
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">{th.clinic.batchStays}</h2>
          <p className="text-muted">{th.clinic.batchStaysBody}</p>
        </Card>
      </div>
      <p className="text-[13px] text-muted">{th.data.limit}</p>
      <Button
        size="lg"
        onClick={() => {
          sendWeeklyBatch(week)
          setSent(true)
        }}
      >
        {th.clinic.sendBatch}
      </Button>
      {sent && (
        <p role="status" className="rounded-md bg-care-soft px-4 py-3">
          {th.clinic.batchSent}
        </p>
      )}
    </div>
  )
}
