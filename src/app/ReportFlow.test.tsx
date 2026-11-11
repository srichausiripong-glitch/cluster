import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { flagPositive, issueClinicCode, resetDemo } from '../store/actions'
import { clinic, operator, phone } from '../store/stores'

const open = () =>
  render(
    <MemoryRouter initialEntries={['/app/report']}>
      <App />
    </MemoryRouter>,
  )

it('never offers the area signal for HIV', async () => {
  const user = userEvent.setup()
  open()
  await user.click(screen.getByRole('button', { name: th.group.hiv }))
  await user.click(screen.getByRole('button', { name: th.source.hiv_self_test }))
  expect(screen.queryByLabelText(th.report.addToArea)).toBeNull()
  expect(screen.getByText(th.report.hivNoMap)).toBeInTheDocument()
})
it('offers the area signal only after a clinic code flagged positive is claimed, and records consent at the clinic', async () => {
  const user = userEvent.setup()
  resetDemo()
  const id = issueClinicCode()
  flagPositive(id, 'syphilis')
  open()
  await user.click(screen.getByRole('button', { name: th.group.syphilis }))
  await user.click(screen.getByRole('button', { name: th.source.clinic_code }))
  await user.type(screen.getByLabelText(th.report.codeInput), id)
  await user.click(screen.getByRole('button', { name: th.report.useCode }))
  await user.click(screen.getByLabelText(th.report.addToArea))
  await user.click(screen.getByRole('button', { name: th.report.finish }))
  expect(clinic.get().codes[0].cityConsent).toBe(true)
  expect(phone.get().card).toBeNull()
})
it('says so when a clinic code is not recognised', async () => {
  const user = userEvent.setup()
  resetDemo()
  open()
  await user.click(screen.getByRole('button', { name: th.group.syphilis }))
  await user.click(screen.getByRole('button', { name: th.source.clinic_code }))
  await user.type(screen.getByLabelText(th.report.codeInput), 'ZZZ000')
  await user.click(screen.getByRole('button', { name: th.report.useCode }))
  expect(screen.getByText(th.report.codeBad)).toBeInTheDocument()
})
it('stores nothing on the phone or the server for a report without a clinic code', async () => {
  const user = userEvent.setup()
  resetDemo()
  open()
  await user.click(screen.getByRole('button', { name: th.group.gono_chlam }))
  await user.click(screen.getByRole('button', { name: th.source.symptoms }))
  await user.click(screen.getByRole('button', { name: th.report.finish })) // th.report.keepCard left unticked
  expect(screen.getByText(th.report.receiptNothingLeft)).toBeInTheDocument()
  expect(phone.get().card).toBeNull()
  expect(operator.get().batches).toHaveLength(0)
})
it('keeps a card on the phone only when the person ticks the box', async () => {
  const user = userEvent.setup()
  resetDemo()
  open()
  await user.click(screen.getByRole('button', { name: th.group.mpox }))
  await user.click(screen.getByRole('button', { name: th.source.symptoms }))
  await user.click(screen.getByLabelText(th.report.keepCard))
  await user.click(screen.getByRole('button', { name: th.report.finish }))
  expect(phone.get().card).toMatchObject({ group: 'mpox', source: 'symptoms', hasClinicCode: false })
})
