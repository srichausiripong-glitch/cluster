import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode }

/**
 * Bottom sheet. The page behind stays visible, as on a navigation map. Focus moves to the
 * close button when it opens, Escape closes it, and focus returns to whatever opened it.
 */
export function Sheet({ open, onClose, title, children }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  useEffect(() => {
    if (!open) return
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
      <div className="absolute inset-0 bg-ink/25" onClick={onClose} aria-hidden="true" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-in relative z-10 max-h-[84dvh] w-full overflow-y-auto rounded-t-lg bg-surface px-4 pb-6 pt-2 shadow-float"
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 className="pt-1 text-[17px] font-semibold">{title}</h2>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label="ปิดแผ่นนี้"
            className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-bg"
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
