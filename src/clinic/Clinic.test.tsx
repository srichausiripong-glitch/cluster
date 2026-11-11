import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { consentCityCount, createSlip, flagPositive, issueClinicCode, resetDemo } from '../store/actions'
import { clinic, operator } from '../store/stores'

const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

it('issues the same kind of code to every tester, with no result attached', async () => {
  const user = userEvent.setup()
  resetDemo()
  open('/clinic/issue')
  await user.click(screen.getByRole('button', { name: th.clinic.issue }))
  expect(clinic.get().codes).toHaveLength(1)
  expect(clinic.get().codes[0].positiveGroup).toBeNull()
  expect(screen.getByText(clinic.get().codes[0].id)).toBeInTheDocument()
})
it('shows counts under the threshold as text, not a number', () => {
  resetDemo()
  const id = issueClinicCode()
  flagPositive(id, 'syphilis')
  open('/clinic')
  expect(screen.getAllByText(th.clinic.underK).length).toBeGreaterThan(0)
})
it('records a positive result against a code', async () => {
  const user = userEvent.setup()
  resetDemo()
  const id = issueClinicCode()
  open('/clinic/results')
  await user.selectOptions(screen.getByLabelText(`${th.clinic.setPositive} ${id}`), 'syphilis')
  expect(clinic.get().codes[0].positiveGroup).toBe('syphilis')
})
it('sends only counts in the weekly batch, never a code', async () => {
  const user = userEvent.setup()
  resetDemo()
  const id = issueClinicCode()
  flagPositive(id, 'syphilis')
  consentCityCount(id)
  open('/clinic/batch')
  expect(screen.queryByText(id)).toBeNull()
  await user.click(screen.getByRole('button', { name: th.clinic.sendBatch }))
  expect(operator.get().batches).toHaveLength(1)
  expect(JSON.stringify(operator.get().batches)).not.toContain(id)
})
it('accepts a slip from the patient and keeps contact details out of this system', async () => {
  const user = userEvent.setup()
  resetDemo()
  const slip = createSlip()
  open('/clinic/assist')
  await user.type(screen.getByLabelText(th.clinic.slipInput), slip)
  await user.click(screen.getByRole('button', { name: th.clinic.slipCheck }))
  expect(screen.getByText(th.clinic.slipOk)).toBeInTheDocument()
  expect(screen.getByText(th.clinic.assistNote)).toBeInTheDocument()
})
