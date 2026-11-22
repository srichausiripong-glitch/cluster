import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { setPharmacySource } from '../data/pharmacies'

afterEach(() => vi.unstubAllGlobals())
const STATE = {
  intakeOpen: true,
  envelopes: [{ week: '2026-W46', n: 1200 }],
  held: [{ id: 3, zone: 'chatuchak', kind: 'syphilis', week: '2026-W46', n: 40, status: 'pending', first_reviewer: 'ก้อย', first_choice: 'release' }],
  suspensions: [{ id: 1, zone: 'bang_kapi', reason: 'เรื่องร้องเรียน', started: '2026-11-15', ended: null }],
  harm: [{ week: '2026-W46', kind: 'outed', n: 2 }],
}
function server(loggedIn: { value: boolean }, state: object = STATE) {
  const calls: Record<string, unknown>[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url !== '/api/admin') return Promise.reject(new Error('offline'))
      const body = JSON.parse(String(init?.body))
      calls.push(body)
      if (body.action === 'login') {
        loggedIn.value = body.password === 'right'
        return new Response(null, { status: loggedIn.value ? 200 : 401 })
      }
      if (!loggedIn.value) return new Response(null, { status: 401 })
      return body.action === 'state' ? new Response(JSON.stringify(state)) : new Response('{"ok":true}')
    }),
  )
  return calls
}
const open = () =>
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <App />
    </MemoryRouter>,
  )

it('asks for a name and password, and says so when they are wrong', async () => {
  const user = userEvent.setup()
  server({ value: false })
  open()
  await user.type(screen.getByLabelText(th.admin.name), 'ก้อย')
  await user.type(screen.getByLabelText(th.admin.password), 'wrong')
  await user.click(screen.getByRole('button', { name: th.admin.login }))
  expect(await screen.findByText(th.admin.loginFailed)).toBeInTheDocument()
})
it('shows the intake switch, the held cells with who chose what, suspensions and harm counts after login', async () => {
  const user = userEvent.setup()
  const calls = server({ value: false })
  open()
  await user.type(screen.getByLabelText(th.admin.name), 'บอล')
  await user.type(screen.getByLabelText(th.admin.password), 'right')
  await user.click(screen.getByRole('button', { name: th.admin.login }))
  expect(await screen.findByRole('button', { name: th.admin.closeIntake })).toBeInTheDocument()
  const held = within(screen.getByRole('region', { name: th.admin.held }))
  expect(held.getByText(/ก้อย/)).toBeInTheDocument()
  await user.click(held.getByRole('button', { name: th.admin.release }))
  expect(calls.at(-2)).toEqual({ action: 'held', id: 3, choice: 'release' })
  expect(within(screen.getByRole('region', { name: th.admin.suspensions })).getByText(/เรื่องร้องเรียน/)).toBeInTheDocument()
  expect(within(screen.getByRole('region', { name: th.admin.harm })).getByText('2')).toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/nonce|ct|epk/)
})

it('offers the 50 districts for a suspension', async () => {
  const user = userEvent.setup()
  server({ value: false })
  open()
  await user.type(screen.getByLabelText(th.admin.name), 'บอล')
  await user.type(screen.getByLabelText(th.admin.password), 'right')
  await user.click(screen.getByRole('button', { name: th.admin.login }))
  const select = await screen.findByLabelText(th.admin.suspend)
  const options = within(select).getAllByRole('option')
  expect(options).toHaveLength(50)
  expect(options.map((o) => o.textContent)).toContain('เขตบางรัก')
})

// A correction about a pharmacy names the shop: the pharmacies are a file of their own, so the page
// reads it, but only when a correction is about one. The code stays beside the name for overrides.json.
const PHARMACY = { id: 'osm-node-111', name: 'ร้านยาทดสอบ', kind: 'pharmacy' as const, layer: 'pharmacy' as const, klass: 'B' as const, lat: 13.7284867, lon: 100.5334461, address: '', free: false, community: false, source: 'https://www.openstreetmap.org/node/111', fetched: '2026-11-18', verified: null }
const login = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(th.admin.name), 'บอล')
  await user.type(screen.getByLabelText(th.admin.password), 'right')
  await user.click(screen.getByRole('button', { name: th.admin.login }))
  await screen.findByRole('button', { name: th.admin.closeIntake })
}
it('names the pharmacy a correction is about, with its district and its code', async () => {
  const user = userEvent.setup()
  setPharmacySource(() => Promise.resolve([PHARMACY]))
  server({ value: false }, { ...STATE, places: [{ week: '2026-W47', place: 'osm-node-111', kind: 'wrong_phone', value: '021234567', n: 2 }] })
  open()
  await login(user)
  const places = within(screen.getByRole('region', { name: th.admin.places }))
  expect(await places.findByText(/ร้านยาทดสอบ/)).toBeInTheDocument()
  expect(places.getByText(/บางรัก/)).toBeInTheDocument()
  expect(places.getByText('osm-node-111')).toBeInTheDocument()
})
it('reads the pharmacy file only when a correction is about a pharmacy', async () => {
  const user = userEvent.setup()
  const load = vi.fn(() => Promise.resolve([PHARMACY]))
  setPharmacySource(load)
  server({ value: false }, { ...STATE, places: [] })
  open()
  await login(user)
  expect(load).not.toHaveBeenCalled()
})
