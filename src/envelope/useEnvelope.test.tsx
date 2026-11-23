import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { wipePhone } from '../store/actions'
import { phone } from '../store/stores'
import { sendIfDue } from './send'
import { useEnvelope } from './useEnvelope'

vi.mock('./send', () => ({ sendIfDue: vi.fn(async () => 'not-due') }))
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

it('prepares on open and again when a report is made, then sends on leaving with the report marked', async () => {
  render(<Probe />)
  await settle()
  expect(send).toHaveBeenCalledTimes(1)
  expect(send.mock.calls[0][2]).toMatchObject({ reported: false })
  act(() => phone.update((s) => ({ ...s, pending: { kind: 'tested', zone: 'bang_rak', savedAt: 's1' } })))
  await settle()
  expect(send).toHaveBeenCalledTimes(2)
  visibility = 'hidden'
  act(() => void document.dispatchEvent(new Event('visibilitychange')))
  await settle()
  expect(leaves()).toHaveLength(1)
  expect(leaves()[0][2]).toMatchObject({ reported: true })
})
it('sends on pagehide too', async () => {
  render(<Probe />)
  await settle()
  act(() => void window.dispatchEvent(new Event('pagehide')))
  await settle()
  expect(leaves()).toHaveLength(1)
  expect(leaves()[0][2]).toMatchObject({ reported: false })
})
it('does not count a write that leaves the waiting report as it was as a report', async () => {
  render(<Probe />)
  await settle()
  act(() => phone.update((s) => ({ ...s, sendAt: { week: '2026-W48', at: 1 } })))
  await settle()
  act(() => void window.dispatchEvent(new Event('pagehide')))
  await settle()
  expect(leaves()[0][2]).toMatchObject({ reported: false })
})
