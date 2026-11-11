import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { CARE_POINTS } from '../store/seed'
import { fetchSource, setMapSource } from './source'

afterEach(() => vi.unstubAllGlobals())
const openApp = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
const map = () => document.querySelector('[data-map]') as HTMLElement
const many = () => screen.getByRole('button', { name: th.map.many.replace('{n}', '4') })

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
