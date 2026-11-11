import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { seedDemo } from '../store/actions'
import { CARE_POINTS } from '../store/seed'

const openApp = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
const openSignal = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: th.map.openSignal }))
  return within(screen.getByRole('dialog'))
}

it('explains that a faded or empty area is not safe, and never shows the count behind the signal', async () => {
  const user = userEvent.setup()
  seedDemo('threshold') // 12 reports
  openApp('/app')
  const sheet = await openSignal(user)
  expect(sheet.getByText(th.map.legendNotSafe)).toBeInTheDocument()
  expect(sheet.getByText(th.map.density.thin)).toHaveAttribute('aria-current', 'true')
  expect(document.body.textContent).not.toMatch(/(^|[^0-9:])12([^0-9:]|$)/)
})
it('shows the below-threshold state as its own visible state', async () => {
  const user = userEvent.setup()
  seedDemo('pilot')
  openApp('/app')
  const sheet = await openSignal(user)
  expect(sheet.getByRole('heading', { name: th.map.state.below_threshold })).toBeInTheDocument()
})
it('teaches every mark in the legend: patterns, pin shapes and the current value', async () => {
  const user = userEvent.setup()
  seedDemo('threshold')
  openApp('/app')
  const sheet = await openSignal(user)
  expect(sheet.getByText(th.map.key)).toBeInTheDocument()
  for (const label of [th.map.state.below_threshold, th.map.state.no_data, th.map.state.no_partner, th.map.keyPins.clinic, th.map.keyPins.pharmacy, th.map.keyPins.lab]) {
    expect(sheet.getAllByText(label).length).toBeGreaterThan(0)
  }
  expect(sheet.getAllByText(th.map.current).length).toBe(2) // one for the level, one for the age
})
it('pairs the signal sheet with a care point', async () => {
  const user = userEvent.setup()
  seedDemo('pilot')
  openApp('/app')
  const sheet = await openSignal(user)
  expect(sheet.getByText(th.map.pair)).toBeInTheDocument()
  expect(sheet.getByRole('button', { name: new RegExp(CARE_POINTS[0].name) })).toBeInTheDocument()
})
it('moves focus into a sheet, closes it on Escape and returns focus to what opened it', async () => {
  const user = userEvent.setup()
  openApp('/app')
  const opener = screen.getByRole('button', { name: th.map.openSignal })
  await user.click(opener)
  expect(screen.getByRole('button', { name: 'ปิดแผ่นนี้' })).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(opener).toHaveFocus()
})
it('names the city by its published state, and makes every zone reachable in the phase 2 preview', () => {
  seedDemo('threshold')
  const view = openApp('/app')
  expect(screen.getByRole('button', { name: `กรุงเทพฯ: ${th.map.state.shown}` })).toBeInTheDocument()
  view.unmount()
  openApp('/app?phase=2')
  expect(screen.getByRole('button', { name: `กรุงเทพใต้: ${th.map.state.shown}` })).toHaveAttribute('tabindex', '0')
  expect(screen.getByRole('button', { name: `กรุงธนใต้: ${th.map.state.no_partner}` })).toBeInTheDocument()
})
it('gives every care point pin a 44 px target and marks the selected one', async () => {
  const user = userEvent.setup()
  const { container } = openApp('/app')
  const hits = container.querySelectorAll('[data-hit]')
  expect(hits).toHaveLength(CARE_POINTS.length)
  hits.forEach((hit) => expect(Number(hit.getAttribute('r'))).toBeGreaterThanOrEqual(22))
  const pin = screen.getByRole('button', { name: CARE_POINTS[1].name })
  await user.click(pin)
  expect(pin).toHaveAttribute('data-selected', 'true')
  expect(within(screen.getByRole('dialog')).getByText(th.care.place)).toBeInTheDocument()
})
it('draws zone names in ink over a halo, so they stay readable on every tint', () => {
  const { container } = openApp('/app?phase=2')
  const labels = container.querySelectorAll('svg text')
  expect(labels.length).toBe(6)
  labels.forEach((label) => {
    expect(label.getAttribute('fill')).toBe('var(--color-ink)')
    expect(label.getAttribute('stroke')).toBe('var(--color-bg)')
  })
})
it('offers a list view with every care point', () => {
  openApp('/app/list')
  expect(screen.getAllByRole('listitem').length).toBe(CARE_POINTS.length)
})
it('carries the area signal and the send-signal button on the list, as on the map', async () => {
  const user = userEvent.setup()
  seedDemo('pilot')
  openApp('/app/list')
  expect(screen.getByRole('link', { name: th.report.cta })).toHaveAttribute('href', '/app/report')
  const sheet = await openSignal(user)
  expect(sheet.getByRole('heading', { name: th.map.state.below_threshold })).toBeInTheDocument()
})
it('never calls a pharmacy a state or Red Cross unit, and shows cost words only where they may be shown', () => {
  openApp('/app/list')
  const row = (name: string) => within(screen.getByRole('button', { name: new RegExp(name) }))
  expect(row('ร้านยาชุมชนตัวอย่าง').getByText(`กรุงเทพกลาง · ${th.care.type.pharmacy}`)).toBeInTheDocument()
  expect(row('ร้านยาชุมชนตัวอย่าง').queryByText(new RegExp(th.care.klassA))).toBeNull()
  expect(row('คลินิกชุมชนสีลมตัวอย่าง').queryByText(/ฟรี/)).toBeNull()
  expect(row('คลินิกชุมชนสีลมตัวอย่าง').getByText(/กรุงเทพใต้/)).toBeInTheDocument()
})
it('says where a class B care point is, in plain words', async () => {
  const user = userEvent.setup()
  openApp('/app/list')
  await user.click(screen.getByRole('button', { name: /คลินิกชุมชนสีลมตัวอย่าง/ }))
  const sheet = within(screen.getByRole('dialog'))
  expect(sheet.getByText(th.care.place)).toBeInTheDocument()
  expect(sheet.getByText('กรุงเทพใต้')).toBeInTheDocument()
  expect(sheet.getByText(th.care.klassBNote)).toBeInTheDocument()
  expect(sheet.queryByText(/อนุมัติ/)).toBeNull()
})
it('labels the 72-hour block as a draft and opens a PEP care point from it', async () => {
  const user = userEvent.setup()
  openApp('/app/help')
  expect(screen.getAllByText(th.draftClinical)).toHaveLength(2)
  await user.click(screen.getByRole('button', { name: /คลินิกกาชาดตัวอย่าง/ }))
  expect(screen.getByRole('dialog', { name: 'คลินิกกาชาดตัวอย่าง' })).toBeInTheDocument()
})
it('offers a route to help and to sending a signal from the map', () => {
  openApp('/app')
  expect(screen.getByRole('link', { name: th.report.cta })).toHaveAttribute('href', '/app/report')
  expect(screen.getByRole('link', { name: th.nav.help })).toHaveAttribute('href', '/app/help')
})
