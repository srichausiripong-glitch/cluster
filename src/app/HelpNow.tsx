import { Clock, Phone } from 'lucide-react'
import { useState } from 'react'
import { clinical } from '../copy/clinical'
import { th } from '../copy/th'
import { PRESS, TEXT_LINK } from '../design/look'
import { Card } from '../design/primitives/Card'
import { More } from './More'
import { CARE_POINTS, orderedCarePoints } from '../data/carePoints'
import { CarePointRow } from './CarePointRow'
import { CarePointSheet } from './CarePointSheet'
import { Guidance } from './Guidance'
import { Go } from './Go'

export function HelpNow() {
  const [pointId, setPointId] = useState<string | null>(null)
  // Confirmed places first; one not yet confirmed still shows, marked to call first (plan decision 7).
  const pepPoints = orderedCarePoints().filter((p) => p.pep)
  return (
    <main className="space-y-4 p-4">
      <h1 className="text-[20px] font-bold">{th.help.title}</h1>

      <section className="rounded-md bg-urgent p-4 text-white">
        {/* The block where time matters stays black with white words; its title is yellow. */}
        <h2 className="flex items-center gap-2 text-[17px] font-bold text-yellow">
          <Clock size={20} strokeWidth={2} aria-hidden="true" />
          {th.help.pepTitle}
        </h2>
        <p data-clinical="help.pep" className="mt-1 text-white/85">
          {clinical('help.pep').text}
        </p>
        <div className="mt-3 space-y-2">
          {pepPoints.map((p) => (
            <CarePointRow key={p.id} point={p} tone="dark" onOpen={() => setPointId(p.id)} />
          ))}
        </div>
        <Guidance ids={['help.pep']} tone="dark" />
      </section>

      <Card>
        <h2 className="mb-1 text-[17px] font-bold">{th.help.mpoxTitle}</h2>
        <p data-clinical="help.mpoxVaccine" className="text-muted">
          {clinical('help.mpoxVaccine').text}
        </p>
        <Guidance ids={['help.mpoxVaccine']} />
      </Card>

      <More summary={th.help.exitMore}>
        <p>{th.help.historyNote}</p>
      </More>
      <p className="flex flex-wrap gap-x-4 text-[13px]">
        <Go to="/privacy" className={TEXT_LINK}>
          {th.privacy.title}
        </Go>
        <Go to="/terms" className={TEXT_LINK}>
          {th.terms.title}
        </Go>
        <span>
          <a href="https://openmoji.org" target="_blank" rel="noreferrer" className={TEXT_LINK}>
            {th.help.emojiCredit}
          </a>
          {' · '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className={TEXT_LINK}>
            {th.help.emojiLicense}
          </a>
        </span>
        <span>
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className={TEXT_LINK}>
            {th.help.creditOsm}
          </a>
          {' · '}
          <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noreferrer" className={TEXT_LINK}>
            {th.help.creditOsmLicense}
          </a>
        </span>
        <a href="https://data.bangkok.go.th" target="_blank" rel="noreferrer" className={TEXT_LINK}>
          {th.help.creditBma}
        </a>
      </p>

      <section>
        <h2 className="mb-2 text-[17px] font-bold">{th.help.hotlines}</h2>
        <div className="space-y-3">
          {th.help.lines.map((line) => (
            <a key={line.number} href={`tel:${line.number}`} className={`box flex min-h-14 items-center gap-3 px-4 ${PRESS}`}>
              <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-leaf">
                <Phone size={16} strokeWidth={2.25} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-bold">
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
