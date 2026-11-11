import type { ReactNode } from 'react'

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto h-[clamp(560px,calc(100dvh_-_230px),780px)] w-[390px] max-w-full overflow-hidden rounded-[44px] border-[10px] border-ink bg-bg shadow-float">
      {children}
    </div>
  )
}
