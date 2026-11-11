import { useState } from 'react'
import { th } from '../copy/th'
import type { DiseaseGroup, Party } from '../domain/types'
import { usePartyStore } from '../store/partyStore'
import { clinic, operator, phone, pub } from '../store/stores'
import { PartyTag } from './PartyTag'

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))

/** What one party holds right now, in plain words, with the raw store one tap away. */
export function StoreInspector({ party }: { party: Party }) {
  const [raw, setRaw] = useState(false)
  const stores = { phone: usePartyStore(phone), clinic: usePartyStore(clinic), operator: usePartyStore(operator), public: usePartyStore(pub) }
  const L = th.data.lines
  const lines: string[] = []

  if (party === 'phone') {
    const s = stores.phone
    if (s.card) lines.push(fill(L.card, { x: th.group[s.card.group] }))
    if (s.reminders.length) lines.push(fill(L.reminders, { n: s.reminders.length }))
  } else if (party === 'clinic') {
    const s = stores.clinic
    for (const code of s.codes.slice(-6)) {
      const result = code.positiveGroup ? th.group[code.positiveGroup] : th.clinic.noResult
      lines.push(`${fill(L.code, { id: code.id })} · ${result} · ${code.cityConsent ? th.clinic.consent : th.clinic.noConsent}`)
    }
    const tallies = Object.values(s.fastTrackTally).reduce((a, b) => a + b, 0)
    if (tallies) lines.push(fill(L.tally, { n: tallies }))
    if (s.slips.length) lines.push(fill(L.slips, { n: s.slips.length }))
  } else if (party === 'operator') {
    const s = stores.operator
    if (s.connectionLog.length) lines.push(fill(L.log, { n: s.connectionLog.length }))
    for (const batch of s.batches) {
      const parts = (Object.entries(batch.counts) as [DiseaseGroup, number][]).map(([group, n]) => `${th.group[group]} ${n}`)
      lines.push(`${fill(L.batch, { w: batch.week })}: ${parts.join(' · ') || th.data.empty}`)
    }
    if (s.harmReports.length) lines.push(fill(L.harm, { n: s.harmReports.length }))
  } else {
    const file = stores.public.files.at(-1)
    const area = file?.areas.find((a) => a.areaId === 'bkk')
    if (file && area) {
      const detail = area.state === 'shown' ? ` · ${th.map.density[area.density ?? 'thin']} · ${th.map.step[area.step ?? 'mixed']}` : ''
      lines.push(`${fill(L.file, { w: file.week })} ${th.map.state[area.state]}${detail}`)
    }
  }

  return (
    <section role="region" aria-label={th.data.party[party]} className="rounded-md border border-line bg-surface p-4">
      <div className="mb-2">
        <PartyTag party={party} />
      </div>
      {lines.length === 0 ? (
        <p className="text-muted">{th.data.empty}</p>
      ) : (
        <ul className="space-y-1 text-[15px]">
          {lines.map((line) => (
            <li key={line} className="break-words">
              {line}
            </li>
          ))}
        </ul>
      )}
      <button type="button" aria-expanded={raw} onClick={() => setRaw((v) => !v)} className="mt-2 min-h-9 rounded-sm text-[13px] font-medium text-care">
        {th.data.raw}
      </button>
      {raw && <pre className="mt-1 max-h-56 overflow-auto rounded-sm bg-bg p-2 text-[12px] leading-snug">{JSON.stringify(stores[party], null, 2)}</pre>}
    </section>
  )
}
