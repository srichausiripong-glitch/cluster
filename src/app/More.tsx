import { Info } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { NOTE } from '../design/look'

/**
 * A short line that opens its explanation underneath (ⓘ): the few words stay on the screen and the
 * rest waits behind them (redesign spec 5.10).
 */
export function More({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center gap-1.5 text-left text-[13px] font-semibold text-ink"
      >
        <span className="min-w-0">{summary}</span>
        <Info size={16} strokeWidth={2} className="shrink-0" aria-hidden="true" />
      </button>
      {open && (
        <div id={id} className={`mt-1 space-y-1 p-3 text-[13px] ${NOTE}`}>
          {children}
        </div>
      )}
    </div>
  )
}
