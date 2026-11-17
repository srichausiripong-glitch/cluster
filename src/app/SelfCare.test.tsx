import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { queueReport, wipePhone } from '../store/actions'
import { phone } from '../store/stores'

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
  localStorage.setItem('cluster.envelope-claim', JSON.stringify({ week: 'x', at: Date.now(), savedAt: 's1' }))
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
