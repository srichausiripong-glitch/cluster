import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it } from 'vitest'
import App from '../App'
import { formatThaiDate } from '../copy/format'
import { DISTRICTS } from '../domain/districts'
import { th } from '../copy/th'
import type { PublishedArea } from '../domain/types'
import { setCarePoints } from '../data/carePoints'
import { setPublishedForTest } from '../map/published'
import type { MapLayer } from '../domain/types'
import { MAP_LAYERS } from '../store/actions'
import { FIXTURE_POINTS as CARE_POINTS } from '../test/carePoints'

const openApp = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
const area = (areaId: string, state: PublishedArea['state'], density: PublishedArea['density'] = null, step: PublishedArea['step'] = null): PublishedArea => ({ areaId, state, density, step, testing: null, symptoms: null })
/** What the weekly file says: the city thin and new, as twelve fresh reports would make it; the zones in every state. */
const SHOWN = [area('bkk', 'shown', 'thin', 'new'), area('bang_rak', 'shown', 'dense', 'new'), area('ratchathewi', 'shown', 'medium', 'followup'), area('chatuchak', 'shown', 'thin', 'expiring'), area('bang_kapi', 'below_threshold'), area('bangkok_yai', 'no_data'), area('bang_khae', 'no_data')]
const publish = (which: 'shown' | 'below') => setPublishedForTest({ week: '2026-W46', publishedAt: '2026-11-16T20:00:00Z', intakeOpen: true, areas: which === 'shown' ? SHOWN : [area('bkk', 'below_threshold'), area('bang_rak', 'below_threshold')] })
afterEach(() => setPublishedForTest(null))
const openSignal = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: th.map.openSignal }))
  return within(screen.getByRole('dialog'))
}

it('explains that a faded or empty area is not safe, and never shows the count behind the signal', async () => {
  const user = userEvent.setup()
  publish('shown')
  openApp('/app')
  const sheet = await openSignal(user)
  expect(sheet.getByText(th.map.legendNotSafe)).toBeInTheDocument()
  expect(sheet.getByText(th.map.density.thin)).toHaveAttribute('aria-current', 'true')
  expect(document.body.textContent).not.toMatch(/(^|[^0-9:])12([^0-9:]|$)/)
})
it('shows the below-threshold state as its own visible state', async () => {
  const user = userEvent.setup()
  publish('below')
  openApp('/app')
  const sheet = await openSignal(user)
  expect(sheet.getByRole('heading', { name: th.map.state.below_threshold })).toBeInTheDocument()
})
it('teaches every mark in the legend: dot sizes, edges, quiet states and pin shapes', async () => {
  const user = userEvent.setup()
  publish('shown')
  openApp('/app')
  const sheet = await openSignal(user)
  expect(sheet.getByText(th.map.key)).toBeInTheDocument()
  for (const label of [th.map.state.below_threshold, th.map.state.no_data, th.map.state.suspended, th.map.keyPins.clinic, th.map.keyPins.pharmacy, th.map.keyPins.lab]) expect(sheet.getAllByText(label).length).toBeGreaterThan(0)
  expect(sheet.getAllByText(th.map.current).length).toBe(2)
  const dots = [...screen.getByRole('dialog').querySelectorAll('[data-dot-r]')].map((el) => Number(el.getAttribute('data-dot-r')))
  expect(dots.slice(0, 3)).toEqual([1.2, 2.1, 3.1])
  expect(sheet.getByText(th.map.source, { exact: false })).toBeInTheDocument()
})
it('pairs the signal sheet with a care point', async () => {
  const user = userEvent.setup()
  publish('below')
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
it('names the city by its published state, and makes every zone reachable', () => {
  publish('shown')
  const view = openApp('/app')
  expect(screen.getByRole('button', { name: `กรุงเทพฯ: ${th.map.state.shown}` })).toBeInTheDocument()
  view.unmount()
  openApp('/app')
  expect(screen.getByRole('button', { name: `บางรัก: ${th.map.state.shown}` })).toHaveAttribute('tabindex', '0')
  expect(screen.getByRole('button', { name: `บางแค: ${th.map.state.no_data}` })).toBeInTheDocument()
})
it('gives every marker a 44 px target and marks the selected one', async () => {
  const user = userEvent.setup()
  const { container } = openApp('/app')
  const hits = container.querySelectorAll('[data-hit]')
  expect(hits).toHaveLength(container.querySelectorAll('.map-pin').length)
  hits.forEach((hit) => expect(Number(hit.getAttribute('r'))).toBeGreaterThanOrEqual(22))
  const pin = screen.getByRole('button', { name: CARE_POINTS[2].name })
  await user.click(pin)
  expect(pin).toHaveAttribute('data-selected', 'true')
  expect(within(screen.getByRole('dialog')).getByText(th.care.place)).toBeInTheDocument()
})
it('offers a list view with every care point', () => {
  openApp('/app/list')
  expect(screen.getAllByRole('listitem').length).toBe(CARE_POINTS.length)
})
it('carries the area signal and the send-signal button on the list, as on the map', async () => {
  const user = userEvent.setup()
  publish('below')
  openApp('/app/list')
  expect(screen.getByRole('link', { name: th.report.cta })).toHaveAttribute('href', '/app/report')
  const sheet = await openSignal(user)
  expect(sheet.getByRole('heading', { name: th.map.state.below_threshold })).toBeInTheDocument()
})
it('never calls a pharmacy a state or Red Cross unit, and shows cost words only where they may be shown', () => {
  openApp('/app/list')
  const row = (name: string) => within(screen.getByRole('button', { name: new RegExp(name) }))
  expect(row('ร้านยาชุมชนตัวอย่าง').getByText(`เขตราชเทวี · ${th.care.type.pharmacy}`)).toBeInTheDocument()
  expect(row('ร้านยาชุมชนตัวอย่าง').queryByText(new RegExp(th.care.klassA))).toBeNull()
  expect(row('คลินิกชุมชนสีลมตัวอย่าง').queryByText(/ฟรี/)).toBeNull()
  expect(row('คลินิกชุมชนสีลมตัวอย่าง').getByText(/เขตบางรัก/)).toBeInTheDocument()
})
it('says where a class B care point is, in plain words', async () => {
  const user = userEvent.setup()
  openApp('/app/list')
  await user.click(screen.getByRole('button', { name: /คลินิกชุมชนสีลมตัวอย่าง/ }))
  const sheet = within(screen.getByRole('dialog'))
  expect(sheet.getByText(th.care.place)).toBeInTheDocument()
  expect(sheet.getByText('เขตบางรัก')).toBeInTheDocument()
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

// ---- the Pop-art map screen, sheets and navigation ---------------------------------------------
it('draws each tab with its emoji above its word', () => {
  openApp('/app')
  for (const label of Object.values(th.nav)) expect(screen.getByRole('link', { name: label }).querySelector('img')).not.toBeNull()
})
it('credits the emoji set on the help page', () => {
  openApp('/app/help')
  expect(screen.getByRole('link', { name: th.help.emojiCredit })).toHaveAttribute('href', 'https://openmoji.org')
})
it('marks the current tab by a filled shape, not by colour alone', () => {
  openApp('/app/list')
  const current = screen.getByRole('link', { name: th.nav.list })
  expect(current).toHaveAttribute('aria-current', 'page')
  expect(current.querySelector('[data-active-pill]')).not.toBeNull()
  expect(screen.getByRole('link', { name: th.nav.map }).querySelector('[data-active-pill]')).toBeNull()
})
it('names the zone in view, in place of the city, once the map is below city level', async () => {
  const user = userEvent.setup()
  openApp('/app')
  const state = screen.getByRole('button', { name: th.map.openSignal })
  expect(state).toHaveTextContent('กรุงเทพฯ')
  await user.click(screen.getByRole('button', { name: th.map.zoomIn }))
  expect(state.textContent).toMatch(new RegExp(DISTRICTS.map((d) => d.name).join('|')))
  expect(state).not.toHaveTextContent('กรุงเทพฯ')
  await user.click(state)
  expect(screen.getByRole('dialog').getAttribute('aria-label')).toMatch(/^สัญญาณของเขต/)
  await user.click(screen.getByRole('button', { name: 'ปิดแผ่นนี้' }))
  await user.click(screen.getByRole('button', { name: th.map.zoomOut }))
  expect(state).toHaveTextContent('กรุงเทพฯ')
})
it('shows the state of the city in a yellow box and the send button in pink with a ripple', () => {
  openApp('/app')
  expect(screen.getByRole('button', { name: th.map.openSignal }).className).toMatch(/\bbg-yellow\b/)
  const send = screen.getByRole('link', { name: th.report.cta })
  expect(send.className).toMatch(/\bbg-care\b/)
  expect(send.className).toMatch(/\bripple\b/)
})
it('marks the value that applies now with a yellow tag', async () => {
  const user = userEvent.setup()
  publish('shown')
  openApp('/app')
  const sheet = await openSignal(user)
  const tags = sheet.getAllByText(th.map.current)
  expect(tags.length).toBeGreaterThan(0)
  for (const tag of tags) expect(tag.className).toMatch(/\bbg-yellow\b/)
})
it('shows what a state care point costs as a green tag', async () => {
  const user = userEvent.setup()
  openApp('/app/list')
  await user.click(screen.getByRole('button', { name: /ศูนย์บริการสาธารณสุขตัวอย่าง/ }))
  expect(within(screen.getByRole('dialog')).getByText('ฟรีตามสิทธิ').className).toMatch(/\bbg-leaf\b/)
})
it('keeps a sheet open when a second tap lands on the veil in the instant after it opened', async () => {
  const user = userEvent.setup()
  openApp('/app')
  await user.click(screen.getByRole('button', { name: /ศูนย์บริการสาธารณสุขตัวอย่าง/ }))
  const veil = screen.getByRole('dialog').previousElementSibling as HTMLElement
  await user.click(veil)
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  await new Promise((done) => setTimeout(done, 350))
  await user.click(veil)
  expect(screen.queryByRole('dialog')).toBeNull()
})
it('writes the day a care point was last checked in Thai, not as a raw date', async () => {
  const user = userEvent.setup()
  openApp('/app/list')
  await user.click(screen.getByRole('button', { name: /ศูนย์บริการสาธารณสุขตัวอย่าง/ }))
  const sheet = within(screen.getByRole('dialog'))
  expect(sheet.getByText(formatThaiDate(new Date('2026-11-03')))).toBeInTheDocument()
  expect(sheet.queryByText('2026-11-03')).toBeNull()
})
it('says so, instead of breaking, while no care point has been confirmed', async () => {
  const user = userEvent.setup()
  setCarePoints([])
  const view = openApp('/app')
  expect(screen.getByText(th.care.noneVerified)).toBeInTheDocument()
  const sheet = await openSignal(user)
  expect(sheet.queryByText(th.map.pair)).toBeNull()
  view.unmount()
  openApp('/app/list')
  expect(screen.getByText(th.care.noneVerified)).toBeInTheDocument()
})
it('links a private clinic to its own public page', async () => {
  const user = userEvent.setup()
  openApp('/app/list')
  await user.click(screen.getByRole('button', { name: /คลินิกชุมชนสีลมตัวอย่าง/ }))
  const link = within(screen.getByRole('dialog')).getByRole('link', { name: th.care.linkOut })
  expect(link).toHaveAttribute('href', 'https://example.org/care')
  expect(link).toHaveAttribute('target', '_blank')
})

it('shows the symptoms level of a district in its sheet, under the district name', async () => {
  const user = userEvent.setup()
  setPublishedForTest({ week: '2026-W46', publishedAt: '2026-11-16T20:00:00Z', intakeOpen: true, areas: [{ ...area('bang_rak', 'below_threshold'), symptoms: 'medium' }] })
  openApp('/app')
  await user.click(screen.getByRole('button', { name: /^บางรัก:/ }))
  const sheet = within(await screen.findByRole('dialog'))
  expect(sheet.getByText(`${th.map.symptoms}: ${th.map.symptomsLevel.medium}`)).toBeInTheDocument()
  expect(sheet.getByRole('heading', { name: 'สัญญาณของเขตบางรัก' })).toBeInTheDocument()
})

it('keys "ยังไม่ถึงเกณฑ์" with the plain look the map draws for a district, not a hatch', async () => {
  const user = userEvent.setup()
  publish('shown')
  openApp('/app')
  const sheet = await openSignal(user)
  const row = sheet.getAllByText(th.map.state.below_threshold).map((el) => el.closest('li')).find((li) => li !== null)!
  expect(row.querySelector('path')?.getAttribute('d')).toBe('')
})

// ---- round 2: six layer switches over the map ---------------------------------------------------
const chip = (layer: MapLayer) => screen.getByRole('button', { name: th.layers[layer] })
it('offers the six layers as switches, all on but pharmacies, and remembers a change', async () => {
  const user = userEvent.setup()
  const view = openApp('/app')
  for (const layer of MAP_LAYERS) expect(chip(layer)).toHaveAttribute('aria-pressed', layer === 'pharmacy' ? 'false' : 'true')
  await user.click(chip('pharmacy'))
  view.unmount()
  openApp('/app')
  expect(chip('pharmacy')).toHaveAttribute('aria-pressed', 'true')
})
it('hides the places of a care layer that is off, and pharmacies until asked', async () => {
  const user = userEvent.setup()
  openApp('/app')
  expect(screen.queryByRole('button', { name: 'ร้านยาบางแคตัวอย่าง' })).toBeNull()
  expect(screen.getByRole('button', { name: 'โรงพยาบาลรัฐตัวอย่าง' })).toBeInTheDocument()
  await user.click(chip('hospital'))
  expect(screen.queryByRole('button', { name: 'โรงพยาบาลรัฐตัวอย่าง' })).toBeNull()
})
it('switches the confirmed signal and the symptoms hatch from their own chips', async () => {
  const user = userEvent.setup()
  openApp('/app')
  const m = document.querySelector('[data-map]')!
  expect(m).toHaveAttribute('data-signal')
  await user.click(chip('confirmed'))
  expect(m).not.toHaveAttribute('data-signal')
  expect(m).toHaveAttribute('data-symptoms')
  await user.click(chip('symptoms'))
  expect(m).not.toHaveAttribute('data-symptoms')
})
it('keeps the six chips in one row that scrolls on its own, so a 320 px screen never scrolls sideways', () => {
  openApp('/app')
  const row = screen.getByRole('group', { name: th.home.layers })
  expect(row.className).toMatch(/\boverflow-x-auto\b/)
  for (const b of within(row).getAllByRole('button')) expect(b.className).toMatch(/\bshrink-0\b/)
})
