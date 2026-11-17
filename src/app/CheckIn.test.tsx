import { render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it } from 'vitest'
import App from '../App'
import { formatThaiDate } from '../copy/format'
import { th } from '../copy/th'
import { mondayDate, shiftWeek } from '../domain/weeks'
import { setPublishedForTest } from '../map/published'
import { cancelPending, currentWeek, queueReport, wipePhone } from '../store/actions'
import { phone } from '../store/stores'

// The owner asked for "ไปเช็กมา ไม่เจออะไร" as the first thing on the home screen, like a check-in (2026-11-16):
// one sheet, and after the first time the phone remembers the district so the next check-in is one press.

const open = (path = '/app') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
const pick = (user: UserEvent, sheet: HTMLElement, district: string) => user.selectOptions(within(sheet).getByLabelText(th.report.pickDistrict), district)
const openSheet = async (user: UserEvent) => {
  await user.click(screen.getByRole('button', { name: new RegExp(th.checkIn.cta) }))
  return screen.getByRole('dialog')
}
beforeEach(() => wipePhone())
afterEach(() => setPublishedForTest(null))

it('checks in from the home screen in one sheet: a district, the age, one press', async () => {
  const user = userEvent.setup()
  open()
  const sheet = await openSheet(user)
  await pick(user, sheet, 'bang_rak')
  await user.click(within(sheet).getByLabelText(th.report.age))
  await user.click(within(sheet).getByRole('button', { name: th.checkIn.send }))
  expect(phone.get().pending).toMatchObject({ kind: 'tested', zone: 'bang_rak' })
  expect(phone.get().testedNextWeek).toBe(shiftWeek(currentWeek(), 4))
  expect(within(screen.getByRole('dialog')).getByText(th.checkIn.done)).toBeInTheDocument()
  expect(screen.getByText(th.report.pastOnly)).toBeInTheDocument()
})

it('keeps the press unavailable until a district and the age are given', async () => {
  const user = userEvent.setup()
  open()
  const sheet = await openSheet(user)
  const send = within(sheet).getByRole('button', { name: th.checkIn.send })
  expect(send).toBeDisabled()
  await pick(user, sheet, 'bang_rak')
  expect(send).toBeDisabled()
  await user.click(within(sheet).getByLabelText(th.report.age))
  expect(send).toBeEnabled()
  expect(phone.get().pending).toBeNull()
})

it('says what leaves the phone and that the phone will remember the district, before the first check-in', async () => {
  const user = userEvent.setup()
  open()
  const sheet = await openSheet(user)
  expect(within(sheet).getByText(th.report.leaves)).toBeInTheDocument()
  expect(within(sheet).getByText(th.checkIn.remembers)).toBeInTheDocument()
})

it('remembers the district, so the next check-in is one press, and shows the district on the button', async () => {
  const user = userEvent.setup()
  phone.update((s) => ({ ...s, myDistrict: 'bang_kapi' }))
  open()
  expect(screen.getByRole('button', { name: new RegExp(th.checkIn.cta) })).toHaveTextContent('บางกะปิ')
  const sheet = await openSheet(user)
  expect(within(sheet).getByText(th.checkIn.at.replace('{district}', 'บางกะปิ'))).toBeInTheDocument()
  expect(within(sheet).queryByLabelText(th.report.age)).toBeNull()
  await user.click(within(sheet).getByRole('button', { name: th.checkIn.send }))
  expect(phone.get().pending).toMatchObject({ kind: 'tested', zone: 'bang_kapi' })
})

it('lets a remembered district be changed in the sheet, and remembers the new one', async () => {
  const user = userEvent.setup()
  phone.update((s) => ({ ...s, myDistrict: 'bang_kapi' }))
  open()
  const sheet = await openSheet(user)
  await user.click(within(sheet).getByRole('button', { name: th.checkIn.changeZone }))
  await pick(user, sheet, 'bang_khae')
  await user.click(within(sheet).getByRole('button', { name: th.checkIn.send }))
  expect(phone.get().pending).toMatchObject({ zone: 'bang_khae' })
  expect(phone.get().myDistrict).toBe('bang_khae')
})

it('shows that the check-in is done and when the next one may go, and offers no press until then', async () => {
  const user = userEvent.setup()
  const next = shiftWeek(currentWeek(), 3)
  phone.update((s) => ({ ...s, testedNextWeek: next }))
  open()
  const button = screen.getByRole('button', { name: new RegExp(th.checkIn.cta) })
  expect(button).toHaveTextContent(th.checkIn.done)
  const sheet = await openSheet(user)
  expect(within(sheet).getByText(th.report.testedAgainFrom.replace('{date}', formatThaiDate(mondayDate(next))))).toBeInTheDocument()
  expect(within(sheet).queryByRole('button', { name: th.checkIn.send })).toBeNull()
})

it('never replaces another report already waiting for the envelope', async () => {
  const user = userEvent.setup()
  queueReport({ kind: 'syphilis', zone: 'chatuchak', savedAt: new Date().toISOString() })
  open()
  const sheet = await openSheet(user)
  expect(within(sheet).getByText(th.checkIn.otherPending)).toBeInTheDocument()
  expect(within(sheet).queryByRole('button', { name: th.checkIn.send })).toBeNull()
  expect(phone.get().pending).toMatchObject({ kind: 'syphilis' })
})

it('offers no check-in press while intake is closed', async () => {
  const user = userEvent.setup()
  setPublishedForTest({ week: null, publishedAt: null, intakeOpen: false, areas: [] })
  open()
  const sheet = await openSheet(user)
  expect(within(sheet).getByText(th.checkIn.closed)).toBeInTheDocument()
  expect(within(sheet).queryByRole('button', { name: th.checkIn.send })).toBeNull()
})

it('frees the next check-in when a waiting check-in is cancelled, so a mistaken press costs nothing', () => {
  queueReport({ kind: 'tested', zone: 'ratchathewi', savedAt: new Date().toISOString() })
  cancelPending()
  expect(phone.get().testedNextWeek).toBeNull()
})

it('forgets the remembered district from the self-care page, and with everything else on a wipe', async () => {
  const user = userEvent.setup()
  phone.update((s) => ({ ...s, myDistrict: 'chatuchak' }))
  open('/app/me')
  expect(screen.getByText(th.me.myDistrict.replace('{district}', 'จตุจักร'))).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: th.me.forgetDistrict }))
  expect(phone.get().myDistrict).toBeUndefined()
  phone.update((s) => ({ ...s, myDistrict: 'chatuchak' }))
  wipePhone()
  expect(phone.get().myDistrict).toBeUndefined()
})

it('lists the remembered district among what the phone keeps on the privacy page', () => {
  expect(th.privacy.phone).toContain('เขตที่ใช้ครั้งล่าสุด')
})
