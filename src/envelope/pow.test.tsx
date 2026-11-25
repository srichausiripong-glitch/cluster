import { expect, it, vi } from 'vitest'
import { powOk } from '../domain/envelope'
import { hashHex, solvePow } from './pow'

it('finds a counter that gives enough leading zero bits', async () => {
  const counter = await solvePow('2026-W46:abc', 8)
  expect(powOk(await hashHex(`2026-W46:abc:${counter}`), 8)).toBe(true)
})
it('checks the phone for its envelope when the app opens', async () => {
  const fetch = vi.fn(() => Promise.reject(new Error('offline')))
  vi.stubGlobal('fetch', fetch)
  const { render } = await import('@testing-library/react')
  const { MemoryRouter } = await import('react-router-dom')
  const { default: App } = await import('../App')
  render(
    <MemoryRouter initialEntries={['/app']}>
      <App />
    </MemoryRouter>,
  )
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/key'))
  vi.unstubAllGlobals()
})
