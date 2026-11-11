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
  consentCityCount(id, 'syphilis')
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
it('lists all seven parties of the plan and marks what each knows in words, not by colour', () => {
  open('/data')
  const table = within(screen.getByRole('table', { name: th.data.whoKnows }))
  expect(table.getAllByRole('rowheader')).toHaveLength(7)
  expect(table.getByRole('rowheader', { name: 'ผู้ให้บริการโฮสต์และ CDN' })).toBeInTheDocument()
  expect(table.getByRole('rowheader', { name: 'ผู้ให้บริการอินเทอร์เน็ต' })).toBeInTheDocument()
  const cells = table.getAllByRole('cell')
  expect(cells).toHaveLength(21)
  const levels: string[] = Object.values(th.data.levels)
  for (const cell of cells) expect(levels).toContain(within(cell).getByTestId('level').textContent)
})
it('says that the clinic learns a code was used in the app', () => {
  open('/data')
  expect(screen.getByText(/รหัสของผู้ป่วยถูกใช้ในแอป/)).toBeInTheDocument()
})
it('lists every kind of record the plan says is kept, on the operator page', () => {
  open('/operator')
  const rows = within(screen.getByRole('table', { name: th.operator.retention })).getAllByRole('row')
  expect(rows).toHaveLength(7)
  expect(screen.getByText('เรื่องร้องเรียน')).toBeInTheDocument()
})
