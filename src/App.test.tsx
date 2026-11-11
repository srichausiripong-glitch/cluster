import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from './App'

it('shows the demo banner on every route', () => {
  for (const path of ['/', '/app', '/r', '/clinic', '/operator', '/data']) {
    const { unmount } = render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getAllByText('ต้นแบบ ข้อมูลจำลอง').length).toBeGreaterThan(0)
    unmount()
  }
})

it('seeds a demo scenario and the phase from the URL, for deep links and screenshots', async () => {
  const { pub, demo } = await import('./store/stores')
  render(
    <MemoryRouter initialEntries={['/app?seed=threshold&phase=2']}>
      <App />
    </MemoryRouter>,
  )
  expect(pub.get().files).toHaveLength(1)
  expect(demo.get().phase).toBe(2)
})
