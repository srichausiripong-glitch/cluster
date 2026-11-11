import { Clock, Phone } from 'lucide-react'
import { th } from '../copy/th'
import { Banner } from '../design/primitives/Banner'
import { Card } from '../design/primitives/Card'
import { CARE_POINTS } from '../store/seed'

export function HelpNow() {
  const pepPoints = CARE_POINTS.filter((p) => p.pep)
  return (
    <main className="space-y-4 p-4">
      <h1 className="text-[20px] font-semibold">{th.help.title}</h1>

      <section className="rounded-md bg-urgent p-4 text-white">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold">
          <Clock size={20} strokeWidth={1.75} aria-hidden="true" />
          {th.help.pepTitle}
        </h2>
        <p className="mt-1 text-white/85">{th.help.pepBody}</p>
        <div className="mt-3 space-y-2">
          {pepPoints.map((p) => (
            <div key={p.id} className="rounded-sm bg-white/10 px-3 py-2">
              <p className="font-semibold">{p.name}</p>
              <p className="text-[13px] text-white/85">
                {p.hours} · {th.care.verified} {p.verified}
              </p>
            </div>
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
    </main>
  )
}
