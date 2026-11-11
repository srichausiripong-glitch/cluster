import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode }
/** How long after opening a tap on the veil is taken for the end of a double tap. */
const GUARD_MS = 300

/**
 * Bottom sheet. It takes a little over half the screen and scrolls inside, so the page behind stays
 * visible, as on a navigation map: the map brings what was picked into the part left clear. Focus
 * moves to the close button when it opens, Escape closes it, and focus returns to whatever opened it.
 * A tap on the veil closes it, except in the instant after it opened: that tap is the second half of
 * a double tap on whatever opened the sheet, not a wish to close it.
 */
export function Sheet({ open, onClose, title, children }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const openedAt = useRef(0)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  useEffect(() => {
    if (!open) return
    openedAt.current = performance.now()
    const opener = document.activeElement
    closeButton.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (opener instanceof HTMLElement || opener instanceof SVGElement) opener.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end">
      <div
        data-veil
        className="absolute inset-0 bg-ink/10"
        onClick={() => {
          if (performance.now() - openedAt.current > GUARD_MS) onClose()
        }}
        aria-hidden="true"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-in relative z-10 max-h-[56dvh] w-full overflow-y-auto rounded-t-lg border-t-[2.5px] border-ink bg-surface px-4 pb-6 pt-2"
      >
        <div className="mx-auto mb-2 h-1.5 w-11 rounded-full bg-ink" aria-hidden="true" />
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 className="pt-1 text-[20px] font-bold leading-snug">{title}</h2>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label="ปิดแผ่นนี้"
            className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-care-soft"
          >
            <X size={22} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
