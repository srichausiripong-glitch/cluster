export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-start gap-2" aria-label={`ขั้นที่ ${current + 1} จาก ${steps.length}`}>
      {steps.map((label, i) => (
        <li key={label} className="flex min-w-0 flex-1 flex-col gap-1" aria-current={i === current ? 'step' : undefined}>
          <span className={`h-2 rounded-full border-[1.5px] border-ink ${i <= current ? 'bg-care' : 'bg-surface'}`} />
          <span className={`truncate text-[12px] ${i === current ? 'font-bold text-ink' : 'text-muted'}`}>{label}</span>
        </li>
      ))}
    </ol>
  )
}
