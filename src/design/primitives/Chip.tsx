import type { ReactNode } from 'react'

const TONE = {
  care: 'bg-care-soft text-care',
  signal: 'bg-signal-1 text-signal-edge',
  neutral: 'border border-line bg-surface text-muted',
} as const

export function Chip({ tone = 'neutral', children }: { tone?: keyof typeof TONE; children: ReactNode }) {
  return (
    <span className={`inline-flex min-h-7 items-center gap-1 rounded-full px-3 text-[13px] font-medium ${TONE[tone]}`}>
      {children}
    </span>
  )
}
