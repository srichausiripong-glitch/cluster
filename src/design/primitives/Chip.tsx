import type { ReactNode } from 'react'

/** Text on pink, yellow and green is always black; white text sits only on black and violet. */
const TONE = {
  care: 'bg-care text-ink',
  signal: 'bg-signal text-white',
  neutral: 'bg-surface text-ink',
  free: 'bg-leaf text-ink',
  now: 'bg-yellow text-ink',
} as const

export function Chip({ tone = 'neutral', small = false, children }: { tone?: keyof typeof TONE; small?: boolean; children: ReactNode }) {
  const sizing = small ? 'min-h-[22px] gap-0.5 px-2 text-[12px] font-bold' : 'min-h-7 gap-1 px-3 text-[13px] font-medium'
  return <span className={`inline-flex items-center rounded-full border-[1.5px] border-ink ${sizing} ${TONE[tone]}`}>{children}</span>
}
