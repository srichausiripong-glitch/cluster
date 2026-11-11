import { th } from '../copy/th'
import { Wordmark } from '../design/Wordmark'
import { LedgerTimeline } from './LedgerTimeline'
import { StoreInspector } from './StoreInspector'

const PARTIES = ['phone', 'clinic', 'operator', 'public'] as const

export function WhoKnowsTable() {
  return (
    <section>
      <h2 className="mb-2 text-[20px] font-semibold">{th.data.whoKnows}</h2>
      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-[640px] text-left text-[15px]">
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
              <tr key={row[0]} className="border-b border-line align-top last:border-0">
                <th scope="row" className="px-4 py-3 font-semibold">
                  {row[0]}
                </th>
                {row.slice(1).map((cell, i) => (
                  <td key={i} className="px-4 py-3">
                    {cell}
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {PARTIES.map((party) => (
          <StoreInspector key={party} party={party} />
        ))}
      </div>
      <LedgerTimeline />
      <WhoKnowsTable />
    </main>
  )
}
