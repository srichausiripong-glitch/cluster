import { render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from '../App'
import { BANNED_WORDS, th } from '../copy/th'
import { DISTRICTS, districtName } from '../domain/districts'
import { shiftWeek } from '../domain/weeks'
import { cancelPending, clearPassedWaits, currentWeek, dropStaleAreas, queueReport, saveCard, wipePhone } from '../store/actions'
import { phone } from '../store/stores'

const open = (path = '/app/report') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
const choose = (user: UserEvent, name: string) => user.click(screen.getByRole('button', { name }))
/** A positive syphilis result from a lab: the path that reaches the map box. */
async function toConsent(user: UserEvent) {
  await choose(user, th.report.way.positive)
  await choose(user, th.group.syphilis)
  await choose(user, th.source.lab_result)
}
/** Ticks the map box after choosing a district and confirming the age. */
async function toMap(user: UserEvent, district = 'bang_rak') {
  await user.click(screen.getByRole('radio', { name: districtName(district) }))
  await user.click(screen.getByLabelText(th.report.age))
  await user.click(screen.getByLabelText(th.report.toMap))
}

it('offers two ways in, a found result and symptoms, and says what a signal is and who sees it', () => {
  open()
  for (const way of Object.values(th.report.way)) expect(screen.getByRole('button', { name: way })).toBeInTheDocument()
  expect(Object.keys(th.report.way)).toEqual(['positive', 'symptoms'])
  expect(screen.getByText(th.report.privacy)).toBeInTheDocument()
})
it('sends someone whose check found nothing to the check-in on the map, which is the one place for it (owner, 2026-11-16)', () => {
  open()
  expect(screen.queryByRole('button', { name: th.me.kind.tested })).toBeNull()
  expect(screen.getByRole('link', { name: th.report.checkInInstead })).toHaveAttribute('href', '/app')
})
it('names the tested report in everyday words wherever it shows (owner, 2026-11-16)', () => {
  expect(th.me.kind.tested).toBe('ไปเช็กมา ไม่เจออะไร')
  expect(th.privacy.leaves.join(' ')).toContain(th.me.kind.tested)
})
it('sends symptoms to the map for the chosen district', async () => {
  const user = userEvent.setup()
  wipePhone()
  open()
  await choose(user, th.report.way.symptoms)
  await choose(user, th.group.gono_chlam)
  await toMap(user)
  await choose(user, th.report.finish.queue)
  expect(phone.get().pending).toMatchObject({ kind: 'symptoms', zone: 'bang_rak' })
  expect(phone.get().symptomsNextWeek).toBe(shiftWeek(currentWeek(), 4))
})
it('does not offer the map for symptoms again within four weeks, and says when it can', async () => {
  const user = userEvent.setup()
  wipePhone()
  phone.update((s) => ({ ...s, symptomsNextWeek: shiftWeek(currentWeek(), 2) }))
  open()
  await choose(user, th.report.way.symptoms)
  await choose(user, th.group.gono_chlam)
  expect(screen.queryByLabelText(th.report.toMap)).toBeNull()
  expect(screen.getByText(new RegExp(th.report.symptomsAgainFrom.split('{date}')[0]))).toBeInTheDocument()
})
it('frees the next symptoms report when the waiting one is cancelled', () => {
  wipePhone()
  queueReport({ kind: 'symptoms', zone: 'bang_rak', savedAt: new Date().toISOString() })
  cancelPending()
  expect(phone.get().symptomsNextWeek).toBeNull()
})
it('drops a waiting report and a remembered area that are not districts', () => {
  wipePhone()
  phone.update((s) => ({ ...s, pending: { kind: 'tested', zone: 'central', savedAt: 'x' }, myDistrict: 'south' }))
  dropStaleAreas()
  expect(phone.get().pending).toBeNull()
  expect(phone.get().myDistrict).toBeUndefined()
  phone.update((s) => ({ ...s, pending: { kind: 'tested', zone: 'bang_rak', savedAt: 'x' }, myDistrict: 'bang_rak' }))
  dropStaleAreas()
  expect(phone.get().pending).toMatchObject({ zone: 'bang_rak' })
  expect(phone.get().myDistrict).toBe('bang_rak')
})
it('leaves the map box unticked, and lets it be ticked only after a district and the age', async () => {
  const user = userEvent.setup()
  open()
  await toConsent(user)
  const box = screen.getByLabelText(th.report.toMap)
  expect(box).not.toBeChecked()
  expect(box).toBeDisabled()
  await user.click(screen.getByRole('radio', { name: 'บางรัก' }))
  expect(box).toBeDisabled()
  await user.click(screen.getByLabelText(th.report.age))
  expect(box).toBeEnabled()
  expect(screen.getAllByRole('radio')).toHaveLength(DISTRICTS.length)
  // No control asks for the phone's position; the ⓘ of the "ส่งแค่" line says the app never uses it.
  expect(screen.queryAllByRole('button', { name: /ตำแหน่ง/ })).toEqual([])
  expect(screen.queryAllByRole('checkbox', { name: /ตำแหน่ง/ })).toEqual([])
})
it('says before the box what leaves the phone, that it waits and can be cancelled, and that it cannot be taken back', async () => {
  const user = userEvent.setup()
  open()
  await choose(user, th.report.way.positive)
  await choose(user, th.group.syphilis)
  await choose(user, th.source.lab_result)
  for (const line of [th.report.leaves, th.report.waits, th.report.noTakeBack]) expect(screen.getByText(line)).toBeInTheDocument()
})
it('never offers the map for HIV or mpox', async () => {
  const paths: [string, string, string][] = [
    [th.report.way.positive, th.group.hiv, th.source.lab_result],
    [th.report.way.positive, th.group.hiv, th.source.hiv_self_test],
    [th.report.way.positive, th.group.mpox, th.source.lab_result],
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
it('shows the same summary for either mapped disease group, and never calls anyone clean or safe', async () => {
  const summaries: string[] = []
  for (const group of [th.group.gono_chlam, th.group.syphilis]) {
    const user = userEvent.setup()
    wipePhone()
    const view = open()
    await choose(user, th.report.way.positive)
    await choose(user, group)
    await choose(user, th.source.lab_result)
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
  phone.update((s) => ({ ...s, pending: { kind: 'tested', zone: 'chatuchak', savedAt: '2026-11-12T00:00:00.000Z' } }))
  open()
  await toConsent(user)
  expect(screen.getByText(th.report.replacesPending)).toBeInTheDocument()
  await toMap(user)
  await choose(user, th.report.finish.queue)
  expect(phone.get().pending).toMatchObject({ kind: 'syphilis', zone: 'bang_rak' })
})
it('shows the waiting report on the self-care screen, with a way to cancel it', async () => {
  const user = userEvent.setup()
  wipePhone()
  phone.update((s) => ({ ...s, pending: { kind: 'tested', zone: 'bang_rak', savedAt: '2026-11-12T00:00:00.000Z' } }))
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
  await toConsent(user)
  expect(screen.getByRole('link', { name: th.privacy.title })).toHaveAttribute('target', '_blank')
})

it('frees the four-week wait of a waiting report that was dropped for its old area', () => {
  wipePhone()
  queueReport({ kind: 'tested', zone: 'central', savedAt: 'x' })
  dropStaleAreas()
  expect(phone.get().testedNextWeek).toBeNull()
  queueReport({ kind: 'symptoms', zone: 'central', savedAt: 'x' })
  dropStaleAreas()
  expect(phone.get().symptomsNextWeek).toBeNull()
})
it('frees the four-week wait of a waiting report that a new report replaces', () => {
  wipePhone()
  queueReport({ kind: 'tested', zone: 'bang_rak', savedAt: 'x' })
  queueReport({ kind: 'syphilis', zone: 'bang_rak', savedAt: 'y' })
  expect(phone.get().testedNextWeek).toBeNull()
  queueReport({ kind: 'symptoms', zone: 'bang_rak', savedAt: 'z' })
  queueReport({ kind: 'tested', zone: 'bang_rak', savedAt: 'w' })
  expect(phone.get().symptomsNextWeek).toBeNull()
  expect(phone.get().testedNextWeek).toBe(shiftWeek(currentWeek(), 4))
})
it('forgets a four-week wait once its week has come, so the phone keeps no lasting sign of a report', () => {
  wipePhone()
  phone.update((s) => ({ ...s, testedNextWeek: '2020-W01', symptomsNextWeek: '2020-W01' }))
  clearPassedWaits()
  expect(phone.get().testedNextWeek).toBeNull()
  expect(phone.get().symptomsNextWeek).toBeNull()
  const later = shiftWeek(currentWeek(), 2)
  phone.update((s) => ({ ...s, testedNextWeek: later, symptomsNextWeek: later }))
  clearPassedWaits()
  expect(phone.get().testedNextWeek).toBe(later)
  expect(phone.get().symptomsNextWeek).toBe(later)
})
