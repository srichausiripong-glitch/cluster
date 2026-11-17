import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from '../App'
import { formatThaiDate } from '../copy/format'
import { th } from '../copy/th'
import { mondayDate, shiftWeek } from '../domain/weeks'
import { setPublishedForTest } from '../map/published'
import { cancelPending, currentWeek, queueReport, wipePhone } from '../store/actions'
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
  localStorage.setItem('cluster.envelope-claim', JSON.stringify({ week: 'x', at: Date.now(), savedAt: phone.get().pending!.savedAt }))
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
