import { ArrowLeft } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router-dom'
import { th } from '../copy/th'

/** Title row for a full-screen flow. `onBack` steps back inside the flow; otherwise it returns to `backTo`. */
export function FlowHeader({ title, onBack, backTo }: { title: string; onBack?: () => void; backTo: string }) {
  const cls = 'grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-care-soft'
  const icon = <ArrowLeft size={22} strokeWidth={2} aria-hidden="true" />
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
      <h1 className="text-[20px] font-bold">{title}</h1>
    </div>
  )
}

/** A large choice row. Its name is the label; the hint is read as its description. */
export function Choice({ label, hint, onClick, selected }: { label: string; hint?: string; onClick: () => void; selected?: boolean }) {
  const id = useId()
  return (
    <button
      type="button"
      aria-labelledby={`${id}-label`}
      aria-describedby={hint ? `${id}-hint` : undefined}
      aria-pressed={selected}
      onClick={onClick}
      className={`box flex min-h-16 w-full flex-col items-start justify-center px-4 py-2 text-left shadow-pop transition-[transform,box-shadow] duration-75 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none ${selected ? 'bg-care-soft' : 'hover:bg-care-soft'}`}
    >
      <span id={`${id}-label`} className="font-semibold">
        {label}
      </span>
      {hint && (
        <span id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </span>
      )}
    </button>
  )
}

/** A checkbox whose label text is exactly `label`. The hint stays readable when the box is disabled. */
export function Check({ id, label, hint, checked, onChange, disabled }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="box px-4 py-3">
      <label htmlFor={id} className={`flex min-h-11 items-center gap-3 font-medium ${disabled ? 'cursor-not-allowed text-muted' : 'cursor-pointer'}`}>
        <input id={id} type="checkbox" className="size-5 shrink-0 accent-[var(--color-ink)]" checked={checked} disabled={disabled} aria-describedby={hint ? `${id}-hint` : undefined} onChange={(e) => onChange(e.target.checked)} />
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
