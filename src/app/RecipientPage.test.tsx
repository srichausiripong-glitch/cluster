import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { weeklyCode } from '../domain/fastTrack'
import { encodeNotice } from '../domain/link'
import { composeNotice, type NoticeInput } from '../domain/notify'

const hashOf = (input: Partial<NoticeInput>) =>
  '#' + encodeNotice(composeNotice({ group: 'syphilis', hasClinicCode: true, nameDisease: true, band: 'w4', week: '2026-W46', ...input }))

function Go({ to }: { to: string }) {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate(to)}>
      go
    </button>
  )
}

const open = (hash: string, next?: string) =>
  render(
    <MemoryRouter initialEntries={['/r' + hash]}>
      <App />
      {next && <Go to={'/r' + next} />}
    </MemoryRouter>,
  )
const reveal = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: th.recipient.reveal }))

it.each(['', '#', '#%%%', '#e30'])('shows the generic invitation, with no code and no mention of one, for fragment %j', (hash) => {
  open(hash)
  expect(screen.getByText(th.recipient.genericTitle)).toBeInTheDocument()
  expect(screen.getByText(th.recipient.intro)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: th.recipient.reveal })).toBeNull()
  expect(screen.queryByText(th.recipient.fastTrack)).toBeNull()
  expect(screen.queryByText(/รหัสด้านล่าง/)).toBeNull()
})
it('reveals detail only after a tap and shows no verified badge', async () => {
  const user = userEvent.setup()
  open(hashOf({}))
  expect(screen.queryByText(th.group.syphilis)).toBeNull()
  await reveal(user)
  expect(screen.getByText(th.group.syphilis)).toBeInTheDocument()
  expect(screen.getByText(weeklyCode('syphilis', true, '2026-W46', true))).toBeInTheDocument()
  expect(screen.getByText(th.draftClinical)).toBeInTheDocument()
  expect(screen.queryByText(/ยืนยันแล้ว/)).toBeNull()
})
it('hides the detail again when another link is opened in the same tab', async () => {
  const user = userEvent.setup()
  open(hashOf({}), hashOf({ group: 'gono_chlam' }))
  await reveal(user)
  expect(screen.getByText(th.group.syphilis)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'go' }))
  expect(screen.queryByText(th.group.gono_chlam)).toBeNull()
  expect(screen.getByRole('button', { name: th.recipient.reveal })).toBeInTheDocument()
})
it('shows the clinic code but no disease name for an invitation that names none', async () => {
  const user = userEvent.setup()
  open(hashOf({ nameDisease: false }))
  await reveal(user)
  expect(screen.queryByText(th.group.syphilis)).toBeNull()
  expect(screen.getByText(weeklyCode('syphilis', true, '2026-W46'))).toBeInTheDocument()
})
it('tells the recipient of an unnamed 72-hour link to go today, with PEP care points first', async () => {
  const user = userEvent.setup()
  open(hashOf({ group: 'hiv', hasClinicCode: false, nameDisease: false, band: 'h72' }))
  await reveal(user)
  expect(screen.getByRole('heading', { name: 'ควรไปวันนี้' })).toBeInTheDocument()
  expect(screen.getByText(/ไปจุดบริการวันนี้/)).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: /เอชไอวี/ })).toBeNull()
  const first = within(screen.getByRole('list', { name: th.recipient.nearby })).getAllByRole('listitem')[0]
  expect(within(first).getByText(th.care.pep)).toBeInTheDocument()
})
it('asks a reader of a named HIV notice which situation applies, and shows only that branch', async () => {
  const user = userEvent.setup()
  open(hashOf({ group: 'hiv', band: 'h72' }))
  await reveal(user)
  expect(screen.queryByText(/PEP ให้เร็วที่สุด/)).toBeNull()
  expect(screen.getAllByText(th.draftClinical).length).toBeGreaterThan(0)
  await user.click(screen.getByRole('button', { name: th.recipient.hiv.plhiv.label }))
  expect(screen.getByText(th.recipient.hiv.plhiv.advice)).toBeInTheDocument()
  expect(screen.queryByText(/PEP ให้เร็วที่สุด/)).toBeNull()
  await user.click(screen.getByRole('button', { name: th.recipient.hiv.within72.label }))
  expect(screen.getByText(th.recipient.hiv.within72.advice)).toBeInTheDocument()
  expect(screen.queryByText(th.recipient.hiv.plhiv.advice)).toBeNull()
})
it('offers a quick exit, the full list of care points and the harm form', async () => {
  const user = userEvent.setup()
  open(hashOf({}))
  expect(screen.getByRole('button', { name: th.common.quickExit })).toBeInTheDocument()
  await reveal(user)
  expect(screen.getByRole('link', { name: th.common.openList })).toHaveAttribute('href', '/app/list')
  expect(screen.getByRole('link', { name: th.recipient.harm })).toHaveAttribute('href', '/app/harm')
})
it('says where each care point is and gives the re-test date with a day count', async () => {
  const user = userEvent.setup()
  open(hashOf({}))
  await reveal(user)
  expect(screen.getAllByText(/กรุงเทพกลาง/).length).toBeGreaterThan(0)
  expect(screen.getByText(th.recipient.retest)).toBeInTheDocument()
  expect(screen.getByText(/อีก 84 วัน/)).toBeInTheDocument()
})
