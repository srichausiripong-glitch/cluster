import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import App from '../App'
import { th } from '../copy/th'

afterEach(() => vi.unstubAllGlobals())
it('lists every decision with the reviewer, the suspensions and the weekly envelope totals', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url === '/api/transparency'
        ? new Response(JSON.stringify({ decisions: [{ day: '2026-11-15', reviewer: 'ก้อย', action: 'suspend', detail: 'east: เรื่องร้องเรียน' }], held: [], suspensions: [{ zone: 'east', reason: 'เรื่องร้องเรียน', started: '2026-11-15', ended: null }], envelopes: [{ week: '2026-W46', n: 1200 }] }))
        : Promise.reject(new Error('offline')),
    ),
  )
  render(
    <MemoryRouter initialEntries={['/transparency']}>
      <App />
    </MemoryRouter>,
  )
  expect(await screen.findByText(/ก้อย/)).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 1, name: th.transparency.title })).toBeInTheDocument()
  expect(screen.getByText('1200')).toBeInTheDocument()
  expect(screen.getAllByText(/กรุงเทพตะวันออก/).length).toBeGreaterThan(0)
})
