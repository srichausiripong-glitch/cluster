import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from '../App'
import { formatThaiDate } from '../copy/format'
import { th } from '../copy/th'
import { mondayDate, shiftWeek } from '../domain/weeks'
import { setPublishedForTest } from '../map/published'
import { cancelPending, checkIn, clearPassedWaits, currentWeek, forgetMyDistrict, queueReport, wipePhone } from '../store/actions'
import { phone } from '../store/stores'

// The home screen asks for a status on a card over the map (redesign spec 5.1): ✅ ไม่เจอ goes in one
// tap once the phone knows the district (5.2), with a moment to undo it; 🩺 opens its own flow (5.3).

const open = (path = '/app') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
const clear = () => screen.getByRole('button', { name: th.home.clear })
const remember = (district: string) => phone.update((s) => ({ ...s, myDistrict: district }))
beforeEach(() => wipePhone())
afterEach(() => {
  setPublishedForTest(null)
  vi.useRealTimers()
})

it('asks how the last check went, with two answers and a way to find a place to test', () => {
  open()
  expect(screen.getByRole('heading', { name: th.home.ask })).toBeInTheDocument()
  expect(clear()).toBeEnabled()
  expect(screen.getByRole('link', { name: th.home.found })).toHaveAttribute('href', '/app/report')
  expect(screen.getByRole('link', { name: `${th.home.notTested} ${th.home.findTest}` })).toHaveAttribute('href', '/app/list?find=test')
})

it('sends ✅ the first time from a sheet, a district and one press, with no age question', async () => {
  const user = userEvent.setup()
  open()
  await user.click(clear())
  const sheet = screen.getByRole('dialog', { name: th.tested.title })
  expect(sheet.textContent).not.toMatch(/อายุ/)
  await user.click(within(sheet).getByRole('radio', { name: 'บางรัก' }))
  await user.click(within(sheet).getByRole('button', { name: th.tested.send }))
  expect(phone.get().pending).toMatchObject({ kind: 'tested', zone: 'bang_rak' })
  expect(phone.get().testedNextWeek).toBe(shiftWeek(currentWeek(), 4))
  expect(phone.get().myDistrict).toBe('bang_rak')
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByText(th.home.toast.replace('{district}', 'บางรัก'))).toBeInTheDocument()
  expect(screen.getByRole('button', { name: th.home.undo })).toBeInTheDocument()
})

it('keeps the send press unavailable until a district is chosen', async () => {
  const user = userEvent.setup()
  open()
  await user.click(clear())
  const sheet = screen.getByRole('dialog')
  const send = within(sheet).getByRole('button', { name: th.tested.send })
  expect(send).toBeDisabled()
  await user.click(within(sheet).getByRole('radio', { name: 'บางรัก' }))
  expect(send).toBeEnabled()
  expect(phone.get().pending).toBeNull()
})

it('sends with one tap once the phone knows the district, and offers to undo', async () => {
  const user = userEvent.setup()
  remember('bang_kapi')
  open()
  await user.click(clear())
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(phone.get().pending).toMatchObject({ kind: 'tested', zone: 'bang_kapi' })
  const undo = screen.getByRole('button', { name: th.home.undo })
  expect(undo).toHaveFocus()
  await user.click(undo)
  expect(phone.get().pending).toBeNull()
  expect(phone.get().testedNextWeek).toBeNull()
  expect(screen.queryByRole('button', { name: th.home.undo })).toBeNull()
})

it('drops the undo after five seconds and keeps the report', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  remember('bang_kapi')
  open()
  await user.click(clear())
  expect(screen.getByRole('button', { name: th.home.undo })).toBeInTheDocument()
  act(() => {
    vi.advanceTimersByTime(5000)
  })
  expect(screen.queryByRole('button', { name: th.home.undo })).toBeNull()
  expect(phone.get().pending).toMatchObject({ kind: 'tested', zone: 'bang_kapi' })
})

it('will not undo a report the weekly envelope is already taking, and says so', async () => {
  const user = userEvent.setup()
  remember('bang_kapi')
  open()
  await user.click(clear())
  localStorage.setItem('cluster.envelope-outbox', JSON.stringify({ week: 'x', savedAt: phone.get().pending!.savedAt, body: '{}' }))
  await user.click(screen.getByRole('button', { name: th.home.undo }))
  expect(screen.getByText(th.home.tooLate)).toBeInTheDocument()
  expect(phone.get().pending).toMatchObject({ kind: 'tested' })
})

it('leaves alone a report that replaced the one the toast announced', async () => {
  const user = userEvent.setup()
  remember('bang_kapi')
  open()
  await user.click(clear())
  act(() => queueReport({ kind: 'syphilis', zone: 'bang_rak', savedAt: 'later' }))
  await user.click(screen.getByRole('button', { name: th.home.undo }))
  expect(phone.get().pending).toMatchObject({ kind: 'syphilis' })
})

it('shows the undo in place of the question, so the card keeps its height on a short screen', async () => {
  const user = userEvent.setup()
  remember('bang_kapi')
  open()
  await user.click(clear())
  const card = screen.getByRole('button', { name: th.home.undo }).closest('section')!
  expect(within(card).getByRole('status')).toHaveTextContent(th.home.toast.replace('{district}', 'บางกะปิ'))
  expect(screen.queryByRole('heading', { name: th.home.ask })).toBeNull()
})
it('says it is too late when the report has already gone with the envelope', async () => {
  const user = userEvent.setup()
  remember('bang_kapi')
  open()
  await user.click(clear())
  act(() => phone.update((s) => ({ ...s, pending: null, sentWeek: currentWeek() })))
  await user.click(screen.getByRole('button', { name: th.home.undo }))
  expect(screen.getByText(th.home.tooLate)).toBeInTheDocument()
})
it('gives the district sheet most of a short screen, so the list shows above the send press', async () => {
  const user = userEvent.setup()
  open()
  await user.click(clear())
  expect(screen.getByRole('dialog').className).toMatch(/max-h-\[85dvh\]/)
})
it('shows ✅ as sent, with the date it can be sent again, while 🩺 stays open', () => {
  const next = shiftWeek(currentWeek(), 2)
  phone.update((s) => ({ ...s, testedNextWeek: next }))
  open()
  const done = screen.getByRole('button', { name: new RegExp(th.home.sent) })
  expect(done).toBeDisabled()
  expect(done).toHaveTextContent(th.home.again.replace('{date}', formatThaiDate(mondayDate(next))))
  expect(screen.getByRole('link', { name: th.home.found })).toBeInTheDocument()
})

it('says a report is waiting and where to cancel it', () => {
  queueReport({ kind: 'syphilis', zone: 'chatuchak', savedAt: 'x' })
  open()
  expect(screen.getByRole('link', { name: th.home.pendingLabel })).toHaveAttribute('href', '/app/me')
})

it('does not send when another kind of report waits, and says why', async () => {
  const user = userEvent.setup()
  queueReport({ kind: 'syphilis', zone: 'chatuchak', savedAt: 'x' })
  remember('bang_kapi')
  open()
  await user.click(clear())
  const sheet = screen.getByRole('dialog')
  expect(within(sheet).getByText(th.tested.otherPending)).toBeInTheDocument()
  expect(within(sheet).queryByRole('button', { name: th.tested.send })).toBeNull()
  expect(phone.get().pending).toMatchObject({ kind: 'syphilis' })
})

it('does not send while reports are closed, even with a remembered district', async () => {
  const user = userEvent.setup()
  setPublishedForTest({ week: null, publishedAt: null, intakeOpen: false, areas: [] })
  remember('bang_kapi')
  open()
  await user.click(clear())
  expect(within(screen.getByRole('dialog')).getByText(th.tested.closed)).toBeInTheDocument()
  expect(phone.get().pending).toBeNull()
})

it('says behind ⓘ what leaves the phone before the first ✅, with the privacy notice in a new tab', async () => {
  const user = userEvent.setup()
  open()
  await user.click(clear())
  const sheet = within(screen.getByRole('dialog'))
  await user.click(sheet.getByRole('button', { name: /ส่งแค่:/ }))
  for (const line of [th.send.details[0], th.send.details[3], th.report.pastOnly]) expect(sheet.getByText(line)).toBeInTheDocument()
  expect(sheet.getByRole('link', { name: th.privacy.title })).toHaveAttribute('target', '_blank')
})

// ---- kept from the check-in this card replaces ----------------------------------------------------
it('frees the next ✅ when a waiting one is cancelled, so a mistaken press costs nothing', () => {
  queueReport({ kind: 'tested', zone: 'ratchathewi', savedAt: new Date().toISOString() })
  cancelPending()
  expect(phone.get().testedNextWeek).toBeNull()
})

it('forgets the remembered district from the self-care page, and with everything else on a wipe', async () => {
  const user = userEvent.setup()
  remember('chatuchak')
  open('/app/me')
  expect(screen.getByText(th.me.myDistrict.replace('{district}', 'จตุจักร'))).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: th.me.forgetDistrict }))
  expect(phone.get().myDistrict).toBeUndefined()
  remember('chatuchak')
  wipePhone()
  expect(phone.get().myDistrict).toBeUndefined()
})

it('lists the remembered district among what the phone keeps on the privacy page', () => {
  expect(th.privacy.phone).toContain('เขตที่ใช้ครั้งล่าสุด')
})

// ---- the next-test reminder (2026-11-18 design, decision 1) ---------------------------------------
/** A day in Bangkok, N days from now, as the reminder stores it. */
const bangkokIn = (days: number) => new Date(Date.now() + 7 * 3600_000 + days * 86_400_000).toISOString().slice(0, 10)
const findTest = () => screen.getByRole('link', { name: `${th.home.notTested} ${th.home.findTest}` })

it('offers a next-test reminder after a check-in, and keeps it quiet after "ไม่ต้อง"', async () => {
  const user = userEvent.setup()
  remember('bang_rak')
  open()
  expect(findTest()).toBeInTheDocument()
  await user.click(clear())
  await user.click(screen.getByRole('button', { name: th.nextTest.offer }))
  const sheet = screen.getByRole('dialog', { name: th.nextTest.title })
  await user.click(within(sheet).getByRole('button', { name: th.nextTest.no }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.queryByRole('button', { name: th.nextTest.offer })).toBeNull()
  expect(findTest()).toBeInTheDocument()
  expect(phone.get().nextTest ?? null).toBeNull()
})
it('saves a reminder three months ahead and says it on the card, then says it is due on the day', async () => {
  const user = userEvent.setup()
  remember('bang_rak')
  const view = open()
  await user.click(clear())
  await user.click(screen.getByRole('button', { name: th.nextTest.offer }))
  const sheet = screen.getByRole('dialog', { name: th.nextTest.title })
  await user.click(within(sheet).getByRole('button', { name: th.nextTest.in3 }))
  expect(phone.get().nextTest).toBe(bangkokIn(91))
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: th.nextTest.calendar })).toBeInTheDocument()
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: th.nextTest.done }))
  expect(screen.getByRole('button', { name: th.nextTest.set.replace('{date}', formatThaiDate(new Date(bangkokIn(91)))) })).toBeInTheDocument()
  view.unmount()
  phone.update((s) => ({ ...s, nextTest: bangkokIn(-1) }))
  open()
  expect(screen.getByRole('link', { name: th.nextTest.due })).toHaveAttribute('href', '/app/list?find=test')
})

// ---- the "sent" note (2026-11-18 design, decision 2) ------------------------------------------------
const W = '2026-W46'
const fileFor = (week: string, row: Partial<{ state: string; testing: string | null }> = {}) =>
  setPublishedForTest({ week, publishedAt: '2026-11-16T20:00:00Z', intakeOpen: true, areas: [{ areaId: 'bang_rak', state: 'below_threshold', density: null, step: null, testing: 'medium', symptoms: null, ...row } as never] })
const note = () => screen.queryByText(th.counted.sent)

it('tells once that a "ไม่เจอ" report arrived, with the district\'s testing row', async () => {
  const user = userEvent.setup()
  phone.update((s) => ({ ...s, counted: { week: W, zone: 'bang_rak' } }))
  fileFor(W)
  const view = open()
  expect(note()).toBeInTheDocument()
  expect(screen.getByText(th.counted.row.replace('{name}', 'บางรัก'))).toBeInTheDocument()
  expect(document.querySelectorAll('[role="status"] [data-filled]').length + document.querySelectorAll('[data-counted] [data-filled]').length).toBeGreaterThanOrEqual(2)
  await user.click(screen.getByRole('button', { name: th.counted.close }))
  expect(note()).toBeNull()
  view.unmount()
  open()
  expect(note()).toBeNull()
})
it('says the district is below the threshold when its testing row is empty', () => {
  phone.update((s) => ({ ...s, counted: { week: W, zone: 'bang_rak' } }))
  fileFor(shiftWeek(W, 1), { testing: null })
  open()
  expect(note()).toBeInTheDocument()
  expect(screen.getByText(th.map.state.below_threshold)).toBeInTheDocument()
})
it('does not tell a suspended district\'s note, nor one from weeks ago', () => {
  phone.update((s) => ({ ...s, counted: { week: W, zone: 'bang_rak' } }))
  fileFor(W, { state: 'suspended' })
  const view = open()
  expect(note()).toBeNull()
  view.unmount()
  fileFor(shiftWeek(W, 2))
  open()
  expect(note()).toBeNull()
})
it('forgets the note with the district, and at the next check-in', () => {
  phone.update((s) => ({ ...s, counted: { week: W, zone: 'bang_rak' } }))
  forgetMyDistrict()
  expect(phone.get().counted ?? null).toBeNull()
  phone.update((s) => ({ ...s, counted: { week: W, zone: 'bang_rak' } }))
  checkIn('bang_rak')
  expect(phone.get().counted ?? null).toBeNull()
})
// Final review: nothing about a past report stays on the phone longer than it is needed.
it('forgets the sent note and a "ไม่ต้อง" once their weeks have passed', () => {
  phone.update((s) => ({ ...s, counted: { week: shiftWeek(currentWeek(), -3), zone: 'bang_rak' }, testedNextWeek: shiftWeek(currentWeek(), -1), nextTestDeclined: shiftWeek(currentWeek(), -1) }))
  clearPassedWaits()
  expect(phone.get().counted ?? null).toBeNull()
  expect(phone.get().nextTestDeclined ?? null).toBeNull()
  phone.update((s) => ({ ...s, counted: { week: shiftWeek(currentWeek(), -1), zone: 'bang_rak' } }))
  clearPassedWaits()
  expect(phone.get().counted).toEqual({ week: shiftWeek(currentWeek(), -1), zone: 'bang_rak' })
  expect(th.privacy.phone).toContain('สัปดาห์และเขตของรายงาน "ไม่เจอ" ครั้งล่าสุด')
})
it('clears the reminder date at any new check-in, and offers it again', () => {
  phone.update((s) => ({ ...s, nextTest: '2999-01-01' }))
  checkIn('bang_rak')
  expect(phone.get().nextTest ?? null).toBeNull()
})
