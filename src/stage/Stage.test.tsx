import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { seedDemo } from '../store/actions'
import { demo, pub } from '../store/stores'

const open = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )
const pane = (name: string) => screen.getByRole('region', { name })
const frame = (name: string) => screen.getByTitle(name) as HTMLIFrameElement

it('marks which party acts at each step and opens the screen that step needs', async () => {
  const user = userEvent.setup()
  open()
  expect(pane(th.stage.panes.clinic)).toHaveAttribute('aria-current', 'step')
  expect(pane(th.stage.panes.phone)).not.toHaveAttribute('aria-current')
  expect(frame(th.stage.panes.clinic).getAttribute('src')).toBe('/clinic/issue?embed=1')
  await user.click(screen.getByRole('button', { name: th.stage.nextStep }))
  expect(frame(th.stage.panes.clinic).getAttribute('src')).toBe('/clinic/results?embed=1')
  await user.click(screen.getByRole('button', { name: th.stage.nextStep }))
  expect(pane(th.stage.panes.phone)).toHaveAttribute('aria-current', 'step')
  expect(pane(th.stage.panes.clinic)).not.toHaveAttribute('aria-current')
  expect(frame(th.stage.panes.phone).getAttribute('src')).toBe('/app/report?embed=1')
})
it('restores the phone pane after a dead end such as the quick exit', async () => {
  const user = userEvent.setup()
  open()
  const before = frame(th.stage.panes.phone)
  await user.click(screen.getByRole('button', { name: th.stage.backToMapPane }))
  const after = frame(th.stage.panes.phone)
  expect(after).not.toBe(before)
  expect(after.getAttribute('src')).toBe('/app?embed=1')
})
it('shows which preset is loaded, and a preset publishes itself', async () => {
  const user = userEvent.setup()
  open()
  expect(screen.getByRole('button', { name: th.stage.seedEmpty })).toHaveAttribute('aria-pressed', 'true')
  await user.click(screen.getByRole('button', { name: th.stage.seedThreshold }))
  expect(screen.getByRole('button', { name: th.stage.seedThreshold })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: th.stage.seedEmpty })).toHaveAttribute('aria-pressed', 'false')
  expect(pub.get().files.at(-1)!.areas[0].state).toBe('shown')
})
it('lets the presenter skip a week, so a signal can be seen ageing', async () => {
  const user = userEvent.setup()
  seedDemo('threshold')
  open()
  await user.click(screen.getByRole('button', { name: th.operator.advanceWeek }))
  expect(demo.get().weekOffset).toBe(1)
  expect(pub.get().files.at(-1)!.areas[0]).toMatchObject({ state: 'shown', step: 'mixed' })
  expect(screen.getByText(th.operator.weeksPassed.replace('{n}', '1'))).toBeInTheDocument()
})
it('opens the full pages in a new tab, so the stage is not lost', () => {
  open()
  for (const link of screen.getAllByRole('link', { name: th.stage.openFull })) expect(link).toHaveAttribute('target', '_blank')
})
