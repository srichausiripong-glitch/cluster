import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { th } from '../copy/th'
import { LedgerTimeline } from '../data/LedgerTimeline'
import { StoreInspector } from '../data/StoreInspector'
import { isoWeek } from '../domain/weeks'
import { Button } from '../design/primitives/Button'
import { PhoneFrame } from '../design/primitives/PhoneFrame'
import { Wordmark } from '../design/Wordmark'
import { publishWeek, resetDemo, seedDemo } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { demo } from '../store/stores'

const TABS = ['phone', 'clinic', 'data'] as const
type Tab = (typeof TABS)[number]

/** The pitch stage: the user's app, the clinic console and every party's data store, live side by side. */
export function Stage() {
  const { phase } = usePartyStore(demo)
  const [tab, setTab] = useState<Tab>('phone')
  const [step, setStep] = useState(0)
  const pane = (name: Tab) => (tab === name ? '' : 'hidden lg:block')
  const seg = (active: boolean) => `min-h-11 rounded-md px-3 text-[15px] font-medium ${active ? 'bg-ink text-white' : 'border border-line bg-surface text-ink'}`

  return (
    <main className="mx-auto w-full max-w-[1560px] space-y-4 p-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Wordmark size={22} />
          <h1 className="mt-1 text-[24px] font-semibold">{th.stage.title}</h1>
          <p className="max-w-xl text-muted">{th.stage.lead}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={resetDemo}>
            {th.stage.reset}
          </Button>
          <Button variant="secondary" onClick={() => seedDemo('pilot')}>
            {th.stage.seedPilot}
          </Button>
          <Button variant="secondary" onClick={() => seedDemo('threshold')}>
            {th.stage.seedThreshold}
          </Button>
          <span className="flex gap-1" role="group" aria-label={th.stage.phase}>
            {([1, 2] as const).map((p) => (
              <button key={p} type="button" aria-pressed={phase === p} onClick={() => demo.set({ phase: p })} className={seg(phase === p)}>
                {th.stage.phase} {p}
              </button>
            ))}
          </span>
        </div>
      </header>

      <section className="rounded-md border border-line bg-surface p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{th.stage.scriptTitle}</h2>
          <span className="flex gap-2">
            <Button variant="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>
              {th.stage.prev}
            </Button>
            <Button disabled={step === th.stage.script.length - 1} onClick={() => setStep(step + 1)}>
              {th.stage.nextStep}
            </Button>
          </span>
        </div>
        <ol className="grid gap-x-6 gap-y-1 sm:grid-cols-2 xl:grid-cols-4">
          {th.stage.script.map((line, i) => (
            <li key={line} aria-current={i === step ? 'step' : undefined} className={`flex gap-2 rounded-sm px-2 py-1 text-[15px] ${i === step ? 'bg-care-soft font-semibold' : i < step ? 'text-muted' : ''}`}>
              <span className="tabular-nums">{i + 1}.</span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex gap-2 lg:hidden" role="tablist">
        {TABS.map((name) => (
          <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => setTab(name)} className={`flex-1 ${seg(tab === name)}`}>
            {th.stage.panes[name]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[410px_minmax(0,1fr)_minmax(0,400px)]">
        <section className={pane('phone')} aria-label={th.stage.panes.phone}>
          <PaneTitle title={th.stage.panes.phone} to="/app" />
          <PhoneFrame>
            <iframe src="/app?embed=1" title={th.stage.panes.phone} className="h-full w-full border-0" />
          </PhoneFrame>
        </section>

        <section className={pane('clinic')} aria-label={th.stage.panes.clinic}>
          <PaneTitle title={th.stage.panes.clinic} to="/clinic" />
          <div className="h-[780px] overflow-hidden rounded-lg border border-line bg-bg shadow-float">
            <iframe src="/clinic?embed=1" title={th.stage.panes.clinic} className="h-full w-full border-0" />
          </div>
        </section>

        <section className={`space-y-3 ${pane('data')}`} aria-label={th.stage.panes.data}>
          <PaneTitle title={th.stage.panes.data} to="/data" />
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface p-3">
            <span className="font-semibold">{th.stage.operator}</span>
            <span className="flex flex-wrap items-center gap-2">
              <Button onClick={() => publishWeek(isoWeek(new Date()))}>{th.operator.publish}</Button>
              <Link to="/operator" className="inline-flex min-h-11 items-center px-2 text-[13px] font-medium text-care">
                {th.operator.fullPage}
              </Link>
            </span>
          </div>
          {(['phone', 'clinic', 'operator', 'public'] as const).map((party) => (
            <StoreInspector key={party} party={party} />
          ))}
          <LedgerTimeline limit={8} />
        </section>
      </div>
    </main>
  )
}

function PaneTitle({ title, to }: { title: string; to: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="font-semibold">{title}</h2>
      <Link to={to} className="inline-flex min-h-9 items-center gap-1 text-[13px] font-medium text-care">
        <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
        {th.stage.openFull}
      </Link>
    </div>
  )
}
