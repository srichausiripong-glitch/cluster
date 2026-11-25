import type { ReactNode } from 'react'

/** A phone outline. `acting` rings it when the pitch script's current step happens here. */
export function PhoneFrame({ children, acting = false }: { children: ReactNode; acting?: boolean }) {
  return (
    <div
      className={`relative mx-auto h-[var(--pane-h,clamp(560px,calc(100dvh_-_230px),780px))] w-[390px] max-w-full overflow-hidden rounded-[44px] border-[10px] border-ink bg-bg shadow-pop-lg ${acting ? 'outline-4 outline-offset-4 outline-care' : ''}`}
    >
      {children}
    </div>
  )
}
