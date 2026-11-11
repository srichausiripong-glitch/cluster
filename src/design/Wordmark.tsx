/** Latin wordmark only (spec 18). The mark is a small star cluster: points that gather. */
export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight text-ink" style={{ fontSize: size }}>
      <svg width={size * 1.2} height={size * 1.2} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="8" cy="9" r="3.4" fill="var(--color-care)" />
        <circle cx="16.5" cy="7" r="2.2" fill="var(--color-signal-3)" />
        <circle cx="15" cy="15.5" r="3" fill="var(--color-care)" opacity="0.55" />
        <circle cx="7.5" cy="17.5" r="1.7" fill="var(--color-signal-edge)" />
        <circle cx="20.5" cy="12.5" r="1.3" fill="var(--color-care)" />
      </svg>
      Cluster
    </span>
  )
}
