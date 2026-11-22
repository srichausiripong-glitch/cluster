import { render, screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it } from 'vitest'
import App from '../App'
import { formatThaiDate } from '../copy/format'
import { BANNED_WORDS, th } from '../copy/th'
import { mondayDate, shiftWeek } from '../domain/weeks'
import { setPublishedForTest } from '../map/published'
import { cancelPending, clearPassedWaits, currentWeek, dropStaleAreas, queueReport, wipePhone } from '../store/actions'
import { phone } from '../store/stores'

// 🩺 เจอ / มีอาการ (redesign spec 5.3): what was found, how it is known, the district, done.

const open = (path = '/app/report') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
const choose = (user: UserEvent, name: string | RegExp) => user.click(screen.getByRole('button', { name }))
/** A lab-confirmed result of a disease that goes on the map, as far as the district step. */
async function toDistrict(user: UserEvent, found: 'gono_chlam' | 'syphilis' = 'syphilis') {
  await choose(user, th.report.found[found])
  await choose(user, th.report.source.lab_result)
}
const pick = (user: UserEvent, name: string) => user.click(screen.getByRole('radio', { name }))
beforeEach(() => wipePhone())
afterEach(() => setPublishedForTest(null))

it('asks what was found, with five answers, and marks HIV and mpox as not going on the map', () => {
  open()
  for (const label of Object.values(th.report.found)) expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
  for (const g of ['hiv', 'mpox'] as const) expect(screen.getByRole('button', { name: th.report.found[g] })).toHaveAccessibleDescription(th.report.noMap)
})

it('sends a lab-confirmed syphilis result to the map for the chosen district, with no age question', async () => {
  const user = userEvent.setup()
  open()
  await toDistrict(user)
  expect(document.body.textContent).not.toMatch(/อายุ/)
  await pick(user, 'บางรัก')
  await choose(user, th.report.toMap)
  expect(phone.get().pending).toMatchObject({ kind: 'syphilis', zone: 'bang_rak' })
  expect(phone.get().myDistrict).toBe('bang_rak')
  expect(screen.getByRole('heading', { name: th.report.doneQueued })).toBeInTheDocument()
})

it('goes straight from 🤒 to the district, and sends symptoms on their own', async () => {
  const user = userEvent.setup()
  open()
  await choose(user, th.report.found.symptoms)
  expect(screen.queryByRole('heading', { name: th.report.askSource })).toBeNull()
  expect(screen.getByRole('heading', { name: th.tested.title })).toBeInTheDocument()
  await pick(user, 'บางรัก')
  await choose(user, th.report.toMap)
  expect(phone.get().pending).toMatchObject({ kind: 'symptoms', zone: 'bang_rak' })
  expect(phone.get().symptomsNextWeek).toBe(shiftWeek(currentWeek(), 4))
})

it('uses the remembered district and lets it be changed', async () => {
  const user = userEvent.setup()
  phone.update((s) => ({ ...s, myDistrict: 'bang_kapi' }))
  open()
  await toDistrict(user)
  expect(screen.getByText('บางกะปิ')).toBeInTheDocument()
  await choose(user, th.picker.change)
  await pick(user, 'บางรัก')
  await choose(user, th.report.toMap)
  expect(phone.get().pending).toMatchObject({ zone: 'bang_rak' })
  expect(phone.get().myDistrict).toBe('bang_rak')
})

it('never offers the map for HIV or mpox, and goes on to what can still be done', async () => {
  const paths: ['hiv' | 'mpox', 'lab_result' | 'hiv_self_test'][] = [
    ['hiv', 'lab_result'],
    ['hiv', 'hiv_self_test'],
    ['mpox', 'lab_result'],
  ]
  for (const [found, source] of paths) {
    const user = userEvent.setup()
    const view = open()
    await choose(user, th.report.found[found])
    await choose(user, th.report.source[source])
    expect(screen.queryByRole('button', { name: th.report.toMap }), `${found} ${source}`).toBeNull()
    expect(screen.getByRole('heading', { name: th.report.doneNothing })).toBeInTheDocument()
    if (source === 'hiv_self_test') expect(screen.getByRole('link', { name: th.report.call1663 })).toHaveAttribute('href', 'tel:1663')
    expect(phone.get().pending).toBeNull()
    view.unmount()
  }
})

it('does not offer the map for symptoms again within four weeks, and says when it can', async () => {
  const user = userEvent.setup()
  const next = shiftWeek(currentWeek(), 2)
  phone.update((s) => ({ ...s, symptomsNextWeek: next }))
  open()
  await choose(user, th.report.found.symptoms)
  expect(screen.getByText(th.report.symptomsAgain.replace('{date}', formatThaiDate(mondayDate(next))))).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: th.report.toMap })).toBeNull()
  await choose(user, th.report.next)
  expect(screen.getByRole('heading', { name: th.report.doneNothing })).toBeInTheDocument()
})

it('says the map is closed for now but still leads to care and to telling a partner', async () => {
  const user = userEvent.setup()
  setPublishedForTest({ week: null, publishedAt: null, intakeOpen: false, areas: [] })
  open()
  await toDistrict(user)
  expect(screen.getByText(th.report.closed)).toBeInTheDocument()
  await choose(user, th.report.next)
  expect(screen.getByRole('link', { name: th.report.findCare })).toHaveAttribute('href', '/app/list?find=test')
  expect(screen.getByRole('link', { name: th.report.tell })).toHaveAttribute('href', '/app/notify')
})

it('replaces a waiting ✅ only after saying so', async () => {
  const user = userEvent.setup()
  phone.update((s) => ({ ...s, pending: { kind: 'tested', zone: 'chatuchak', savedAt: '2026-11-12T00:00:00.000Z' } }))
  open()
  await toDistrict(user)
  expect(screen.getByText(th.report.replaces)).toBeInTheDocument()
  await pick(user, 'บางรัก')
  await choose(user, th.report.toMap)
  expect(phone.get().pending).toMatchObject({ kind: 'syphilis', zone: 'bang_rak' })
})

it('says the old report may already have gone when the envelope has sealed it, instead of replacing it', async () => {
  const user = userEvent.setup()
  phone.update((s) => ({ ...s, pending: { kind: 'tested', zone: 'chatuchak', savedAt: 's1' } }))
  localStorage.setItem('cluster.envelope-outbox', JSON.stringify({ week: '2026-W47', savedAt: 's1', body: '{}' }))
  open()
  await toDistrict(user)
  expect(screen.getByText(th.report.replacesTaken)).toBeInTheDocument()
  expect(screen.queryByText(th.report.replaces)).toBeNull()
})
it('lets a person skip the map and still find care', async () => {
  const user = userEvent.setup()
  open()
  await toDistrict(user)
  await choose(user, th.report.skip)
  expect(screen.getByRole('heading', { name: th.report.doneNothing })).toBeInTheDocument()
  expect(phone.get().pending).toBeNull()
  expect(screen.getByRole('link', { name: th.report.findCare })).toHaveAttribute('href', '/app/list?find=test')
})

it('keeps a card only when the person presses 📌, after saying who could see it', async () => {
  const user = userEvent.setup()
  const view = open()
  await toDistrict(user)
  await pick(user, 'บางรัก')
  await choose(user, th.report.toMap)
  expect(phone.get().card).toBeNull()
  expect(screen.getByText(th.report.cardWarn)).toBeInTheDocument()
  await choose(user, th.report.keepCard)
  expect(phone.get().card).toMatchObject({ group: 'syphilis', source: 'lab_result', hasLabResult: true })
  expect(screen.getByRole('button', { name: th.report.keptCard })).toBeDisabled()
  view.unmount()
  open()
  await choose(user, th.report.found.symptoms)
  await choose(user, th.report.skip)
  expect(screen.queryByRole('button', { name: th.report.keepCard })).toBeNull()
})

it('ends both confirmed diseases on the same done screen, and never calls anyone clean or safe', async () => {
  const summaries: string[] = []
  for (const found of ['gono_chlam', 'syphilis'] as const) {
    const user = userEvent.setup()
    wipePhone()
    const view = open()
    await toDistrict(user, found)
    await pick(user, 'บางรัก')
    await choose(user, th.report.toMap)
    summaries.push(screen.getByRole('region', { name: th.report.summary }).textContent ?? '')
    for (const word of BANNED_WORDS) expect(document.body.textContent).not.toContain(word)
    view.unmount()
  }
  expect(summaries[0]).toBe(summaries[1])
})

it('hands the found disease to the partner step without putting it in the address', async () => {
  const user = userEvent.setup()
  open()
  await toDistrict(user)
  await choose(user, th.report.skip)
  expect(screen.getByRole('link', { name: th.report.tell })).toHaveAttribute('href', '/app/notify')
})

it('steps back to the question it came from, skipping the step it skipped', async () => {
  const user = userEvent.setup()
  open()
  await choose(user, th.report.found.symptoms)
  await choose(user, th.common.back)
  expect(screen.getByRole('heading', { name: th.report.askFound })).toBeInTheDocument()
})

it('opens the privacy notice in a new tab from the ส่งแค่ line, so the report being filled in stays put', async () => {
  const user = userEvent.setup()
  open()
  await toDistrict(user)
  await choose(user, /ส่งแค่:/)
  expect(screen.getByRole('link', { name: th.privacy.title })).toHaveAttribute('target', '_blank')
})

// ---- what the phone keeps -------------------------------------------------------------------------
it('names the tested report in everyday words wherever it shows (owner, 2026-11-16)', () => {
  expect(th.me.kind.tested).toBe('ไปเช็กมา ไม่เจออะไร')
  expect(th.privacy.leaves.join(' ')).toContain(th.me.kind.tested)
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
