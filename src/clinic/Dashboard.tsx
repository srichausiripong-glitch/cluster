import { th } from '../copy/th'
import { Card } from '../design/primitives/Card'
import { Chip } from '../design/primitives/Chip'
import { usePartyStore } from '../store/partyStore'
import { clinic } from '../store/stores'
import { underK } from './format'

export function Dashboard() {
  const { codes } = usePartyStore(clinic)
  const flagged = codes.filter((c) => c.positiveGroup).length
  const consented = codes.filter((c) => c.positiveGroup && c.cityConsent).length
  const stats = [
    [th.clinic.reconcile.issued, codes.length],
    [th.clinic.reconcile.flagged, flagged],
    [th.clinic.reconcile.consented, consented],
  ] as const
  return (
    <div className="space-y-5">
      <h1 className="text-[24px] font-semibold">{th.clinic.nav.home}</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map(([label, n]) => (
          <Card key={label}>
            <p className="text-[13px] text-muted">{label}</p>
            <p className="text-[20px] font-semibold">{underK(n)}</p>
          </Card>
        ))}
      </div>
      <section>
        <h2 className="mb-2 text-[17px] font-semibold">{th.clinic.codes}</h2>
        {codes.length === 0 ? (
          <Card>
            <p className="text-muted">{th.data.empty}</p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-md border border-line bg-surface">
            <table className="w-full min-w-[420px] text-left text-[15px]">
              <tbody>
                {[...codes].reverse().slice(0, 8).map((code) => (
                  <tr key={code.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-semibold tracking-widest">{code.id}</td>
                    <td className="px-4 py-3">{code.positiveGroup ? th.group[code.positiveGroup] : <span className="text-muted">{th.clinic.noResult}</span>}</td>
                    <td className="px-4 py-3">{code.cityConsent ? <Chip tone="care">{th.clinic.consent}</Chip> : <Chip>{th.clinic.noConsent}</Chip>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
