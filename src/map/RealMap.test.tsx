import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { CARE_POINTS } from '../store/seed'
import { fakeCtx } from '../test/fakeCtx'
import { STUB_MANIFEST, stubSource } from '../test/mapStub'
import { zoneAt } from './areas'
import { RealMap } from './RealMap'
import { fetchSource, setMapSource } from './source'
import { cityView, MAP_INSET, viewAt } from './view'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
const openApp = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
const map = () => document.querySelector('[data-map]') as HTMLElement
const many = () => screen.getByRole('button', { name: th.map.many.replace('{n}', '4') })
const zoomIn = () => screen.getByRole('button', { name: th.map.zoomIn })
/** Where a marker or a name box sits: the first two numbers of its transform. */
const spot = (el: Element) => {
  const [x, y] = (el.getAttribute('transform') ?? '').match(/-?[\d.]+/g)!.map(Number)
  return { x, y }
}

it('starts at the whole-city level and says which level it is', () => {
  openApp('/app')
  expect(map()).toHaveAttribute('data-level', 'city')
  expect(screen.getByRole('status', { name: th.map.levelNow })).toHaveTextContent(th.map.level.city)
})
it('credits OpenStreetMap on the map', () => {
  openApp('/app')
  expect(screen.getByText(th.map.credit)).toBeInTheDocument()
})
it('writes the six zone names in white boxes with a black edge', () => {
  openApp('/app?phase=2')
  const boxes = [...document.querySelectorAll('[data-caption]')]
  expect(boxes.map((b) => b.textContent).sort()).toEqual(['กรุงธนเหนือ', 'กรุงธนใต้', 'กรุงเทพกลาง', 'กรุงเทพตะวันออก', 'กรุงเทพเหนือ', 'กรุงเทพใต้'].sort())
  for (const b of boxes) {
    expect(b.querySelector('rect[data-face]')).toHaveAttribute('fill', 'var(--color-surface)')
    expect(b.querySelector('rect[data-face]')).toHaveAttribute('stroke', 'var(--color-ink)')
    expect(b.querySelector('text')).toHaveAttribute('fill', 'var(--color-ink)')
  }
})
it('asks only for its own map files, never another site', async () => {
  const asked: string[] = []
  vi.stubGlobal('fetch', (url: string) => {
    asked.push(String(url))
    return Promise.resolve(new Response('{}'))
  })
  setMapSource(fetchSource())
  openApp('/app')
  await waitFor(() => expect(asked.length).toBeGreaterThan(0))
  expect(asked.filter((url) => !url.startsWith(`${import.meta.env.BASE_URL}map/`))).toEqual([])
})
it('gathers care points that sit close together into one numbered marker, and separates them one level in', async () => {
  const user = userEvent.setup()
  openApp('/app')
  expect(many()).toHaveAttribute('data-many', '4')
  expect(screen.queryByRole('button', { name: CARE_POINTS[0].name })).toBeNull()
  await user.click(many())
  expect(map()).toHaveAttribute('data-level', 'district')
  expect(screen.getByRole('button', { name: CARE_POINTS[0].name })).toBeInTheDocument()
  expect(screen.getByRole('status', { name: th.map.levelNow })).toHaveTextContent(th.map.level.district)
})
it('opens a grouped marker from the keyboard, and keeps every marker a named button at each level', async () => {
  const user = userEvent.setup()
  openApp('/app')
  many().focus()
  await user.keyboard('{Enter}')
  expect(map()).toHaveAttribute('data-level', 'district')
  const pins = [...document.querySelectorAll('.map-pin')]
  expect(pins.length).toBeGreaterThan(0)
  pins.forEach((pin) => {
    expect(pin).toHaveAttribute('role', 'button')
    expect(pin).toHaveAttribute('tabindex', '0')
    expect(pin.getAttribute('aria-label')).toBeTruthy()
  })
})
it('goes one level in and out with the two buttons', async () => {
  const user = userEvent.setup()
  openApp('/app')
  await user.click(screen.getByRole('button', { name: th.map.zoomIn }))
  expect(map()).toHaveAttribute('data-level', 'district')
  await user.click(screen.getByRole('button', { name: th.map.zoomOut }))
  expect(map()).toHaveAttribute('data-level', 'city')
  expect(screen.getByRole('button', { name: th.map.zoomOut })).toBeDisabled()
})
it('draws a pin in pink with a black outline and a black mark, and names the selected one above it', async () => {
  const user = userEvent.setup()
  openApp('/app')
  const pin = screen.getByRole('button', { name: CARE_POINTS[2].name })
  expect(pin.querySelector('[data-pin-body]')).toHaveAttribute('fill', 'var(--color-care)')
  expect(pin.querySelector('[data-pin-body]')).toHaveAttribute('stroke', 'var(--color-ink)')
  expect(pin.querySelector('[data-glyph]')?.getAttribute('stroke') ?? pin.querySelector('[data-glyph]')?.getAttribute('fill')).toBe('var(--color-ink)')
  await user.click(pin)
  expect(document.querySelector('[data-bubble]')).toHaveTextContent(CARE_POINTS[2].name)
})

it('goes one level in on a double click, at the place that was clicked', async () => {
  const user = userEvent.setup()
  openApp('/app')
  await user.dblClick(map())
  expect(map()).toHaveAttribute('data-level', 'district')
})
it('goes down to street level where the prototype has street map in view, and stops there', async () => {
  const user = userEvent.setup()
  openApp('/app')
  await user.click(zoomIn())
  await user.click(zoomIn())
  expect(map()).toHaveAttribute('data-level', 'street')
  expect(zoomIn()).toBeDisabled()
  expect(screen.queryByText(th.map.noDetail)).toBeNull()
})
it('stops where the prototype has no deeper map, and says why, without going blank', async () => {
  setMapSource(stubSource({ manifest: () => Promise.resolve({ ...STUB_MANIFEST, street: [] }) }))
  const user = userEvent.setup()
  openApp('/app?phase=2')
  await user.click(zoomIn())
  expect(map()).toHaveAttribute('data-level', 'district')
  expect(zoomIn()).toBeDisabled()
  expect(screen.getByText(th.map.noDetail)).toBeInTheDocument()
  expect(document.querySelectorAll('.map-area').length).toBeGreaterThan(0)
})
it('keeps zones, markers and sheets working when the map files cannot be loaded', async () => {
  setMapSource(stubSource({ city: () => Promise.reject(new Error('offline')) }))
  const user = userEvent.setup()
  openApp('/app?phase=2')
  await waitFor(() => expect(screen.getByText(th.map.loadFailed)).toBeInTheDocument())
  // The city and its six zones.
  expect(document.querySelectorAll('.map-area')).toHaveLength(7)
  await user.click(screen.getByRole('button', { name: CARE_POINTS[2].name }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})
it('does not open a marker at the end of a drag', () => {
  openApp('/app')
  const pin = screen.getByRole('button', { name: CARE_POINTS[2].name })
  fireEvent.pointerDown(map(), { pointerId: 1, clientX: 200, clientY: 300 })
  fireEvent.pointerMove(map(), { pointerId: 1, clientX: 240, clientY: 330 })
  fireEvent.pointerUp(map(), { pointerId: 1, clientX: 240, clientY: 330 })
  fireEvent.click(pin)
  expect(screen.queryByRole('dialog')).toBeNull()
})
it('moves the map with one finger', () => {
  openApp('/app')
  const before = spot(screen.getByRole('button', { name: CARE_POINTS[2].name }))
  fireEvent.pointerDown(map(), { pointerId: 1, clientX: 200, clientY: 300 })
  fireEvent.pointerMove(map(), { pointerId: 1, clientX: 240, clientY: 330 })
  const after = spot(screen.getByRole('button', { name: CARE_POINTS[2].name }))
  expect(after.x - before.x).toBeCloseTo(40, 0)
  expect(after.y - before.y).toBeCloseTo(30, 0)
})
it('changes one level for one two-finger gesture, however far the fingers move', () => {
  openApp('/app')
  fireEvent.pointerDown(map(), { pointerId: 1, clientX: 150, clientY: 300 })
  fireEvent.pointerDown(map(), { pointerId: 2, clientX: 250, clientY: 300 })
  fireEvent.pointerMove(map(), { pointerId: 2, clientX: 330, clientY: 300 })
  fireEvent.pointerMove(map(), { pointerId: 2, clientX: 600, clientY: 300 })
  expect(map()).toHaveAttribute('data-level', 'district')
})
it('brings a selected care point into the clear space under the chips', async () => {
  const user = userEvent.setup()
  openApp('/app')
  await user.click(screen.getByRole('button', { name: CARE_POINTS[2].name }))
  expect(spot(screen.getByRole('button', { name: CARE_POINTS[2].name, hidden: true })).y).toBeCloseTo(160, 0)
})
it('tells the screen which level and which zone it is showing', async () => {
  const seen = vi.fn()
  const user = userEvent.setup()
  const phone = { w: 390, h: 714, inset: MAP_INSET }
  render(<RealMap areas={[]} cityState="no_data" carePoints={[]} phase={2} showSignal onSelectArea={() => {}} onSelectCarePoint={() => {}} onView={seen} />)
  await user.click(zoomIn())
  const centre = viewAt(STUB_MANIFEST, phone, 'district', [cityView(phone).cx, cityView(phone).cy])
  expect(seen).toHaveBeenLastCalledWith({ level: 'district', zoneId: zoneAt([centre.cx, centre.cy])?.id ?? null })
})
it('keeps still for a person who asks for reduced motion', () => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), addEventListener() {}, removeEventListener() {} }))
  const frames = vi.fn(() => 0)
  vi.stubGlobal('requestAnimationFrame', frames)
  openApp('/app?phase=2')
  expect(map()).toHaveAttribute('data-still')
  expect(frames).not.toHaveBeenCalled()
  expect(document.querySelector('.pop-in')).toBeNull()
})
it('lets the newest zone breathe and the markers pop in when motion is allowed', () => {
  const frames = vi.fn(() => 0)
  vi.stubGlobal('requestAnimationFrame', frames)
  openApp('/app?phase=2')
  expect(map()).not.toHaveAttribute('data-still')
  expect(frames).toHaveBeenCalled()
  expect(document.querySelector('.pop-in')).not.toBeNull()
})

// ---- drawing while the map is dragged ----------------------------------------------------------
/** The three canvases together: what is moved when the last picture is carried with the finger. */
const picture = () => map().querySelector('[data-picture]') as HTMLElement
/** Gives the map a canvas that records what is drawn, and a clock on which every paint takes `cost` milliseconds. */
function drawing(cost: number) {
  const fake = fakeCtx()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fake.ctx as never)
  let time = 0
  vi.spyOn(performance, 'now').mockImplementation(() => (time += cost))
  return fake
}
const dragBy = (dx: number, dy: number) => {
  fireEvent.pointerDown(map(), { pointerId: 1, clientX: 200, clientY: 300 })
  fireEvent.pointerMove(map(), { pointerId: 1, clientX: 200 + dx, clientY: 300 + dy })
}

it('draws the map again at every move of the finger where drawing is quick', () => {
  const fake = drawing(0.5)
  openApp('/app')
  const before = fake.calls.length
  expect(before).toBeGreaterThan(0)
  dragBy(40, 30)
  expect(fake.calls.length).toBeGreaterThan(before)
  expect(picture().style.transform).toBe('')
})
it('carries the last picture with the finger where drawing is slow, and draws again when the finger lifts', () => {
  const fake = drawing(20)
  openApp('/app')
  const before = fake.calls.length
  dragBy(40, 30)
  expect(fake.calls.length).toBe(before)
  expect(picture().style.transform).toBe('translate(40px, 30px)')
  fireEvent.pointerUp(map(), { pointerId: 1, clientX: 240, clientY: 330 })
  expect(fake.calls.length).toBeGreaterThan(before)
  expect(picture().style.transform).toBe('')
})
it('draws again when the finger rests in a slow drag, so a long drag does not leave the map blank', async () => {
  const fake = drawing(20)
  openApp('/app')
  dragBy(40, 30)
  const carried = fake.calls.length
  expect(picture().style.transform).toBe('translate(40px, 30px)')
  await waitFor(() => expect(picture().style.transform).toBe(''))
  expect(fake.calls.length).toBeGreaterThan(carried)
})
it('draws at once when the level changes, however slow drawing is', async () => {
  const fake = drawing(20)
  const user = userEvent.setup()
  openApp('/app')
  await user.click(zoomIn())
  const atDistrict = fake.calls.length
  await user.click(screen.getByRole('button', { name: th.map.zoomOut }))
  expect(fake.calls.length).toBeGreaterThan(atDistrict)
  expect(picture().style.transform).toBe('')
})
