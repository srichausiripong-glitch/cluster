import { render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from '../App'
import { BANNED_WORDS, th } from '../copy/th'
import { shiftWeek } from '../domain/weeks'
import { currentWeek, saveCard, wipePhone } from '../store/actions'
import { phone } from '../store/stores'

const open = (path = '/app/report') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
const choose = (user: UserEvent, name: string) => user.click(screen.getByRole('button', { name }))
/** Ticks the map box after choosing a zone and confirming the age. */
async function toMap(user: UserEvent, zone = 'กรุงเทพใต้') {
  await user.click(screen.getByRole('radio', { name: zone }))
  await user.click(screen.getByLabelText(th.report.age))
  await user.click(screen.getByLabelText(th.report.toMap))
}

it('offers exactly three ways in, and says what a signal is and who sees it', () => {
  open()
  for (const way of Object.values(th.report.way)) expect(screen.getByRole('button', { name: way })).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: new RegExp(Object.values(th.report.way).join('|')) })).toHaveLength(3)
  expect(screen.getByText(th.report.privacy)).toBeInTheDocument()
})
it('asks a person who was tested for no result and no disease, and queues the report for the envelope', async () => {
  const user = userEvent.setup()
  wipePhone()
  open()
  await choose(user, th.report.way.tested)
  for (const group of Object.values(th.group)) expect(screen.queryByRole('button', { name: group })).toBeNull()
  await toMap(user)
  await choose(user, th.report.finish.queue)
  expect(phone.get().pending).toMatchObject({ kind: 'tested', zone: 'south' })
  expect(phone.get().testedNextWeek).toBe(shiftWeek(currentWeek(), 4))
})
it('leaves the map box unticked, and lets it be ticked only after a zone and the age', async () => {
  const user = userEvent.setup()
  open()
  await choose(user, th.report.way.tested)
  const box = screen.getByLabelText(th.report.toMap)
  expect(box).not.toBeChecked()
  expect(box).toBeDisabled()
  await user.click(screen.getByRole('radio', { name: 'กรุงเทพใต้' }))
  expect(box).toBeDisabled()
  await user.click(screen.getByLabelText(th.report.age))
  expect(box).toBeEnabled()
  const zones = screen.getAllByRole('radio').map((r) => r.getAttribute('aria-label') ?? (r as HTMLInputElement).labels?.[0]?.textContent)
  expect(zones).toEqual(['กรุงเทพเหนือ', 'กรุงเทพกลาง', 'กรุงเทพตะวันออก', 'กรุงเทพใต้', 'กรุงธนเหนือ', 'กรุงธนใต้'])
  // No control asks for the phone's position; the hint says the app never uses it.
  expect(screen.queryAllByRole('button', { name: /ตำแหน่ง/ })).toEqual([])
  expect(screen.queryAllByRole('checkbox', { name: /ตำแหน่ง/ })).toEqual([])
  expect(screen.getByText(th.report.zoneHint)).toBeInTheDocument()
})
it('says before the box what leaves the phone, that it waits and can be cancelled, and that it cannot be taken back', async () => {
  const user = userEvent.setup()
  open()
  await choose(user, th.report.way.positive)
  await choose(user, th.group.syphilis)
  await choose(user, th.source.lab_result)
  for (const line of [th.report.leaves, th.report.waits, th.report.noTakeBack]) expect(screen.getByText(line)).toBeInTheDocument()
})
it('never offers the map for HIV, mpox or symptoms alone', async () => {
  const paths: [string, string, string][] = [
    [th.report.way.positive, th.group.hiv, th.source.lab_result],
    [th.report.way.positive, th.group.hiv, th.source.hiv_self_test],
    [th.report.way.positive, th.group.mpox, th.source.lab_result],
    [th.report.way.symptoms, th.group.gono_chlam, ''],
    [th.report.way.symptoms, th.group.mpox, ''],
  ]
  for (const [way, group, source] of paths) {
    const user = userEvent.setup()
    const view = open()
    await choose(user, way)
    await choose(user, group)
    if (source) await choose(user, source)
    expect(screen.queryByLabelText(th.report.toMap), `${way} ${group} ${source}`).toBeNull()
    view.unmount()
  }
})
it('does not offer "tested" for the map again within four weeks, and says when it can', async () => {
  const user = userEvent.setup()
  wipePhone()
  phone.update((s) => ({ ...s, testedNextWeek: shiftWeek(currentWeek(), 2) }))
  open()
  await choose(user, th.report.way.tested)
  expect(screen.queryByLabelText(th.report.toMap)).toBeNull()
  expect(screen.getByText(new RegExp(th.report.testedAgainFrom.split('{date}')[0]))).toBeInTheDocument()
})
it('shows the same summary for "tested" and for a positive report, and never calls anyone clean or safe', async () => {
  const summaries: string[] = []
  for (const positive of [false, true]) {
    const user = userEvent.setup()
    wipePhone()
    const view = open()
    if (positive) {
      await choose(user, th.report.way.positive)
      await choose(user, th.group.gono_chlam)
      await choose(user, th.source.lab_result)
    } else {
      await choose(user, th.report.way.tested)
    }
    await toMap(user)
    await choose(user, th.report.finish.queue)
    const summary = screen.getByRole('region', { name: th.report.summary })
    expect(within(summary).getByText(th.report.pastOnly)).toBeInTheDocument()
    summaries.push(summary.textContent ?? '')
    for (const word of ['ปลอดเชื้อ', 'สะอาด', 'ย่านปลอดภัย']) expect(document.body.textContent).not.toContain(word)
    view.unmount()
  }
  expect(summaries[0]).toBe(summaries[1])
  for (const word of ['ปลอดเชื้อ', 'สะอาด', 'ย่านปลอดภัย']) expect(BANNED_WORDS).toContain(word)
})
it('replaces a report still waiting on the phone only after saying so', async () => {
  const user = userEvent.setup()
  wipePhone()
  phone.update((s) => ({ ...s, pending: { kind: 'syphilis', zone: 'north', savedAt: '2026-11-12T00:00:00.000Z' } }))
  open()
  await choose(user, th.report.way.tested)
  expect(screen.getByText(th.report.replacesPending)).toBeInTheDocument()
  await toMap(user)
  await choose(user, th.report.finish.queue)
  expect(phone.get().pending).toMatchObject({ kind: 'tested', zone: 'south' })
})
it('shows the waiting report on the self-care screen, with a way to cancel it', async () => {
  const user = userEvent.setup()
  wipePhone()
  phone.update((s) => ({ ...s, pending: { kind: 'tested', zone: 'south', savedAt: '2026-11-12T00:00:00.000Z' } }))
  open('/app/me')
  expect(screen.getByText(th.me.pendingTitle)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: th.me.cancelPending }))
  expect(phone.get().pending).toBeNull()
  expect(screen.queryByText(th.me.pendingTitle)).toBeNull()
})
it('says plainly when nothing was sent or kept, and sends an untested person to care points first', async () => {
  const user = userEvent.setup()
  wipePhone()
  open()
  await choose(user, th.report.way.symptoms)
  await choose(user, th.group.gono_chlam)
  await choose(user, th.report.finish.none)
  expect(screen.getByRole('heading', { name: th.report.outcome.nothing })).toBeInTheDocument()
  expect(screen.getByText(th.report.receiptNothingLeft)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: th.report.nextTest })).toHaveAttribute('href', '/app/list')
  expect(phone.get().card).toBeNull()
  expect(phone.get().pending).toBeNull()
})
it('keeps a card on the phone only when the person ticks the box', async () => {
  const user = userEvent.setup()
  wipePhone()
  open()
  await choose(user, th.report.way.symptoms)
  await choose(user, th.group.mpox)
  await user.click(screen.getByLabelText(th.report.keepCard))
  await choose(user, th.report.finish.card)
  expect(phone.get().card).toMatchObject({ group: 'mpox', source: 'symptoms', hasLabResult: false })
  expect(screen.getByRole('heading', { name: th.report.outcome.kept })).toBeInTheDocument()
})
it('sends a self-tester to confirm the result and to 1663, and opens the notify step without the disease in the address', async () => {
  const user = userEvent.setup()
  wipePhone()
  open()
  await choose(user, th.report.way.positive)
  await choose(user, th.group.hiv)
  await choose(user, th.source.hiv_self_test)
  await choose(user, th.report.finish.none)
  expect(screen.getByRole('link', { name: th.report.nextConfirm })).toHaveAttribute('href', '/app/list')
  expect(screen.getByRole('link', { name: th.report.call1663 })).toHaveAttribute('href', 'tel:1663')
  expect(screen.getByRole('link', { name: th.report.goNotify })).toHaveAttribute('href', '/app/notify')
})
it('does not say the phone holds nothing while an earlier card is still on it', async () => {
  const user = userEvent.setup()
  wipePhone()
  saveCard({ group: 'syphilis', source: 'lab_result', sentAt: new Date().toISOString(), hasLabResult: true })
  open()
  await choose(user, th.report.way.symptoms)
  await choose(user, th.group.gono_chlam)
  await choose(user, th.report.finish.none)
  expect(screen.queryByText(th.report.receiptNoCard)).toBeNull()
  expect(screen.getByText(th.report.receiptOldCard)).toBeInTheDocument()
})
it('opens the privacy notice in a new tab, so the report being filled in stays put', async () => {
  const user = userEvent.setup()
  open()
  await choose(user, th.report.way.tested)
  expect(screen.getByRole('link', { name: th.privacy.title })).toHaveAttribute('target', '_blank')
})
