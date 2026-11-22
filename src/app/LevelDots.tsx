/** A level as dots out of three (●●○), named in words for whoever cannot see them (redesign spec 5.7). Never a count. */
export function LevelDots({ level, label }: { level: 1 | 2 | 3; label: string }) {
  return (
    <span role="img" aria-label={label} className="inline-flex items-center gap-1">
      {[1, 2, 3].map((i) => (
        <span key={i} data-filled={i <= level ? '' : undefined} className={`size-2.5 rounded-full border-[1.5px] border-ink ${i <= level ? 'bg-ink' : 'bg-surface'}`} />
      ))}
    </span>
  )
}
