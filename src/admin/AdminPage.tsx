import { useEffect, useState, type FormEvent } from 'react'
import { th } from '../copy/th'
import { ALERT, NOTE } from '../design/look'
import { Button } from '../design/primitives/Button'
import { Card } from '../design/primitives/Card'
import { CARE_POINTS } from '../data/carePoints'
import { usePharmacies } from '../data/pharmacies'
import { DISTRICT_IDS, districtLabel } from '../domain/districts'

interface State {
  intakeOpen: boolean
  envelopes: { week: string; n: number }[]
  held: { id: number; zone: string; kind: string; week: string; n: number; status: string; first_reviewer: string | null; first_choice: string | null }[]
  suspensions: { id: number; zone: string; reason: string; started: string; ended: string | null }[]
  harm: { week: string; kind: string; n: number }[]
  /** Absent from a server older than this page. */
  places?: { week: string; place: string; kind: string; value: string; n: number }[]
}
const zoneName = (id: string) => districtLabel(id) || id
const ask = (body: Record<string, unknown>) => fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const input = 'min-h-11 w-full rounded-md border-2 border-ink bg-bg px-3'

/** The back office (v1 spec 6): totals only, every action logged with the reviewer's name. No link leads here. */
export function AdminPage() {
  const [state, setState] = useState<State | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [zone, setZone] = useState<string>(DISTRICT_IDS[0])
  const [reason, setReason] = useState('')
  // The pharmacies are a file of their own, read only when a correction is about one.
  const pharmacies = usePharmacies((state?.places ?? []).some((r) => r.place.startsWith('osm-')))
  const placeOf = (id: string) => CARE_POINTS.find((p) => p.id === id) ?? pharmacies.points.find((p) => p.id === id)

  const refresh = async () => {
    const res = await ask({ action: 'state' }).catch(() => null)
    setState(res?.ok ? ((await res.json()) as State) : null)
  }
  useEffect(() => {
    void refresh()
  }, [])
  const act = async (body: Record<string, unknown>) => {
    const res = await ask(body).catch(() => null)
    setFailed(res?.ok ? null : th.admin.failed)
    await refresh()
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const res = await ask({ action: 'login', name, password }).catch(() => null)
    setPassword('')
    if (!res?.ok) return setFailed(th.admin.loginFailed)
    setFailed(null)
    await refresh()
  }

  if (!state) {
    return (
      <main className="mx-auto w-full max-w-sm space-y-4 p-6">
        <h1 className="text-[24px] font-bold">{th.admin.title}</h1>
        <form onSubmit={submit} className="box space-y-3 p-4">
          <label className="block text-[13px] font-semibold">
            {th.admin.name}
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" />
          </label>
          <label className="block text-[13px] font-semibold">
            {th.admin.password}
            <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          <Button type="submit" className="w-full">
            {th.admin.login}
          </Button>
          {failed && <p role="alert" className={`px-3 py-2 text-[13px] font-semibold ${ALERT}`}>{failed}</p>}
        </form>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 p-4 md:p-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-[24px] font-bold">{th.admin.title}</h1>
        <Button variant="secondary" onClick={() => void act({ action: 'logout' }).then(() => setState(null))}>
          {th.admin.logout}
        </Button>
      </header>
      {failed && <p role="alert" className={`px-3 py-2 text-[13px] font-semibold ${ALERT}`}>{failed}</p>}

      <Card>
        <h2 className="font-bold">{th.admin.intake}</h2>
        <p className="mt-1">{state.intakeOpen ? th.admin.intakeOpen : th.admin.intakeClosed}</p>
        <Button className="mt-2" onClick={() => void act({ action: 'intake', open: !state.intakeOpen })}>
          {state.intakeOpen ? th.admin.closeIntake : th.admin.openIntake}
        </Button>
      </Card>

      <section aria-label={th.admin.held} className="box space-y-3 p-4">
        <h2 className="font-bold">{th.admin.held}</h2>
        <p className={`p-2 text-[13px] ${NOTE}`}>{th.admin.heldRule}</p>
        {state.held.filter((h) => h.status === 'pending').length === 0 && <p className="text-muted">{th.admin.heldNone}</p>}
        <ul className="space-y-2">
          {state.held
            .filter((h) => h.status === 'pending')
            .map((h) => (
              <li key={h.id} className="rounded-md border-2 border-ink p-3">
                <p className="font-semibold">
                  {zoneName(h.zone)} · {h.kind} · {h.week} · {h.n}
                </p>
                {h.first_reviewer && (
                  <p className="text-[13px] text-muted">{th.admin.heldFirst.replace('{name}', h.first_reviewer).replace('{choice}', h.first_choice === 'release' ? th.admin.release : th.admin.discard)}</p>
                )}
                <div className="mt-2 flex gap-2">
                  <Button onClick={() => void act({ action: 'held', id: h.id, choice: 'release' })}>{th.admin.release}</Button>
                  <Button variant="secondary" onClick={() => void act({ action: 'held', id: h.id, choice: 'discard' })}>
                    {th.admin.discard}
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      </section>

      <section aria-label={th.admin.suspensions} className="box space-y-3 p-4">
        <h2 className="font-bold">{th.admin.suspensions}</h2>
        <ul className="space-y-2">
          {state.suspensions
            .filter((s) => !s.ended)
            .map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border-2 border-ink p-3">
                <span>
                  {zoneName(s.zone)} · {s.reason} · {String(s.started).slice(0, 10)}
                </span>
                <Button variant="secondary" onClick={() => void act({ action: 'unsuspend', id: s.id })}>
                  {th.admin.lift}
                </Button>
              </li>
            ))}
        </ul>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void act({ action: 'suspend', zone, reason }).then(() => setReason(''))
          }}
        >
          <label className="text-[13px] font-semibold">
            {th.admin.suspend}
            <select className={input} value={zone} onChange={(e) => setZone(e.target.value)}>
              {DISTRICT_IDS.map((id) => (
                <option key={id} value={id}>
                  {zoneName(id)}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-48 flex-1 text-[13px] font-semibold">
            {th.admin.reason}
            <input className={input} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
          </label>
          <Button type="submit" disabled={!reason.trim()}>
            {th.admin.suspend}
          </Button>
        </form>
      </section>

      <section aria-label={th.admin.places} className="box p-4">
        <h2 className="mb-2 font-bold">{th.admin.places}</h2>
        <table className="w-full text-left text-[14px]">
          <tbody>
            {(state.places ?? []).map((r) => {
              const place = placeOf(r.place)
              return (
                <tr key={`${r.week}-${r.place}-${r.kind}-${r.value}`} className="border-b border-line last:border-0">
                  <td className="py-1">{r.week}</td>
                  <td className="py-1">
                    {/* The code stays beside the name: overrides.json is keyed by it. */}
                    {place && (
                      <span className="block">
                        {place.name}
                        {place.districtId && ` · ${zoneName(place.districtId)}`}
                      </span>
                    )}
                    <span className={place ? 'block text-[12px] break-all text-muted' : 'block break-all'}>{r.place}</span>
                  </td>
                  <td className="py-1">
                    {th.placeReport.kinds[r.kind as keyof typeof th.placeReport.kinds] ?? r.kind}
                    {r.value && <span className="block tabular-nums">{r.value}</span>}
                  </td>
                  <td className="py-1 text-right font-bold tabular-nums">{r.n}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section aria-label={th.admin.harm} className="box p-4">
        <h2 className="mb-2 font-bold">{th.admin.harm}</h2>
        <table className="w-full text-left text-[14px]">
          <tbody>
            {state.harm.map((h) => (
              <tr key={`${h.week}-${h.kind}`} className="border-b border-line last:border-0">
                <td className="py-1">{h.week}</td>
                <td className="py-1">{th.harm.kinds[h.kind as keyof typeof th.harm.kinds] ?? h.kind}</td>
                <td className="py-1 text-right font-bold tabular-nums">{h.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-label={th.admin.envelopes} className="box p-4">
        <h2 className="mb-2 font-bold">{th.admin.envelopes}</h2>
        <ul className="space-y-1 text-[14px]">
          {state.envelopes.map((e) => (
            <li key={e.week} className="flex justify-between">
              <span>{e.week}</span>
              <span className="font-bold tabular-nums">{e.n}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
