import { render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from './App'
import { th } from './copy/th'
import { demo, pub } from './store/stores'

function Where() {
  const location = useLocation()
  return <output aria-label="address">{location.pathname + location.search}</output>
}
const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Where />
    </MemoryRouter>,
  )

it('shows the demo banner on the stage and on every back-office route', () => {
  for (const path of ['/stage', '/clinic', '/operator', '/data']) {
    const { unmount } = open(path)
    expect(screen.getAllByText('ต้นแบบ ข้อมูลจำลอง').length).toBeGreaterThan(0)
    unmount()
  }
})
it('keeps the demo banner when embed=1 is added outside a frame', () => {
  open('/clinic?embed=1')
  expect(screen.getByText('ต้นแบบ ข้อมูลจำลอง')).toBeInTheDocument()
})
it('seeds a demo scenario and the phase from the URL, then drops them from the address so a reload does not wipe the demo', () => {
  open('/app?embed=1&seed=threshold&phase=2')
  expect(pub.get().files).toHaveLength(1)
  expect(demo.get()).toMatchObject({ phase: 2, seed: 'threshold' })
  expect(screen.getByRole('status', { name: 'address' })).toHaveTextContent('/app?embed=1')
})

it('opens the app itself at the bare address, and keeps the pitch stage at /stage', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getByRole('navigation', { name: 'เมนูหลัก' })).toBeInTheDocument()
  expect(screen.queryByText(th.stage.title)).toBeNull()
})
it('shows no prototype strip in the app itself, and keeps it on the stage', () => {
  const view = render(
    <MemoryRouter initialEntries={['/app']}>
      <App />
    </MemoryRouter>,
  )
  expect(screen.queryByText(th.demoBanner)).toBeNull()
  view.unmount()
  render(
    <MemoryRouter initialEntries={['/stage']}>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getByText(th.demoBanner)).toBeInTheDocument()
})
