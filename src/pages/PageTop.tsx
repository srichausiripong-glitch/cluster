import { ArrowLeft } from 'lucide-react'
import { Go } from '../app/Go'
import { QuickExit } from '../app/QuickExit'
import { th } from '../copy/th'
import { Logo } from '../design/Logo'

/** The top of a page outside the app shell: the mark, a way back into the app, and the quick exit (spec 5.3). */
export function PageTop() {
  return (
    <div className="flex items-center justify-between gap-2">
      <Logo size={18} />
      <div className="flex items-center gap-1">
        <Go to="/app" className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-[13px] font-semibold text-ink hover:bg-surface">
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          {th.common.backToApp}
        </Go>
        <QuickExit />
      </div>
    </div>
  )
}
