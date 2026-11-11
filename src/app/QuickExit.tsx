import { LogOut } from 'lucide-react'
import { th } from '../copy/th'

/** Leaves at once for a blank page, for when someone looks over a shoulder (spec 9.4). */
export function QuickExit() {
  return (
    <button
      type="button"
      onClick={() => window.location.replace('about:blank')}
      className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-[13px] font-medium text-muted hover:bg-surface"
    >
      <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
      {th.common.quickExit}
    </button>
  )
}
