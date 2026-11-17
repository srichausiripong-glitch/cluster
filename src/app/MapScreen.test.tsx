import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import App from '../App'
import { formatThaiDate } from '../copy/format'
import { DISTRICTS, districtLabel } from '../domain/districts'
import { th } from '../copy/th'
import type { PublishedArea } from '../domain/types'
import { setCarePoints } from '../data/carePoints'
import { resetPharmaciesForTest, setPharmacySource } from '../data/pharmacies'
import { setPublishedForTest } from '../map/published'
import type { MapLayer } from '../domain/types'
import { layersOn, MAP_LAYERS, toggleLayer } from '../store/actions'
import { phone } from '../store/stores'
import { FIXTURE_PHARMACIES, FIXTURE_POINTS as CARE_POINTS, FIXTURE_UNVERIFIED } from '../test/carePoints'
import { fakePush } from '../test/fakePush'

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
afterEach(() => {
  setPublishedForTest(null)
  vi.unstubAllGlobals()
})
const openSignal = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: th.map.openSignal }))
  return within(screen.getByRole('dialog'))
}

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
/** What the list shows at first: every place but the pharmacies, whose switch starts off (redesign spec 5.1). */
const AT_FIRST = CARE_POINTS.filter((p) => p.layer !== 'pharmacy')
it('offers a list view with every care point of the layers that are on', () => {
  openApp('/app/list')
  expect(screen.getAllByRole('listitem').length).toBe(AT_FIRST.length)
})
it('carries the city signal and the status card on the list, as on the map', async () => {
  const user = userEvent.setup()
  publish('below')
  openApp('/app/list')
  expect(screen.getByRole('heading', { name: th.home.ask })).toBeInTheDocument()
  const sheet = await openSignal(user)
  expect(sheet.getAllByText(th.map.state.below_threshold).length).toBeGreaterThan(0)
})
it('never calls a pharmacy a state or Red Cross unit, and shows cost words only where they may be shown', () => {
  toggleLayer('pharmacy') // the list follows the map's switches, and pharmacies start off
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
it('offers help and the two status answers on the map, and no check-in or send-signal button', () => {
  openApp('/app')
  expect(screen.getByRole('link', { name: th.nav.help })).toHaveAttribute('href', '/app/help')
  expect(screen.getByRole('button', { name: th.home.clear })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: th.home.found })).toHaveAttribute('href', '/app/report')
  expect(screen.queryByText(/เช็กอิน|ส่งสัญญาณ/)).toBeNull()
})

// ---- the Pop-art map screen, sheets and navigation ---------------------------------------------
it('draws each tab with its emoji above its word', () => {
  openApp('/app')
  for (const label of Object.values(th.nav)) expect(screen.getByRole('link', { name: label }).querySelector('img')).not.toBeNull()
})
it('lists PEP places of both trust levels on the help page, verified first, the unverified one marked call-first', () => {
  // The unverified point comes first in the data, so the order on the page is the app's doing.
  setCarePoints([...FIXTURE_UNVERIFIED, ...CARE_POINTS])
  openApp('/app/help')
  const block = screen.getByRole('heading', { name: th.help.pepTitle }).closest('section')!
  const rows = within(block).getAllByRole('button').map((b) => b.textContent ?? '')
  const at = (name: string) => rows.findIndex((text) => text.includes(name))
  expect(at('ศูนย์บริการสาธารณสุขทดสอบตัวอย่าง')).toBeGreaterThan(at('คลินิกกาชาดตัวอย่าง'))
  expect(at('ศูนย์บริการสาธารณสุขทดสอบตัวอย่าง')).toBeGreaterThan(at('โรงพยาบาลรัฐตัวอย่าง'))
  expect(th.care.unverifiedTag).toBeTruthy()
  expect(rows[at('ศูนย์บริการสาธารณสุขทดสอบตัวอย่าง')]).toContain(th.care.unverifiedTag)
  expect(rows[at('คลินิกกาชาดตัวอย่าง')]).not.toContain(th.care.unverifiedTag)
})
it('credits OpenStreetMap under the ODbL and the BMA’s open data on the help page', () => {
  expect([th.help.creditOsm, th.help.creditOsmLicense, th.help.creditBma].every(Boolean)).toBe(true)
  openApp('/app/help')
  expect(screen.getByRole('link', { name: th.help.creditOsm })).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
  expect(screen.getByRole('link', { name: th.help.creditOsmLicense })).toHaveAttribute('href', 'https://opendatacommons.org/licenses/odbl/')
  expect(screen.getByRole('link', { name: th.help.creditBma })).toHaveAttribute('href', 'https://data.bangkok.go.th')
})
it('credits the emoji set on the help page, with a link to its licence', () => {
  openApp('/app/help')
  expect(screen.getByRole('link', { name: th.help.emojiCredit })).toHaveAttribute('href', 'https://openmoji.org')
  expect(screen.getByRole('link', { name: th.help.emojiLicense })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/4.0/')
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
  expect(screen.getByRole('dialog').getAttribute('aria-label')).toMatch(/^เขต/)
  await user.click(screen.getByRole('button', { name: 'ปิดแผ่นนี้' }))
  await user.click(screen.getByRole('button', { name: th.map.zoomOut }))
  expect(state).toHaveTextContent('กรุงเทพฯ')
})
it('shows the state of the city in a yellow box', () => {
  openApp('/app')
  expect(screen.getByRole('button', { name: th.map.openSignal }).className).toMatch(/\bbg-yellow\b/)
})
it('shows what a state care point costs as a green tag', async () => {
  const user = userEvent.setup()
  openApp('/app/list')
  await user.click(within(screen.getByRole('list')).getByRole('button', { name: /ศูนย์บริการสาธารณสุขตัวอย่าง/ }))
  expect(within(screen.getByRole('dialog')).getByText('ฟรีตามสิทธิ').className).toMatch(/\bbg-leaf\b/)
})
it('keeps a sheet open when a second tap lands on the veil in the instant after it opened', async () => {
  const user = userEvent.setup()
  // The map no longer carries the nearest care point (it moved to the list), so the point opens from the list.
  openApp('/app/list')
  await user.click(within(screen.getByRole('list')).getByRole('button', { name: /ศูนย์บริการสาธารณสุขตัวอย่าง/ }))
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
  await user.click(within(screen.getByRole('list')).getByRole('button', { name: /ศูนย์บริการสาธารณสุขตัวอย่าง/ }))
  const sheet = within(screen.getByRole('dialog'))
  expect(sheet.getByText(formatThaiDate(new Date('2026-11-03')))).toBeInTheDocument()
  expect(sheet.queryByText('2026-11-03')).toBeNull()
})
it('says so, instead of breaking, while no care point has been confirmed', async () => {
  const user = userEvent.setup()
  setCarePoints([])
  const view = openApp('/app')
  const sheet = await openSignal(user)
  expect(sheet.getByRole('link', { name: th.map.sheet.findCare })).toHaveAttribute('href', '/app/list?find=test')
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
it('says on the map that pharmacies show one level in, and says so when their file cannot be read', async () => {
  const user = userEvent.setup()
  setPharmacySource(() => Promise.resolve(FIXTURE_PHARMACIES))
  const view = openApp('/app')
  expect(th.map.pharmaciesZoom).toBeTruthy()
  expect(screen.queryByText(th.map.pharmaciesZoom)).toBeNull()
  await user.click(chip('pharmacy'))
  expect(screen.getByText(th.map.pharmaciesZoom)).toBeInTheDocument()
  await user.click(view.container.querySelector('[data-many]') as HTMLElement)
  await waitFor(() => expect(screen.queryByText(th.map.pharmaciesZoom)).toBeNull())
  view.unmount()
  setPharmacySource(() => Promise.reject(new Error('offline')))
  resetPharmaciesForTest()
  setPharmacySource(() => Promise.reject(new Error('offline')))
  openApp('/app')
  expect(await screen.findByText(th.care.pharmaciesFailed)).toBeInTheDocument()
})
it('shows pharmacies only when 💊 is on and only below city level, each opening its own sheet', async () => {
  const user = userEvent.setup()
  const load = vi.fn(() => Promise.resolve(FIXTURE_PHARMACIES))
  setPharmacySource(load)
  const { container } = openApp('/app')
  await user.click(chip('pharmacy'))
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1))
  // At city level no pharmacy shows, from the file or from the bundled list (cp9 stands alone).
  expect(screen.queryByRole('button', { name: FIXTURE_PHARMACIES[0].name })).toBeNull()
  expect(screen.queryByRole('button', { name: 'ร้านยาบางแคตัวอย่าง' })).toBeNull()
  await user.click(container.querySelector('[data-many]') as HTMLElement)
  await user.click(await screen.findByRole('button', { name: FIXTURE_PHARMACIES[0].name }))
  expect(screen.getByRole('dialog', { name: FIXTURE_PHARMACIES[0].name })).toBeInTheDocument()
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

// ---- round 2: the district sheet reads as three rows of dots ---------------------------------------
const FILE = (areas: PublishedArea[]) => setPublishedForTest({ week: '2026-W46', publishedAt: '2026-11-16T20:00:00Z', intakeOpen: true, areas })
const openArea = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(screen.getByRole('button', { name: new RegExp(`^${name}:`) }))
  return within(await screen.findByRole('dialog'))
}
it('titles a district sheet with its name and shows three rows as dots and words, never a number', async () => {
  const user = userEvent.setup()
  FILE([{ areaId: 'bang_rak', state: 'shown', density: 'dense', step: 'new', testing: 'medium', symptoms: 'thin' }])
  openApp('/app')
  const sheet = await openArea(user, 'บางรัก')
  expect(screen.getByRole('dialog')).toHaveAccessibleName('เขตบางรัก')
  for (const word of ['มาก', 'น้อย', 'ปานกลาง']) expect(sheet.getByRole('img', { name: word })).toBeInTheDocument()
  expect(screen.getByRole('dialog').textContent).not.toMatch(/\d/)
})
it('reads ยังไม่ถึงเกณฑ์ on each row below the threshold, the same whether the district had none or a few', async () => {
  const user = userEvent.setup()
  FILE([area('bang_rak', 'below_threshold')])
  openApp('/app')
  const sheet = await openArea(user, 'บางรัก')
  expect(sheet.getAllByText(th.map.state.below_threshold)).toHaveLength(3)
})
it('shows a suspended district as suspended, with the reason behind ⓘ', async () => {
  const user = userEvent.setup()
  FILE([area('bang_rak', 'suspended')])
  openApp('/app')
  const sheet = await openArea(user, 'บางรัก')
  expect(sheet.queryByText(th.map.sheet.confirmed)).toBeNull()
  await user.click(sheet.getByRole('button', { name: th.map.sheet.suspended }))
  expect(sheet.getByText(th.map.stateHint.suspended)).toBeInTheDocument()
})
it('explains the marks, the age of a signal and what a signal is not, behind ⓘ', async () => {
  const user = userEvent.setup()
  FILE([{ ...area('bkk', 'shown', 'thin', 'new'), symptoms: 'thin' }])
  openApp('/app')
  const sheet = await openSignal(user)
  expect(sheet.queryByText(th.map.legendNotSafe)).toBeNull()
  await user.click(sheet.getByRole('button', { name: th.map.sheet.from }))
  expect(sheet.getByText(th.map.legendNotSafe)).toBeInTheDocument()
  for (const word of [...Object.values(th.map.step), ...Object.values(th.map.keyPins)]) expect(sheet.getAllByText(word).length).toBeGreaterThan(0)
  const dialog = screen.getByRole('dialog')
  // The two levels of trust, each by its mark (redesign spec 5.8).
  expect(sheet.getByText(th.map.keyPins.verified).closest('li')?.querySelector('[data-pin-body]')).not.toBeNull()
  expect(sheet.getByText(th.map.keyPins.unverified).closest('li')?.querySelector('[data-dot]')).not.toBeNull()
  expect(dialog.querySelectorAll('[data-gap]')).toHaveLength(3)
  expect([...dialog.querySelectorAll('[data-dot-r]')].map((el) => Number(el.getAttribute('data-dot-r')))).toEqual([1.2, 2.1, 3.1])
  const tags = sheet.getAllByText(th.map.current)
  expect(tags).toHaveLength(3)
  for (const tag of tags) expect(tag.className).toMatch(/\bbg-yellow\b/)
  // Keyed as drawn: a district below the threshold has no mark (redesign spec 5.7), so no hatch is taught for it.
  const row = sheet.getAllByText(th.map.state.below_threshold).map((el) => el.closest('li')).find((li) => li !== null)!
  expect(row.querySelector('path')?.getAttribute('d')).toBe('')
})
it('leads from a district’s sheet to the places to test there, never counting a pharmacy as one', async () => {
  const user = userEvent.setup()
  const view = openApp('/app')
  let sheet = await openArea(user, 'บางรัก')
  expect(sheet.getByRole('link', { name: th.map.sheet.careHere })).toHaveAttribute('href', '/app/list?district=bang_rak&find=test')
  view.unmount()
  openApp('/app')
  // Bang Khae has only cp9, a pharmacy: not a place to test, so the list leads with its neighbours' places.
  sheet = await openArea(user, 'บางแค')
  expect(sheet.queryByRole('link', { name: th.map.sheet.careHere })).toBeNull()
  expect(sheet.getByRole('link', { name: th.map.sheet.findCare })).toHaveAttribute('href', '/app/list?district=bang_khae&find=test')
})
it('opens the city sheet from the yellow box', async () => {
  const user = userEvent.setup()
  openApp('/app')
  await openSignal(user)
  expect(screen.getByRole('dialog')).toHaveAccessibleName(th.map.city)
})

// ---- round 2: the list tab ----------------------------------------------------------------------
it('puts the status card and the nearest place at the top of the list, and no send-signal button', () => {
  openApp('/app/list')
  expect(screen.getByRole('heading', { name: th.home.ask })).toBeInTheDocument()
  expect(screen.getByText(th.care.nearest)).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /ส่งสัญญาณ/ })).toBeNull()
})
it('says anyone of any age can test', () => {
  openApp('/app/list')
  expect(screen.getByText(th.care.anyAge)).toBeInTheDocument()
})
it('shows only places that test when asked from "ยังไม่ได้ตรวจ?", with a way back to every place', () => {
  openApp('/app/list?find=test')
  expect(screen.queryByRole('button', { name: /ร้านยาชุมชนตัวอย่าง/ })).toBeNull()
  expect(screen.queryByRole('button', { name: /ร้านยาบางแคตัวอย่าง/ })).toBeNull()
  expect(screen.getAllByRole('listitem')).toHaveLength(CARE_POINTS.length - 2)
  expect(screen.getByRole('link', { name: `${th.care.filterTest} ${th.care.showAll}` })).toHaveAttribute('href', '/app/list')
})
it('shows only the places in a district when asked from its sheet', () => {
  openApp('/app/list?district=bang_rak')
  const items = within(screen.getByRole('list', { name: 'เขตบางรัก' })).getAllByRole('listitem')
  expect(items.length).toBeGreaterThan(0)
  for (const item of items) expect(item).toHaveTextContent('เขตบางรัก')
  expect(screen.getByRole('button', { name: 'เขตบางรัก' })).toBeInTheDocument()
})
it('ignores a district that is not one of the 50 and lists every place', () => {
  openApp('/app/list?district=central')
  expect(screen.getAllByRole('listitem')).toHaveLength(AT_FIRST.length)
  expect(screen.getByRole('button', { name: th.care.allDistricts })).toBeInTheDocument()
})
it('names the nearest place as in your district when the phone remembers one with a place in it', () => {
  phone.update((s) => ({ ...s, myDistrict: 'bang_rak' }))
  openApp('/app/list')
  expect(screen.getByText(th.care.inMyDistrict)).toBeInTheDocument()
})
it('shows the nearest place once, as the first of the list', () => {
  phone.update((s) => ({ ...s, myDistrict: 'bang_rak' }))
  openApp('/app/list')
  expect(screen.getAllByRole('button', { name: /คลินิกชุมชนสีลมตัวอย่าง/ })).toHaveLength(1)
  expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('คลินิกชุมชนสีลมตัวอย่าง')
})
it('closes the city sheet on the list when it leads to the places to test', async () => {
  const user = userEvent.setup()
  openApp('/app/list')
  const sheet = await openSignal(user)
  await user.click(sheet.getByRole('link', { name: th.map.sheet.findCare }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('link', { name: `${th.care.filterTest} ${th.care.showAll}` })).toBeInTheDocument()
})
// ---- round 3: the list follows the map's care switches, and a district, and what is near ---------
const careChips = () => within(screen.getByRole('group', { name: th.home.layers }))
it('switches the list’s places with the same layer chips as the map', async () => {
  const user = userEvent.setup()
  setPharmacySource(() => Promise.resolve(FIXTURE_PHARMACIES))
  openApp('/app/list')
  expect(careChips().getAllByRole('button').map((b) => b.textContent)).toEqual((['sti', 'health_centre', 'hospital', 'pharmacy'] as const).map((l) => th.layers[l]))
  await user.click(careChips().getByRole('button', { name: th.layers.hospital }))
  expect(screen.queryByRole('button', { name: /โรงพยาบาลรัฐตัวอย่าง/ })).toBeNull()
  expect(layersOn(phone.get()).hospital).toBe(false)
  await user.click(careChips().getByRole('button', { name: th.layers.pharmacy }))
  await user.click(await screen.findByRole('button', { name: /ร้านยาราชเทวีตัวอย่าง/ }))
  expect(screen.getByRole('dialog', { name: 'ร้านยาราชเทวีตัวอย่าง' })).toBeInTheDocument()
})
it('picks a district from the list and shows its places first, then its neighbours’', async () => {
  const user = userEvent.setup()
  openApp('/app/list')
  await user.click(screen.getByRole('button', { name: th.care.allDistricts }))
  let sheet = within(screen.getByRole('dialog', { name: th.picker.legend }))
  await user.click(sheet.getByRole('radio', { name: 'บางรัก' }))
  await user.click(sheet.getByRole('button', { name: th.picker.use }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(within(screen.getByRole('list', { name: 'เขตบางรัก' })).getByRole('button', { name: /คลินิกชุมชนสีลมตัวอย่าง/ })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: th.care.nearby })).toBeInTheDocument()
  expect(within(screen.getByRole('list', { name: th.care.nearby })).getByRole('button', { name: /คลินิกกาชาดตัวอย่าง/ })).toBeInTheDocument()
  // And back to every district.
  await user.click(screen.getByRole('button', { name: 'เขตบางรัก' }))
  sheet = within(screen.getByRole('dialog', { name: th.picker.legend }))
  await user.click(sheet.getByRole('button', { name: th.care.allDistricts }))
  expect(screen.getAllByRole('listitem')).toHaveLength(AT_FIRST.length)
})
it('shows the neighbouring districts’ places when the chosen district has none', () => {
  openApp('/app/list?district=samphanthawong')
  expect(screen.queryByRole('list', { name: districtLabel('samphanthawong') })).toBeNull()
  expect(screen.getByRole('heading', { name: th.care.nearby })).toBeInTheDocument()
  expect(within(screen.getByRole('list', { name: th.care.nearby })).getAllByRole('listitem').length).toBeGreaterThan(0)
  expect(screen.queryByText(th.care.noneHere)).toBeNull()
})
it('keeps the district when the test filter is cleared', () => {
  openApp('/app/list?district=bang_rak&find=test')
  expect(screen.getByRole('link', { name: `${th.care.filterTest} ${th.care.showAll}` })).toHaveAttribute('href', '/app/list?district=bang_rak')
})
it('says the pharmacy list could not be read when 💊 is on and the file fails', async () => {
  const user = userEvent.setup()
  setPharmacySource(() => Promise.reject(new Error('offline')))
  openApp('/app/list')
  expect(screen.queryByText(th.care.pharmaciesFailed)).toBeNull()
  await user.click(careChips().getByRole('button', { name: th.layers.pharmacy }))
  expect(await screen.findByText(th.care.pharmaciesFailed)).toBeInTheDocument()
})
it('marks a layer that is on with a tick, not by colour alone', () => {
  openApp('/app')
  for (const layer of MAP_LAYERS) {
    const tick = chip(layer).querySelector('[data-tick]')
    if (layer === 'pharmacy') expect(tick, layer).toBeNull()
    else expect(tick, layer).not.toBeNull()
  }
})

// ---- round 4: follow a district (redesign spec 5.11) ------------------------------------------------
it('follows a district from its sheet without sending the district anywhere', async () => {
  const user = userEvent.setup()
  const push = fakePush()
  openApp('/app')
  const sheet = await openArea(user, 'บางรัก')
  await user.click(sheet.getByRole('button', { name: th.follow.button }))
  expect(await sheet.findByRole('button', { name: th.follow.following })).toHaveAttribute('aria-pressed', 'true')
  expect(phone.get().follow).toBe('bang_rak')
  expect(push.calls.map((c) => c.method)).toEqual(['GET', 'POST'])
  expect(JSON.stringify(push.calls)).not.toContain('bang_rak')
})
it('offers to follow another district instead, and stops following from the same press', async () => {
  const user = userEvent.setup()
  fakePush()
  phone.update((s) => ({ ...s, follow: 'bang_rak' }))
  const view = openApp('/app')
  let sheet = await openArea(user, 'จตุจักร')
  expect(sheet.getByRole('button', { name: th.follow.instead })).toHaveAttribute('aria-pressed', 'false')
  view.unmount()
  openApp('/app')
  sheet = await openArea(user, 'บางรัก')
  await user.click(sheet.getByRole('button', { name: th.follow.following }))
  expect(await sheet.findByRole('button', { name: th.follow.button })).toBeInTheDocument()
  expect(phone.get().follow).toBeUndefined()
})
it('explains on an iPhone not added to the home screen that following needs the home screen, and sends nothing', async () => {
  const user = userEvent.setup()
  const push = fakePush({ support: () => 'home-screen' })
  openApp('/app')
  const sheet = await openArea(user, 'บางรัก')
  await user.click(sheet.getByRole('button', { name: th.follow.button }))
  expect(await sheet.findByText(th.follow.homeScreen)).toBeInTheDocument()
  expect(push.calls).toEqual([])
  expect(phone.get().follow).toBeUndefined()
})
it('says how to allow notifications when they are refused', async () => {
  const user = userEvent.setup()
  fakePush({ permission: async () => 'denied' })
  openApp('/app')
  const sheet = await openArea(user, 'บางรัก')
  await user.click(sheet.getByRole('button', { name: th.follow.button }))
  expect(await sheet.findByText(th.follow.denied)).toBeInTheDocument()
})
it('says behind ⓘ that following sends only the push address, never the district', async () => {
  const user = userEvent.setup()
  openApp('/app')
  const sheet = await openArea(user, 'บางรัก')
  await user.click(sheet.getByRole('button', { name: th.follow.only }))
  for (const line of th.follow.details) expect(sheet.getByText(line)).toBeInTheDocument()
  expect(sheet.getAllByRole('link', { name: th.privacy.title }).at(-1)).toHaveAttribute('target', '_blank')
})
it('opens the followed district’s sheet when the app is opened from the notification', () => {
  phone.update((s) => ({ ...s, follow: 'bang_rak' }))
  openApp('/app#follow')
  expect(screen.getByRole('dialog', { name: 'เขตบางรัก' })).toBeInTheDocument()
})
it('gives a district sheet most of a short screen, so the care link and 🔔 show above its fold', async () => {
  const user = userEvent.setup()
  openApp('/app')
  await openArea(user, 'บางรัก')
  expect(screen.getByRole('dialog').className).toMatch(/max-h-\[85dvh\]/)
})
