import type { ReactNode } from 'react'

/** `demo` is the strip every page carries; `draft` labels clinical text that no physician has signed. */
export function Banner({ tone, children }: { tone: 'demo' | 'draft'; children: ReactNode }) {
  if (tone === 'demo') {
    return (
      <div role="note" className="bg-ink px-3 py-1 text-center text-[12px] font-semibold tracking-wide text-yellow">
        {children}
      </div>
    )
  }
  return (
    <span role="note" className="inline-flex items-center rounded-sm border-[1.5px] border-ink bg-surface px-2 py-0.5 text-[12px] text-ink">
      {children}
    </span>
  )
}
