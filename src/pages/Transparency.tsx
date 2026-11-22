import { useEffect, useState } from 'react'
import { th } from '../copy/th'
import { ALERT } from '../design/look'
import { Logo } from '../design/Logo'
import { DISTRICTS, districtLabel } from '../domain/districts'

interface Report {
  decisions: { day: string; reviewer: string; action: keyof typeof th.transparency.action; detail: string }[]
  suspensions: { zone: string; reason: string; started: string; ended: string | null }[]
  envelopes: { week: string; n: number }[]
}
const zoneName = (id: string) => districtLabel(id) || id
const withZoneNames = (text: string) => DISTRICTS.reduce((t, d) => t.replace(new RegExp(`\\b${d.id}\\b`, 'g'), `เขต${d.name}`), text)
const date = (d: string | null) => (d ? String(d).slice(0, 10) : '')

/** The public transparency report (v1 spec 6). */
export function Transparency() {
  const [report, setReport] = useState<Report | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    fetch('/api/transparency')
      .then((res) => (res.ok ? (res.json() as Promise<Report>) : Promise.reject(new Error(String(res.status)))))
      .then(setReport, () => setFailed(true))
  }, [])

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 p-4 md:p-6">
      <Logo size={18} />
      <h1 className="text-[24px] font-bold">{th.transparency.title}</h1>
      <p className="text-muted">{th.transparency.lead}</p>
      {failed && <p role="alert" className={`px-3 py-2 font-semibold ${ALERT}`}>{th.transparency.failed}</p>}
      {report && (
        <>
          <section className="box p-4">
            <h2 className="mb-2 font-bold">{th.transparency.decisions}</h2>
            {report.decisions.length === 0 && <p className="text-muted">{th.transparency.none}</p>}
            <ul className="space-y-1 text-[14px]">
              {report.decisions.map((d, i) => (
                <li key={i}>
                  {date(d.day)} · {d.reviewer} · {th.transparency.action[d.action] ?? d.action} · {withZoneNames(d.detail)}
                </li>
              ))}
            </ul>
          </section>
          <section className="box p-4">
            <h2 className="mb-2 font-bold">{th.transparency.suspensions}</h2>
            {report.suspensions.length === 0 && <p className="text-muted">{th.transparency.none}</p>}
            <ul className="space-y-1 text-[14px]">
              {report.suspensions.map((s, i) => (
                <li key={i}>
                  {zoneName(s.zone)} · {s.reason} · {date(s.started)}
                  {s.ended ? ` – ${date(s.ended)}` : ''}
                </li>
              ))}
            </ul>
          </section>
          <section className="box p-4">
            <h2 className="mb-2 font-bold">{th.transparency.envelopes}</h2>
            <ul className="space-y-1 text-[14px]">
              {report.envelopes.map((e) => (
                <li key={e.week} className="flex justify-between">
                  <span>{e.week}</span>
                  <span className="font-bold tabular-nums">{e.n}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  )
}
