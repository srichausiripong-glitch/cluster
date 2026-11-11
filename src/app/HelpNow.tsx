import { Clock, Phone } from 'lucide-react'
import { useState } from 'react'
import { th } from '../copy/th'
import { Banner } from '../design/primitives/Banner'
import { Card } from '../design/primitives/Card'
import { CARE_POINTS } from '../store/seed'
import { CarePointRow } from './CarePointRow'
import { CarePointSheet } from './CarePointSheet'

export function HelpNow() {
  const [pointId, setPointId] = useState<string | null>(null)
  const pepPoints = CARE_POINTS.filter((p) => p.pep)
  return (
    <main className="space-y-4 p-4">
      <h1 className="text-[20px] font-semibold">{th.help.title}</h1>

      <section className="rounded-md bg-urgent p-4 text-white">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 text-[17px] font-semibold">
            <Clock size={20} strokeWidth={1.75} aria-hidden="true" />
            {th.help.pepTitle}
          </h2>
          <span role="note" className="rounded-sm border border-white/70 px-2 py-0.5 text-[12px]">
            {th.draftClinical}
          </span>
        </div>
        <p className="mt-1 text-white/85">{th.help.pepBody}</p>
        <div className="mt-3 space-y-2">
          {pepPoints.map((p) => (
            <CarePointRow key={p.id} point={p} tone="dark" onOpen={() => setPointId(p.id)} />
          ))}
        </div>
      </section>

      <Card>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h2 className="text-[17px] font-semibold">{th.help.mpoxTitle}</h2>
          <Banner tone="draft">{th.draftClinical}</Banner>
        </div>
        <p className="text-muted">{th.help.mpoxBody}</p>
      </Card>

      <section>
        <h2 className="mb-2 text-[17px] font-semibold">{th.help.hotlines}</h2>
        <div className="space-y-2">
          {th.help.lines.map((line) => (
            <a key={line.number} href={`tel:${line.number}`} className="flex min-h-14 items-center gap-3 rounded-md border border-line bg-surface px-4">
              <Phone size={18} strokeWidth={1.75} className="shrink-0 text-care" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-semibold">
                  {line.number} <span className="font-normal text-muted">{line.who}</span>
                </span>
                <span className="block text-[13px] text-muted">{line.hours}</span>
              </span>
            </a>
          ))}
        </div>
      </section>
      <CarePointSheet point={CARE_POINTS.find((p) => p.id === pointId) ?? null} onClose={() => setPointId(null)} />
    </main>
  )
}
