import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { th } from '../copy/th'

/** Title row for a full-screen flow. `onBack` steps back inside the flow; otherwise it returns to `backTo`. */
export function FlowHeader({ title, onBack, backTo }: { title: string; onBack?: () => void; backTo: string }) {
  const cls = 'grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-surface'
  const icon = <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
  return (
    <div className="mb-3 flex items-center gap-1">
      {onBack ? (
        <button type="button" onClick={onBack} aria-label={th.common.back} className={cls}>
          {icon}
        </button>
      ) : (
        <Link to={backTo} aria-label={th.common.back} className={cls}>
          {icon}
        </Link>
      )}
      <h1 className="text-[20px] font-semibold">{title}</h1>
    </div>
  )
}

/** A large choice row. The accessible name is the label alone; the hint is extra. */
export function Choice({ label, hint, onClick, selected }: { label: string; hint?: string; onClick: () => void; selected?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onClick}
      className={`flex min-h-16 w-full flex-col items-start justify-center rounded-md border px-4 py-2 text-left transition active:scale-[0.99] ${selected ? 'border-care bg-care-soft' : 'border-line bg-surface hover:border-care'}`}
    >
      <span className="font-semibold">{label}</span>
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </button>
  )
}

/** A checkbox whose label text is exactly `label`; the hint sits outside the label. */
export function Check({ id, label, hint, checked, onChange, disabled }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={`rounded-md border border-line bg-surface px-4 py-3 ${disabled ? 'opacity-60' : ''}`}>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 font-medium">
        <input id={id} type="checkbox" className="size-5 shrink-0 accent-[var(--color-care)]" checked={checked} disabled={disabled} aria-describedby={hint ? `${id}-hint` : undefined} onChange={(e) => onChange(e.target.checked)} />
        <span>{label}</span>
      </label>
      {hint && (
        <p id={`${id}-hint`} className="pl-8 text-[13px] text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
