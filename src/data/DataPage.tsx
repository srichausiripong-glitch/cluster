import { th } from '../copy/th'
import { Wordmark } from '../design/Wordmark'
import { LedgerTimeline } from './LedgerTimeline'
import { StoreInspector } from './StoreInspector'

const PARTIES = ['phone', 'clinic', 'operator', 'public'] as const
type Level = keyof typeof th.data.levels

/** How much a party knows, as a shape: full, half, empty, or a dash for "does not apply". Never colour alone. */
function LevelMark({ level }: { level: Level }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="mt-0.5 shrink-0">
      {level === 'na' ? (
        <line x1="4" y1="9" x2="14" y2="9" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <>
          <circle cx="9" cy="9" r="7" fill={level === 'yes' ? 'var(--color-ink)' : 'none'} stroke="var(--color-ink)" strokeWidth="2" />
          {level === 'partly' && <path d="M9 2a7 7 0 0 0 0 14Z" fill="var(--color-ink)" />}
        </>
      )}
    </svg>
  )
}

export function WhoKnowsTable() {
  return (
    <section>
      <h2 className="mb-2 text-[20px] font-semibold">{th.data.whoKnows}</h2>
      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table aria-label={th.data.whoKnows} className="w-full min-w-[680px] text-left text-[15px]">
          <thead>
            <tr className="border-b border-line text-[13px] text-muted">
              {th.data.whoKnowsCols.map((col) => (
                <th key={col} scope="col" className="px-4 py-3 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {th.data.whoKnowsRows.map((row) => (
              <tr key={row.who} className="border-b border-line align-top last:border-0">
                <th scope="row" className="px-4 py-3 font-semibold">
                  {row.who}
                </th>
                {row.cells.map(([level, why], i) => (
                  <td key={i} data-level={level} className="px-4 py-3">
                    <span className="flex items-start gap-2">
                      <LevelMark level={level} />
                      <span>
                        <span data-testid="level" className={level === 'no' || level === 'na' ? 'text-muted' : 'font-semibold'}>
                          {th.data.levels[level]}
                        </span>
                        {why && <span className="block text-[13px] text-muted">{why}</span>}
                      </span>
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[13px] text-muted">{th.data.limit}</p>
    </section>
  )
}

export function DataPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      <header>
        <Wordmark size={18} />
        <h1 className="mt-2 text-[24px] font-semibold">{th.data.title}</h1>
        <p className="max-w-2xl text-muted">{th.data.lead}</p>
      </header>
      <WhoKnowsTable />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {PARTIES.map((party) => (
          <StoreInspector key={party} party={party} />
        ))}
      </div>
      <LedgerTimeline />
    </main>
  )
}
