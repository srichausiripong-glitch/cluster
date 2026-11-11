import { ExternalLink, Undo2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { th } from '../copy/th'
import { LedgerTimeline } from '../data/LedgerTimeline'
import { StoreInspector } from '../data/StoreInspector'
import { Button } from '../design/primitives/Button'
import { PhoneFrame } from '../design/primitives/PhoneFrame'
import { Wordmark } from '../design/Wordmark'
import { advanceWeek, currentWeek, publishWeek, seedDemo } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { demo, type DemoState } from '../store/stores'

const PANES = ['phone', 'clinic', 'data'] as const
type Pane = (typeof PANES)[number]

/** Who acts at each step of the pitch script, and the screen that step needs open. */
const STEPS: { pane: Pane; clinic?: string; phone?: string }[] = [
  { pane: 'clinic', clinic: '/clinic/issue' },
  { pane: 'clinic', clinic: '/clinic/results' },
  { pane: 'phone', phone: '/app/report' },
  { pane: 'phone' },
  { pane: 'phone' },
  { pane: 'phone' },
  { pane: 'clinic', clinic: '/clinic/batch' },
  { pane: 'data', phone: '/app' },
]
const PRESETS: { value: DemoState['seed']; label: string }[] = [
  { value: 'empty', label: th.stage.seedEmpty },
  { value: 'pilot', label: th.stage.seedPilot },
  { value: 'threshold', label: th.stage.seedThreshold },
]

function Segmented<T extends string | number>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-[13px] text-muted">{label}</span>
      <span role="group" aria-label={label} className="inline-flex box p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`min-h-10 rounded-[10px] px-3 text-[14px] font-medium ${value === option.value ? 'bg-ink text-white' : 'text-ink hover:bg-bg'}`}
          >
            {option.label}
          </button>
        ))}
      </span>
    </span>
  )
}

/** The pitch stage: the user's app, the clinic console and every party's data store, live side by side. */
export function Stage() {
  const { phase, seed, weekOffset } = usePartyStore(demo)
  const [step, setStep] = useState(0)
  const [tab, setTab] = useState<Pane>(STEPS[0].pane)
  // Each frame carries a key: changing it reloads the pane, which is also how a pane is
  // restored after the quick exit or the recipient page.
  const [phoneFrame, setPhoneFrame] = useState({ path: '/app', key: 0 })
  const [clinicFrame, setClinicFrame] = useState({ path: STEPS[0].clinic ?? '/clinic', key: 0 })
  const acting = STEPS[step].pane

  const goStep = (next: number) => {
    const target = STEPS[next]
    setStep(next)
    setTab(target.pane)
    if (target.clinic) setClinicFrame((frame) => ({ path: target.clinic!, key: frame.key + 1 }))
    if (target.phone) setPhoneFrame((frame) => ({ path: target.phone!, key: frame.key + 1 }))
  }

  // The acting pane is ringed; the other app pane recedes by losing its colour, not its
  // contrast, so it stays readable. The data column never recedes, because every step shows
  // its effect there, and the phone keeps its colour for the last step (the map changes).
  const receded = (name: Pane) => name !== acting && name !== 'data' && !(name === 'phone' && acting === 'data')
  const paneClass = (name: Pane) => `${tab === name ? '' : 'hidden xl:block'}`
  const frameClass = (name: Pane) => (receded(name) ? 'saturate-[0.25] transition-[filter] focus-within:saturate-100 hover:saturate-100' : 'transition-[filter]')

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 p-4 [--pane-h:clamp(520px,calc(100dvh_-_240px),780px)]">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-3">
          <Wordmark size={22} />
          <h1 className="text-[20px] font-semibold">{th.stage.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Segmented label={th.stage.presets} options={PRESETS} value={seed} onChange={seedDemo} />
          <Segmented
            label={th.stage.phase}
            options={([1, 2] as const).map((p) => ({ value: p, label: `${th.stage.phase} ${p}` }))}
            value={phase}
            onChange={(p) => demo.update((s) => ({ ...s, phase: p }))}
          />
          <button type="button" onClick={() => seedDemo(seed)} className="min-h-10 rounded-md px-2 text-[14px] font-medium text-care-ink underline underline-offset-4 hover:bg-care-soft">
            {th.stage.reset}
          </button>
        </div>
      </header>

      <section aria-label={th.stage.scriptTitle} className="flex flex-wrap items-center gap-3 box px-4 py-2">
        <span className="text-[13px] font-medium text-muted">{th.stage.scriptTitle}</span>
        <p className="min-w-0 flex-1 font-semibold" aria-live="polite">
          <span className="tabular-nums text-care-ink">
            {step + 1}/{STEPS.length}
          </span>{' '}
          {th.stage.script[step]} <span className="whitespace-nowrap font-normal text-muted">· {th.stage.panes[acting]}</span>
        </p>
        <span className="flex gap-2">
          <Button variant="secondary" disabled={step === 0} onClick={() => goStep(step - 1)}>
            {th.stage.prev}
          </Button>
          <Button disabled={step === STEPS.length - 1} onClick={() => goStep(step + 1)}>
            {th.stage.nextStep}
          </Button>
        </span>
      </section>

      <div className="flex gap-2 xl:hidden" role="tablist">
        {PANES.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={`min-h-11 flex-1 rounded-md px-3 text-[15px] font-medium ${tab === name ? 'bg-ink text-white' : 'border-2 border-ink bg-surface text-ink'}`}
          >
            {th.stage.panes[name]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)_380px]">
        <section className={paneClass('phone')} aria-label={th.stage.panes.phone} aria-current={acting === 'phone' ? 'step' : undefined}>
          <PaneTitle title={th.stage.panes.phone} to="/app" acting={acting === 'phone'}>
            <button
              type="button"
              onClick={() => setPhoneFrame((frame) => ({ path: '/app', key: frame.key + 1 }))}
              className="inline-flex min-h-9 items-center gap-1 rounded-md px-1 text-[13px] font-medium text-care-ink hover:bg-care-soft"
            >
              <Undo2 size={14} strokeWidth={1.75} aria-hidden="true" />
              {th.stage.backToMapPane}
            </button>
          </PaneTitle>
          <div className={frameClass('phone')}>
            <PhoneFrame acting={acting === 'phone'}>
              <iframe key={phoneFrame.key} src={`${phoneFrame.path}?embed=1`} title={th.stage.panes.phone} className="h-full w-full border-0" />
            </PhoneFrame>
          </div>
        </section>

        <section className={paneClass('clinic')} aria-label={th.stage.panes.clinic} aria-current={acting === 'clinic' ? 'step' : undefined}>
          <PaneTitle title={th.stage.panes.clinic} to="/clinic" acting={acting === 'clinic'} />
          <div className={`h-(--pane-h) overflow-hidden rounded-lg border-2 border-ink bg-bg shadow-pop-lg ${acting === 'clinic' ? 'outline-4 outline-offset-4 outline-care' : ''} ${frameClass('clinic')}`}>
            <iframe key={clinicFrame.key} src={`${clinicFrame.path}?embed=1`} title={th.stage.panes.clinic} className="h-full w-full border-0" />
          </div>
        </section>

        <section className={paneClass('data')} aria-label={th.stage.panes.data} aria-current={acting === 'data' ? 'step' : undefined}>
          <PaneTitle title={th.stage.panes.data} to="/data" acting={acting === 'data'} />
          <div className="flex h-(--pane-h) flex-col gap-3">
            <div className={`shrink-0 box p-3 ${acting === 'data' ? 'outline-4 outline-offset-4 outline-care' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{th.stage.operator}</span>
                <a href="/operator" target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center text-[13px] font-medium text-care-ink">
                  {th.operator.fullPage}
                </a>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Button onClick={() => publishWeek(currentWeek())}>{th.operator.publish}</Button>
                <Button variant="secondary" onClick={advanceWeek}>
                  {th.operator.advanceWeek}
                </Button>
                {weekOffset > 0 && <span className="text-[13px] text-muted">{th.operator.weeksPassed.replace('{n}', String(weekOffset))}</span>}
              </div>
            </div>
            <div className="max-h-[34%] shrink-0 overflow-y-auto rounded-md">
              <LedgerTimeline limit={12} />
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-md">
              {(['phone', 'clinic', 'operator', 'public'] as const).map((party) => (
                <StoreInspector key={party} party={party} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function PaneTitle({ title, to, acting, children }: { title: string; to: string; acting: boolean; children?: ReactNode }) {
  return (
    <div className="mb-2 flex min-h-9 flex-wrap items-center justify-between gap-x-2">
      <span className="flex items-center gap-2">
        <h2 className="font-semibold">{title}</h2>
        {acting && <span className="rounded-full border-[1.5px] border-ink bg-yellow px-2.5 py-0.5 text-[12px] font-semibold text-ink">{th.stage.acting}</span>}
      </span>
      <span className="flex items-center gap-2">
        {children}
        <a href={to} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 text-[13px] font-medium text-care-ink">
          <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
          {th.stage.openFull}
        </a>
      </span>
    </div>
  )
}
