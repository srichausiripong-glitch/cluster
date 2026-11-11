import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { isoWeek } from '../domain/weeks'
import { consentCityCount, flagPositive, issueClinicCode, resetDemo, seedDemo, sendWeeklyBatch } from '../store/actions'
import { demo, pub } from '../store/stores'

const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

it('shows what each party holds after an action, and that the operator never holds a code id', () => {
  resetDemo()
  const id = issueClinicCode()
  flagPositive(id, 'syphilis')
  consentCityCount(id)
  sendWeeklyBatch(isoWeek(new Date()))
  open('/data')
  expect(within(screen.getByRole('region', { name: th.data.party.operator })).queryByText(new RegExp(id))).toBeNull()
  expect(within(screen.getByRole('region', { name: th.data.party.clinic })).getByText(new RegExp(id))).toBeInTheDocument()
  expect(within(screen.getByRole('region', { name: th.data.party.phone })).getByText(th.data.empty)).toBeInTheDocument()
})
it('lists every action with the party whose store it wrote', () => {
  resetDemo()
  issueClinicCode()
  open('/data')
  const timeline = within(screen.getByRole('region', { name: th.data.timeline }))
  expect(timeline.getAllByText(th.data.party.clinic).length).toBeGreaterThan(0)
})
it('explains on the operator page why an area is not shown', () => {
  seedDemo('pilot')
  open('/operator')
  expect(screen.getByText(th.operator.why.below_threshold)).toBeInTheDocument()
})
it('lets the presenter publish the weekly file and switch the phase from the stage', async () => {
  const user = userEvent.setup()
  seedDemo('threshold')
  open('/')
  await user.click(screen.getByRole('button', { name: th.operator.publish }))
  expect(pub.get().files).toHaveLength(1)
  await user.click(screen.getByRole('button', { name: `${th.stage.phase} 2` }))
  expect(demo.get().phase).toBe(2)
})
