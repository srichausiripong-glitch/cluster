import type { ReactNode } from 'react'

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto h-[780px] w-[390px] max-w-full overflow-hidden rounded-[44px] border-[10px] border-ink bg-bg shadow-float">
      {children}
    </div>
  )
}
