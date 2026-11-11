import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { isoWeek } from '../domain/weeks'
import { publishWeek, seedDemo } from '../store/actions'
import { CARE_POINTS } from '../store/seed'

const openApp = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

it('explains that a faded or empty area is not safe, and never shows a count', () => {
  seedDemo('threshold')
  publishWeek(isoWeek(new Date()))
  openApp('/app')
  fireEvent.click(screen.getByRole('button', { name: th.map.openSignal }))
  const sheet = within(screen.getByRole('dialog'))
  expect(sheet.getByText(th.map.legendNotSafe)).toBeInTheDocument()
  expect(sheet.getByText(th.map.density.thin)).toHaveAttribute('aria-current', 'true')
  expect(screen.queryByText(/[0-9]+ รายงาน/)).toBeNull()
})
it('shows the below-threshold state as its own visible state', () => {
  seedDemo('pilot')
  publishWeek(isoWeek(new Date()))
  openApp('/app')
  fireEvent.click(screen.getByRole('button', { name: th.map.openSignal }))
  expect(within(screen.getByRole('dialog')).getByText(th.map.state.below_threshold)).toBeInTheDocument()
})
it('offers a list view with every care point', () => {
  openApp('/app/list')
  expect(screen.getAllByRole('listitem').length).toBe(CARE_POINTS.length)
})
it('offers a route to help and to sending a signal from the map', () => {
  openApp('/app')
  expect(screen.getByRole('link', { name: th.report.cta })).toHaveAttribute('href', '/app/report')
  expect(screen.getByRole('link', { name: th.nav.help })).toHaveAttribute('href', '/app/help')
})
