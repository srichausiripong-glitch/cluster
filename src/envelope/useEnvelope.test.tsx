import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { wipePhone } from '../store/actions'
import { phone } from '../store/stores'
import { sendIfDue } from './send'
import { useEnvelope } from './useEnvelope'

vi.mock('./send', () => ({ sendIfDue: vi.fn(async () => 'not-due'), forgetEnvelope: vi.fn(), takingNow: vi.fn(() => false) }))
const send = vi.mocked(sendIfDue)

function Probe() {
  useEnvelope()
  return null
}
let visibility: DocumentVisibilityState
beforeEach(() => {
  wipePhone()
  send.mockClear()
  visibility = 'visible'
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
})
afterEach(() => vi.restoreAllMocks())

const settle = () => act(async () => {})
const leaves = () => send.mock.calls.filter((c) => c[3] === true)

it('prepares on open and again when a report is made, then sends on leaving', async () => {
  render(<Probe />)
  await settle()
  expect(send).toHaveBeenCalledTimes(1)
  act(() => phone.update((s) => ({ ...s, pending: { kind: 'tested', zone: 'bang_rak', savedAt: 's1' } })))
  await settle()
  expect(send).toHaveBeenCalledTimes(2)
  visibility = 'hidden'
  act(() => void document.dispatchEvent(new Event('visibilitychange')))
  await settle()
  expect(leaves()).toHaveLength(1)
  expect(send.mock.calls[2][2]).toBe(send.mock.calls[0][2]) // the same visit throughout
})
it('sends on pagehide too', async () => {
  render(<Probe />)
  await settle()
  act(() => void window.dispatchEvent(new Event('pagehide')))
  await settle()
  expect(leaves()).toHaveLength(1)
})
it('does not prepare again for a write that leaves the waiting report as it was', async () => {
  render(<Probe />)
  await settle()
  act(() => phone.update((s) => ({ ...s, sendAt: { week: '2026-W48', at: 1 } })))
  await settle()
  expect(send).toHaveBeenCalledTimes(1)
})

// Deferred minor M3 (send-on-leaving review): a solve that ends after the page is gone starts nothing more.
it('starts no further prepare once unmounted, though one was asked for during a solve', async () => {
  let finish: (r: 'not-due') => void = () => {}
  send.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
  const { unmount } = render(<Probe />)
  act(() => phone.update((s) => ({ ...s, pending: { kind: 'tested', zone: 'bang_rak', savedAt: 's2' } })))
  unmount()
  await act(async () => finish('not-due'))
  expect(send).toHaveBeenCalledTimes(1)
})
