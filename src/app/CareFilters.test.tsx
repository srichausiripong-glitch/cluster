import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { setCarePoints, type CarePointData } from '../data/carePoints'
import { wipePhone } from '../store/actions'
import { FIXTURE_POINTS } from '../test/carePoints'

// The list's filters (2026-11-18 design, decision 3): open now, PEP and free, together, not kept.

const WEEKDAYS = [1, 2, 3, 4, 5]
const base = FIXTURE_POINTS[0]
const place = (id: string, name: string, over: Partial<CarePointData>): CarePointData => ({ ...base, id, name, pep: false, free: false, ...over })
const OPEN = { open: [{ days: WEEKDAYS, from: '08:00', to: '16:00' }], openSource: 'https://example.go.th/hours', openKind: 'service' as const }
const SHUT = { open: [{ days: [6], from: '08:00', to: '12:00' }], openSource: 'https://example.go.th/hours', openKind: 'service' as const }
const POINTS = [place('fa', 'จุดเอ', { ...OPEN, pep: true }), place('fb', 'จุดบี', { ...SHUT, pep: true, free: true }), place('fc', 'จุดซี', { ...OPEN, free: true })]

const open = () =>
  render(
    <MemoryRouter initialEntries={['/app/list']}>
      <App />
    </MemoryRouter>,
  )
const names = () => within(screen.getByRole('list', { name: th.care.listTitle })).getAllByRole('listitem').map((li) => li.textContent ?? '')
const listed = () => {
  const list = screen.queryByRole('list', { name: th.care.listTitle })
  return list ? names().map((n) => ['จุดเอ', 'จุดบี', 'จุดซี'].find((x) => n.includes(x))).sort() : []
}
const chip = (name: string) => screen.getByRole('button', { name })

beforeEach(() => {
  wipePhone()
  setCarePoints(POINTS)
  vi.useFakeTimers({ toFake: ['Date'] })
  // Wednesday 18 Nov 2026, 10:00 in Bangkok.
  vi.setSystemTime(new Date('2026-11-18T03:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
  setCarePoints(FIXTURE_POINTS)
})

it('filters the list by open now, PEP and free, together, and offers to clear when nothing matches', async () => {
  const user = userEvent.setup()
  open()
  expect(listed()).toEqual(['จุดเอ', 'จุดบี', 'จุดซี'].sort())
  await user.click(chip(th.filters.openNow))
  expect(chip(th.filters.openNow)).toHaveAttribute('aria-pressed', 'true')
  expect(listed()).toEqual(['จุดเอ', 'จุดซี'].sort())
  await user.click(chip(th.filters.pep))
  expect(listed()).toEqual(['จุดเอ'])
  await user.click(chip(th.filters.free))
  expect(listed()).toEqual([])
  expect(screen.getByText(th.filters.none)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: th.filters.clear }))
  expect(listed()).toEqual(['จุดเอ', 'จุดบี', 'จุดซี'].sort())
  expect(chip(th.filters.openNow)).toHaveAttribute('aria-pressed', 'false')
})
it('keeps the filters off when the list opens again', async () => {
  const user = userEvent.setup()
  const view = open()
  await user.click(chip(th.filters.openNow))
  view.unmount()
  open()
  expect(chip(th.filters.openNow)).toHaveAttribute('aria-pressed', 'false')
  expect(listed()).toHaveLength(3)
})
it('says on each row whether a place with known hours is open', () => {
  open()
  const row = (name: string) => within(screen.getByRole('list', { name: th.care.listTitle })).getAllByRole('listitem').find((li) => li.textContent?.includes(name))!
  expect(row('จุดเอ')).toHaveTextContent(th.hours.open.replace('{time}', '16:00'))
  expect(row('จุดบี')).toHaveTextContent(th.hours.closed)
})
