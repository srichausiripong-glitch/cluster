import { sourcesOf } from '../copy/clinical'
import { th } from '../copy/th'

/**
 * The line that ends a block of clinical advice: general guidance, not a diagnosis, and the pages
 * behind it, each once (2026-11-18 design, decision 2). A link opens only when pressed, in a new tab.
 */
export function Guidance({ ids, tone = 'light' }: { ids: string[]; tone?: 'light' | 'dark' }) {
  const sources = sourcesOf(...ids)
  const quiet = tone === 'dark' ? 'text-white/85' : 'text-muted'
  const link = tone === 'dark' ? 'text-white' : 'text-ink'
  return (
    <p className={`mt-3 text-[12px] leading-relaxed ${quiet}`}>
      {th.guidance.note}
      {sources.length > 0 && (
        <>
          {' · '}
          {th.guidance.sources}{' '}
          {sources.map((s, i) => (
            <span key={s.url}>
              {i > 0 && ', '}
              <a data-source href={s.url} target="_blank" rel="noreferrer" className={`inline-block min-h-6 font-semibold underline underline-offset-4 ${link}`}>
                {s.name}
              </a>
            </span>
          ))}
        </>
      )}
    </p>
  )
}
