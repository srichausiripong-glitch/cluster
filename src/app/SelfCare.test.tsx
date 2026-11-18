import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from '../App'
import { formatThaiDate } from '../copy/format'
import { th } from '../copy/th'
import { queueReport, wipePhone } from '../store/actions'
import { phone } from '../store/stores'
import { follow } from '../push/follow'
import { fakePush, PUSH_ENDPOINT } from '../test/fakePush'

// 🙂 ของฉัน: what this phone keeps, in few words (redesign spec 5.2, 5.10).

const open = (path = '/app/me') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
beforeEach(() => wipePhone())

it('shows the logo character and one line when nothing is kept', () => {
  open()
  const main = screen.getByRole('main')
  expect(within(main).getByText(th.me.none)).toBeInTheDocument()
  expect(main.querySelector('img[src*="mark"]')).not.toBeNull()
})

it('changes the remembered district without sending anything', async () => {
  const user = userEvent.setup()
  phone.update((s) => ({ ...s, myDistrict: 'bang_kapi' }))
  open()
  await user.click(screen.getByRole('button', { name: th.picker.change }))
  const sheet = within(screen.getByRole('dialog'))
  await user.click(sheet.getByRole('radio', { name: 'บางรัก' }))
  await user.click(sheet.getByRole('button', { name: th.picker.use }))
  expect(phone.get().myDistrict).toBe('bang_rak')
  expect(phone.get().pending).toBeNull()
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('will not cancel a report the envelope is taking, and says so', async () => {
  const user = userEvent.setup()
  queueReport({ kind: 'tested', zone: 'bang_rak', savedAt: 's1' })
  localStorage.setItem('cluster.envelope-outbox', JSON.stringify({ week: 'x', savedAt: 's1', body: '{}' }))
  open()
  await user.click(screen.getByRole('button', { name: th.me.cancelPending }))
  expect(screen.getByText(th.home.tooLate)).toBeInTheDocument()
  expect(phone.get().pending).toMatchObject({ savedAt: 's1' })
})

it('keeps the notes about wiping behind ⓘ', async () => {
  const user = userEvent.setup()
  open()
  expect(screen.queryByText(th.me.wipeNote)).toBeNull()
  await user.click(screen.getByRole('button', { name: th.me.wipeMore }))
  expect(screen.getByText(th.me.wipeNote)).toBeInTheDocument()
  expect(screen.getByText(th.me.iosNote)).toBeInTheDocument()
})

it('gives the district sheet most of a short screen, so the list shows above its press', async () => {
  const user = userEvent.setup()
  phone.update((s) => ({ ...s, myDistrict: 'bang_kapi' }))
  open()
  await user.click(screen.getByRole('button', { name: th.picker.change }))
  expect(screen.getByRole('dialog').className).toMatch(/max-h-\[85dvh\]/)
})

// ---- round 4: the followed district in ของฉัน (redesign spec 5.11) ----------------------------------
afterEach(() => vi.unstubAllGlobals())
it('shows the followed district in ของฉัน, with a way to change it and to stop', async () => {
  const user = userEvent.setup()
  fakePush()
  await follow('bang_rak', null)
  open()
  const card = within(screen.getByRole('heading', { name: th.follow.title }).closest('div') as HTMLElement)
  expect(card.getByText('เขตบางรัก')).toBeInTheDocument()
  expect(card.getByRole('button', { name: th.picker.change })).toBeInTheDocument()
  await user.click(card.getByRole('button', { name: th.follow.stop }))
  expect(await screen.findByText(th.follow.none)).toBeInTheDocument()
  expect(phone.get().follow).toBeUndefined()
})
it('starts following from ของฉัน with the remembered district already chosen', async () => {
  const user = userEvent.setup()
  const push = fakePush()
  phone.update((s) => ({ ...s, myDistrict: 'chatuchak' }))
  open()
  await user.click(screen.getByRole('button', { name: th.follow.start }))
  const sheet = within(screen.getByRole('dialog', { name: th.follow.title }))
  expect(sheet.getByRole('radio', { name: 'จตุจักร' })).toBeChecked()
  await user.click(sheet.getByRole('button', { name: th.picker.use }))
  await vi.waitFor(() => expect(phone.get().follow).toBe('chatuchak'))
  expect(JSON.stringify(push.calls)).not.toContain('chatuchak')
})
it('stops the weekly notification when the phone is wiped, but not on the quick exit', async () => {
  const user = userEvent.setup()
  const push = fakePush()
  await follow('bang_rak', null)
  push.calls.length = 0
  const replace = vi.fn()
  vi.stubGlobal('location', { ...window.location, replace })
  const view = open()
  await user.click(screen.getByRole('button', { name: th.common.quickExit }))
  expect(replace).toHaveBeenCalledWith('about:blank')
  expect(push.calls).toEqual([])
  expect(phone.get().follow).toBe('bang_rak')
  view.unmount()
  open()
  await user.click(screen.getByRole('button', { name: th.me.wipe }))
  await vi.waitFor(() => expect(push.calls).toEqual([{ url: '/api/push', method: 'DELETE', body: { endpoint: PUSH_ENDPOINT } }]))
  await vi.waitFor(() => expect(push.unsubscribed()).toBe(1))
  expect(phone.get().follow).toBeUndefined()
})
it('shows a kept test date with ways to change or clear it, and the wipe clears it', async () => {
  const user = userEvent.setup()
  phone.update((s) => ({ ...s, nextTest: '2027-02-20' }))
  const view = open()
  const main = screen.getByRole('main')
  expect(within(main).queryByText(th.me.none)).toBeNull()
  await user.click(within(main).getByRole('button', { name: th.nextTest.set.replace('{date}', formatThaiDate(new Date('2027-02-20'))) }))
  await user.click(within(screen.getByRole('dialog', { name: th.nextTest.title })).getByRole('button', { name: th.nextTest.clear }))
  expect(phone.get().nextTest ?? null).toBeNull()
  view.unmount()
  phone.update((s) => ({ ...s, nextTest: '2027-02-20' }))
  wipePhone()
  expect(phone.get().nextTest ?? null).toBeNull()
})
