import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { saveCard, wipePhone } from '../store/actions'
import { phone } from '../store/stores'

const open = (path = '/app/report') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

it('says at the first step what a signal is and who sees it', () => {
  open()
  expect(screen.getByText(th.report.privacy)).toBeInTheDocument()
})
it('gives a person without a code a reason and a way to care points', async () => {
  const user = userEvent.setup()
  open()
  await user.click(screen.getByRole('button', { name: th.group.syphilis }))
  expect(screen.getByText(th.report.noCodeSyphilis)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: th.report.findCare })).toHaveAttribute('href', '/app/list')
})
it('says plainly when nothing was sent or kept, and sends an untested person to care points first', async () => {
  const user = userEvent.setup()
  wipePhone()
  open()
  await user.click(screen.getByRole('button', { name: th.group.gono_chlam }))
  await user.click(screen.getByRole('button', { name: th.source.symptoms }))
  await user.click(screen.getByRole('button', { name: th.report.finish.none })) // both boxes left unticked
  expect(screen.getByRole('heading', { name: th.report.outcome.nothing })).toBeInTheDocument()
  expect(screen.queryByText(th.report.outcome.counted)).toBeNull()
  expect(screen.getByText(th.report.receiptNothingLeft)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: th.report.nextTest })).toHaveAttribute('href', '/app/list')
  expect(phone.get().card).toBeNull()
})
it('keeps a card on the phone only when the person ticks the box, and labels the button with what it will do', async () => {
  const user = userEvent.setup()
  wipePhone()
  open()
  await user.click(screen.getByRole('button', { name: th.group.mpox }))
  await user.click(screen.getByRole('button', { name: th.source.symptoms }))
  expect(screen.getByRole('button', { name: th.report.finish.none })).toBeInTheDocument()
  await user.click(screen.getByLabelText(th.report.keepCard))
  await user.click(screen.getByRole('button', { name: th.report.finish.card }))
  expect(phone.get().card).toMatchObject({ group: 'mpox', source: 'symptoms', hasClinicCode: false })
  expect(screen.getByRole('heading', { name: th.report.outcome.kept })).toBeInTheDocument()
})
it('sends a self-tester to confirm the result and to 1663, and opens the notify step without the disease in the address', async () => {
  const user = userEvent.setup()
  wipePhone()
  open()
  await user.click(screen.getByRole('button', { name: th.group.hiv }))
  await user.click(screen.getByRole('button', { name: th.source.hiv_self_test }))
  await user.click(screen.getByRole('button', { name: th.report.finish.none }))
  expect(screen.getByRole('link', { name: th.report.nextConfirm })).toHaveAttribute('href', '/app/list')
  expect(screen.getByRole('link', { name: th.report.call1663 })).toHaveAttribute('href', 'tel:1663')
  expect(screen.getByRole('link', { name: th.report.goNotify })).toHaveAttribute('href', '/app/notify')
})
it('does not say the phone holds nothing while an earlier card is still on it', async () => {
  const user = userEvent.setup()
  wipePhone()
  saveCard({ group: 'syphilis', source: 'clinic_code', sentAt: new Date().toISOString(), hasClinicCode: true })
  open()
  await user.click(screen.getByRole('button', { name: th.group.gono_chlam }))
  await user.click(screen.getByRole('button', { name: th.source.symptoms }))
  await user.click(screen.getByRole('button', { name: th.report.finish.none }))
  expect(screen.queryByText(th.report.receiptNoCard)).toBeNull()
  expect(screen.getByText(th.report.receiptOldCard)).toBeInTheDocument()
})
