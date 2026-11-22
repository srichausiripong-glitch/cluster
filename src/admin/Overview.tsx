import { formatThaiDay, formatThaiWeek } from '../copy/format'
import { th } from '../copy/th'
import { NOTE } from '../design/look'
import { districtLabel } from '../domain/districts'
import { bangkokDay, shiftWeek } from '../domain/weeks'

/** The four kinds the server counts, in the order the map's own wording takes them. */
const KINDS = ['tested', 'gono_chlam', 'syphilis', 'symptoms'] as const
/** Twelve weeks: as long as the server keeps a count. */
const WEEKS = 12
const num = new Intl.NumberFormat('th-TH')

/** What the overview reads from the back office's state; every part is absent from a server older than it. */
export interface OverviewData {
  week?: string
  envelopes: { week: string; n: number }[]
  city?: { week: string; kind: string; n: number }[]
  districts?: { week: string; zone: string; kind: string; n: number }[]
  followers?: number
  lastPublished?: { week: string; publishedAt: string | null; shown: string[] } | null
}

/** A kind's name in pieces kept whole, so a narrow column wraps between them and never inside a Thai word. */
function KindName({ kind, stacked = false }: { kind: string; stacked?: boolean }) {
  const pieces: readonly string[] = th.admin.kinds[kind as keyof typeof th.admin.kinds] ?? [kind]
  return (
    <>
      {pieces.map((piece, i) => (
        <span key={piece}>
          {i > 0 && ' '}
          <span className={`${stacked ? 'block' : 'inline-block'} whitespace-nowrap`}>{piece}</span>
        </span>
      ))}
    </>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border-2 border-ink p-3">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="text-[24px] font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[13px] text-muted">{sub}</p>}
    </div>
  )
}

/**
 * The back office's overview (owner, 22 Nov 2026), from totals the server already keeps: phones that
 * used the app each week (each sends one envelope a week), the city's reports by kind, districts at ten
 * or more (the server sends no smaller district count, as the map shows none), followers, the last map.
 */
export function Overview({ data }: { data: OverviewData }) {
  const envelopes = data.envelopes.slice(0, WEEKS)
  const week = data.week ?? envelopes[0]?.week
  const sent = (w: string | undefined) => (w ? (data.envelopes.find((e) => e.week === w)?.n ?? 0) : 0)
  const lastWeek = week ? shiftWeek(week, -1) : undefined
  const most = Math.max(1, ...envelopes.map((e) => e.n))
  const city = data.city ?? []
  const cityWeeks = [...new Set(city.map((c) => c.week))].slice(0, WEEKS)
  const cityCount = (w: string, kind: string) => city.find((c) => c.week === w && c.kind === kind)?.n ?? 0
  const districts = data.districts ?? []
  const published = data.lastPublished

  return (
    <section aria-label={th.admin.overview} className="box space-y-4 p-4">
      <h2 className="font-bold">{th.admin.overview}</h2>
      <div className="grid gap-2 sm:grid-cols-3">
        <Stat label={th.admin.devicesLast} value={num.format(sent(lastWeek))} sub={th.admin.devicesBefore.replace('{n}', num.format(sent(lastWeek && shiftWeek(lastWeek, -1))))} />
        <Stat label={th.admin.followers} value={num.format(data.followers ?? 0)} />
        <Stat
          label={th.admin.lastPublished}
          value={published?.publishedAt ? formatThaiDay(bangkokDay(new Date(published.publishedAt))) : th.admin.notPublished}
          sub={published ? th.admin.shownCount.replace('{n}', String(published.shown.length)) : undefined}
        />
      </div>

      <div>
        <h3 className="font-semibold">{th.admin.devicesTitle}</h3>
        <p className="text-[13px] text-muted">{th.admin.devicesNote}</p>
        <table aria-label={th.admin.devicesTitle} className="mt-2 w-full text-left text-[14px]">
          <tbody>
            {envelopes.map((e) => {
              const unfinished = e.week === week
              return (
                <tr key={e.week} className="border-b border-line last:border-0">
                  <td className="w-28 py-1.5 pr-2 align-top">
                    {formatThaiWeek(e.week)}
                    {unfinished && <span className="block text-[12px] text-muted">{th.admin.thisWeek}</span>}
                  </td>
                  <td className="py-1.5 align-middle" aria-hidden="true">
                    <div className={`h-3 rounded-r-[4px] ${unfinished ? 'bg-muted' : 'bg-ink'}`} style={{ width: `${(e.n / most) * 100}%`, minWidth: e.n > 0 ? 2 : 0 }} />
                  </td>
                  <td className="w-16 py-1.5 pl-2 text-right font-bold tabular-nums">{num.format(e.n)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="font-semibold">{th.admin.cityTitle}</h3>
        {cityWeeks.length === 0 ? (
          <p className="text-muted">{th.admin.cityNone}</p>
        ) : (
          <div className="overflow-x-auto">
            <table aria-label={th.admin.cityTitle} className="mt-2 w-full text-left text-[14px]">
              <thead>
                <tr className="border-b-2 border-ink text-[13px]">
                  <th scope="col" className="py-1 pr-2 font-semibold">
                    {th.admin.week}
                  </th>
                  {KINDS.map((kind) => (
                    <th key={kind} scope="col" className="px-1 py-1 text-right font-semibold">
                      <KindName kind={kind} stacked />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cityWeeks.map((w) => (
                  <tr key={w} className="border-b border-line last:border-0">
                    <td className="py-1 pr-2 whitespace-nowrap">{formatThaiWeek(w)}</td>
                    {KINDS.map((kind) => (
                      <td key={kind} className="px-1 py-1 text-right tabular-nums">
                        {num.format(cityCount(w, kind))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold">{th.admin.districtsTitle}</h3>
        {districts.length === 0 ? (
          <p className="text-muted">{th.admin.districtsNone}</p>
        ) : (
          <div className="overflow-x-auto">
            <table aria-label={th.admin.districtsTitle} className="mt-2 w-full text-left text-[14px]">
              <thead>
                <tr className="border-b-2 border-ink text-[13px]">
                  <th scope="col" className="py-1 pr-2 font-semibold">
                    {th.admin.week}
                  </th>
                  <th scope="col" className="py-1 pr-2 font-semibold">
                    {th.admin.district}
                  </th>
                  <th scope="col" className="py-1 pr-2 font-semibold">
                    {th.admin.kind}
                  </th>
                  <th scope="col" className="py-1 text-right font-semibold">
                    {th.admin.count}
                  </th>
                </tr>
              </thead>
              <tbody>
                {districts.map((d) => (
                  <tr key={`${d.week}-${d.zone}-${d.kind}`} className="border-b border-line last:border-0">
                    <td className="py-1 pr-2 whitespace-nowrap">{formatThaiWeek(d.week)}</td>
                    <td className="py-1 pr-2">{districtLabel(d.zone) || d.zone}</td>
                    <td className="py-1 pr-2">
                      <KindName kind={d.kind} />
                    </td>
                    <td className="py-1 text-right font-bold tabular-nums">{num.format(d.n)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className={`p-2 text-[13px] ${NOTE}`}>{th.admin.countsNote}</p>
    </section>
  )
}
