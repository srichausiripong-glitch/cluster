import { ExternalLink } from 'lucide-react'
import { th } from '../copy/th'
import { Chip } from '../design/primitives/Chip'
import { Sheet } from '../design/primitives/Sheet'
import type { CarePoint } from '../store/seed'

export function CarePointSheet({ point, onClose }: { point: CarePoint | null; onClose: () => void }) {
  if (!point) return null
  return (
    <Sheet open onClose={onClose} title={point.name}>
      <div className="mb-3 flex flex-wrap gap-2">
        <Chip tone="care">{point.klass === 'A' ? th.care.klassA : th.care.klassB}</Chip>
        {point.pep && <Chip tone="care">{th.care.pep}</Chip>}
        <Chip>{th.common.sample}</Chip>
      </div>
      {point.klass === 'A' ? (
        <dl className="space-y-2 text-[15px]">
          <div>
            <dt className="text-[13px] text-muted">{th.care.services}</dt>
            <dd>{point.services?.join(' · ')}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">{th.care.hours}</dt>
            <dd>{point.hours}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">{th.care.cost}</dt>
            <dd>{point.cost}</dd>
          </div>
          {point.verified && (
            <div>
              <dt className="text-[13px] text-muted">{th.care.verified}</dt>
              <dd>{point.verified}</dd>
            </div>
          )}
        </dl>
      ) : (
        <div className="space-y-2">
          <p className="text-muted">{th.care.klassBNote}</p>
          <p className="inline-flex items-center gap-2 font-medium text-care">
            <ExternalLink size={18} strokeWidth={1.75} aria-hidden="true" />
            {th.care.linkOut}
          </p>
        </div>
      )}
    </Sheet>
  )
}
