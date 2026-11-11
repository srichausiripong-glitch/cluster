import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import { th } from '../copy/th'
import { Chip } from '../design/primitives/Chip'
import { Sheet } from '../design/primitives/Sheet'
import type { CarePoint } from '../store/seed'
import { carePointType, zoneName } from './CarePointRow'

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export function CarePointSheet({ point, onClose }: { point: CarePoint | null; onClose: () => void }) {
  if (!point) return null
  return (
    <Sheet open onClose={onClose} title={point.name}>
      <div className="mb-3 flex flex-wrap gap-2">
        <Chip tone="care">{carePointType(point)}</Chip>
        {point.pep && <Chip tone="care">{th.care.pep}</Chip>}
      </div>
      <dl className="space-y-2 rounded-md border-2 border-ink bg-bg p-3 text-[15px]">
        <Row label={th.care.place} value={zoneName(point.zoneId)} />
        {point.klass === 'A' && (
          <>
            {point.services && <Row label={th.care.services} value={point.services.join(' · ')} />}
            {point.hours && <Row label={th.care.hours} value={point.hours} />}
            {point.cost && <Row label={th.care.cost} value={<Chip tone="free">{point.cost}</Chip>} />}
            {point.verified && <Row label={th.care.verified} value={point.verified} />}
          </>
        )}
      </dl>
      {point.klass === 'B' && (
        <div className="mt-3 space-y-2 rounded-md border-2 border-ink bg-bg p-3">
          <p className="text-muted">{th.care.klassBNote}</p>
          <p className="inline-flex items-center gap-2 font-semibold text-ink">
            <ExternalLink size={18} strokeWidth={1.75} aria-hidden="true" />
            {th.care.linkOut}
          </p>
        </div>
      )}
    </Sheet>
  )
}
