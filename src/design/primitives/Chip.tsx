import type { ReactNode } from 'react'

/** Text on pink, yellow and green is always black; white text sits only on black and violet. */
const TONE = {
  care: 'bg-care text-ink',
  signal: 'bg-signal text-white',
  neutral: 'bg-surface text-ink',
  free: 'bg-leaf text-ink',
  now: 'bg-yellow text-ink',
} as const

export function Chip({ tone = 'neutral', children }: { tone?: keyof typeof TONE; children: ReactNode }) {
  return (
    <span className={`inline-flex min-h-7 items-center gap-1 rounded-full border-[1.5px] border-ink px-3 text-[13px] font-medium ${TONE[tone]}`}>
      {children}
    </span>
  )
}
