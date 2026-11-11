import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { weeklyCode } from '../domain/fastTrack'
import { consentCityCount, createSlip, currentWeek, flagPositive, issueClinicCode, resetDemo, seedDemo } from '../store/actions'
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
it('says the week in one sentence while its figures are under 10, and never shows a bare count', () => {
  resetDemo()
  const id = issueClinicCode()
  flagPositive(id, 'syphilis')
  open('/clinic')
  expect(screen.getByText(th.clinic.weekUnderK)).toBeInTheDocument()
  expect(screen.queryByText(/^\s*\d+\s*$/)).toBeNull()
})
it('shows the week as numbers once the clinic has issued 10 codes', () => {
  resetDemo()
  for (let i = 0; i < 10; i++) issueClinicCode()
  open('/clinic')
  expect(screen.getByText(/ออกรหัส 10/)).toBeInTheDocument()
  expect(screen.queryByText(th.clinic.weekUnderK)).toBeNull()
})
it('opens on the week: what to do next, and each code with its state', () => {
  seedDemo('pilot')
  open('/clinic')
  expect(screen.getByRole('link', { name: new RegExp(th.clinic.issue) })).toHaveAttribute('href', '/clinic/issue')
  expect(screen.getByRole('link', { name: new RegExp(th.clinic.pendingSome) })).toHaveAttribute('href', '/clinic/results')
  expect(screen.getByRole('link', { name: new RegExp(th.clinic.batchNotSent) })).toHaveAttribute('href', '/clinic/batch')
  const row = within(screen.getByRole('row', { name: /DMB202/ }))
  expect(row.getByText(th.group.syphilis)).toBeInTheDocument()
  expect(row.getByText(th.clinic.consent)).toBeInTheDocument()
  expect(row.getByText(th.clinic.appChecked)).toBeInTheDocument()
})
it('shows the staff member and the two-step sign-in at every width', () => {
  open('/clinic')
  expect(screen.getByText(th.clinic.twoFactor).closest('.hidden')).toBeNull()
})
it('records a result against a code, and can clear it', async () => {
  const user = userEvent.setup()
  resetDemo()
  const id = issueClinicCode()
  open('/clinic/results')
  await user.selectOptions(screen.getByLabelText(`${th.clinic.setPositive} ${id}`), 'syphilis')
  expect(clinic.get().codes[0].positiveGroup).toBe('syphilis')
  await user.selectOptions(screen.getByLabelText(`${th.clinic.setPositive} ${id}`), '')
  expect(clinic.get().codes[0].positiveGroup).toBeNull()
})
it('sends only counts in the weekly batch, never a code, and then says it has been sent', async () => {
  const user = userEvent.setup()
  resetDemo()
  const id = issueClinicCode()
  flagPositive(id, 'syphilis')
  consentCityCount(id, 'syphilis')
  const view = open('/clinic/batch')
  expect(screen.queryByText(id)).toBeNull()
  await user.click(screen.getByRole('button', { name: th.clinic.sendBatch }))
  expect(operator.get().batches).toHaveLength(1)
  expect(JSON.stringify(operator.get().batches)).not.toContain(id)
  view.unmount()
  open('/clinic')
  expect(screen.getByRole('link', { name: new RegExp(th.clinic.batchSentShort) })).toBeInTheDocument()
})
it('never lists HIV among what leaves the clinic', () => {
  resetDemo()
  const id = issueClinicCode()
  flagPositive(id, 'hiv')
  consentCityCount(id, 'hiv')
  open('/clinic/batch')
  expect(screen.queryByText(th.group.hiv)).toBeNull()
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
it('tells staff what a shown code means, counts the visit with an acknowledgement, and can undo it', async () => {
  const user = userEvent.setup()
  resetDemo()
  const code = weeklyCode('syphilis', true, currentWeek(), false)
  open('/clinic/fast-track')
  await user.type(screen.getByLabelText(th.clinic.lookupInput), `${code.toLowerCase()}{Enter}`)
  const found = within(screen.getByRole('status'))
  expect(found.getByText(new RegExp(th.group.syphilis))).toBeInTheDocument()
  expect(found.getByText(new RegExp(th.clinic.unnamed))).toBeInTheDocument()
  await user.click(found.getByRole('button', { name: th.clinic.tallyOne }))
  expect(found.getByText(th.clinic.tallied)).toBeInTheDocument()
  expect(clinic.get().fastTrackTally[code]).toBe(1)
  await user.click(found.getByRole('button', { name: th.clinic.undo }))
  expect(clinic.get().fastTrackTally[code]).toBe(0)
})
it('says so when a code is not one of this week', async () => {
  const user = userEvent.setup()
  open('/clinic/fast-track')
  await user.type(screen.getByLabelText(th.clinic.lookupInput), 'ZZ999{Enter}')
  expect(screen.getByText(th.clinic.lookupNone)).toBeInTheDocument()
})
