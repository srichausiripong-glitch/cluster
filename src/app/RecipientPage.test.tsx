import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { weeklyCode } from '../domain/fastTrack'
import { encodeNotice } from '../domain/link'
import { composeNotice } from '../domain/notify'

const open = (hash: string) =>
  render(
    <MemoryRouter initialEntries={['/r' + hash]}>
      <App />
    </MemoryRouter>,
  )

it.each(['', '#', '#%%%', '#e30'])('shows the generic invitation for fragment %j', (hash) => {
  open(hash)
  expect(screen.getByText(th.recipient.genericTitle)).toBeInTheDocument()
  expect(screen.getByText(th.recipient.intro)).toBeInTheDocument()
})
it('reveals detail only after a tap and shows no verified badge', async () => {
  const user = userEvent.setup()
  const n = composeNotice({ group: 'syphilis', hasClinicCode: true, nameDisease: true, band: 'w4', week: '2026-W46' })
  open('#' + encodeNotice(n))
  expect(screen.queryByText(th.group.syphilis)).toBeNull()
  await user.click(screen.getByRole('button', { name: th.recipient.reveal }))
  expect(screen.getByText(th.group.syphilis)).toBeInTheDocument()
  expect(screen.getByText(weeklyCode('syphilis', true, '2026-W46'))).toBeInTheDocument()
  expect(screen.getByText(th.draftClinical)).toBeInTheDocument()
  expect(screen.queryByText(/ยืนยันแล้ว/)).toBeNull()
})
it('shows the clinic code but no disease name for an invitation that names none', async () => {
  const user = userEvent.setup()
  const n = composeNotice({ group: 'syphilis', hasClinicCode: true, nameDisease: false, band: 'w4', week: '2026-W46' })
  open('#' + encodeNotice(n))
  await user.click(screen.getByRole('button', { name: th.recipient.reveal }))
  expect(screen.queryByText(th.group.syphilis)).toBeNull()
  expect(screen.getByText(weeklyCode('syphilis', true, '2026-W46'))).toBeInTheDocument()
})
it('gives a person already living with HIV their own branch', async () => {
  const user = userEvent.setup()
  const n = composeNotice({ group: 'hiv', hasClinicCode: true, nameDisease: true, band: 'h72', week: '2026-W46' })
  open('#' + encodeNotice(n))
  await user.click(screen.getByRole('button', { name: th.recipient.reveal }))
  await user.click(screen.getByRole('button', { name: th.recipient.hiv.plhiv.label }))
  expect(screen.getByText(th.recipient.hiv.plhiv.advice)).toBeInTheDocument()
})
