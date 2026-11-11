import { useState } from 'react'
import { th } from '../copy/th'
import { SOFT } from '../design/look'
import { Button } from '../design/primitives/Button'
import { submitHarmReport } from '../store/actions'
import { useEmbedTo } from './embed'
import { FlowHeader } from './FlowHeader'

const KINDS = ['violence', 'outed', 'coerced', 'false_notice', 'other'] as const

/** Fixed choices only: no free text, so nothing identifying can be typed in by mistake (spec 3.1, 5.8). */
export function HarmReport() {
  const to = useEmbedTo()
  const [kind, setKind] = useState<(typeof KINDS)[number] | null>(null)
  const [sent, setSent] = useState(false)
  return (
    <main className="p-4">
      <FlowHeader title={th.harm.title} backTo={to('/app/me')} />
      {sent ? (
        <p className={`p-4 ${SOFT}`}>{th.harm.thanks}</p>
      ) : (
        <fieldset className="space-y-2">
          <legend className="mb-2 font-bold">{th.harm.ask}</legend>
          {KINDS.map((k) => (
            <label key={k} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border-2 border-ink px-4 font-medium ${kind === k ? 'bg-care-soft' : 'bg-surface'}`}>
              <input type="radio" name="harm" className="size-5 shrink-0 accent-[var(--color-ink)]" checked={kind === k} onChange={() => setKind(k)} />
              {th.harm.kinds[k]}
            </label>
          ))}
          <Button
            size="lg"
            className="mt-3 w-full"
            disabled={!kind}
            onClick={() => {
              if (!kind) return
              submitHarmReport(kind)
              setSent(true)
            }}
          >
            {th.harm.send}
          </Button>
        </fieldset>
      )}
    </main>
  )
}
