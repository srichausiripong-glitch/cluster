import { act, renderHook, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { expect, it, vi } from 'vitest'
import { FIXTURE_PHARMACIES } from '../test/carePoints'
import { setPharmacySource, usePharmacies } from './pharmacies'

// The pharmacy file is ours, and is read only when 💊 is on (redesign spec 5.8).
const hook = (on: boolean) => renderHook(({ on }) => usePharmacies(on), { initialProps: { on } })

it('reads the pharmacy file only once 💊 is on, and only once', async () => {
  const load = vi.fn(() => Promise.resolve(FIXTURE_PHARMACIES))
  setPharmacySource(load)
  const { result, rerender } = hook(false)
  expect(load).not.toHaveBeenCalled()
  expect(result.current.points).toEqual([])
  rerender({ on: true })
  await waitFor(() => expect(result.current.points.map((p) => p.id)).toEqual(['ph1', 'ph2']))
  expect(result.current.points[0].districtId).toBe('ratchathewi')
  const first = result.current.points
  rerender({ on: true })
  expect(result.current.points).toBe(first)
  rerender({ on: false })
  expect(result.current.points).toEqual([])
  rerender({ on: true })
  expect(result.current.points).toBe(first)
  expect(load).toHaveBeenCalledTimes(1)
})
it('shows no pharmacy and says so when the file cannot be read, and tries again on the next switch', async () => {
  const load = vi.fn(() => Promise.reject(new Error('offline')) as Promise<typeof FIXTURE_PHARMACIES>)
  setPharmacySource(load)
  const { result, rerender } = hook(true)
  await waitFor(() => expect(result.current.failed).toBe(true))
  expect(result.current.points).toEqual([])
  rerender({ on: true })
  expect(load).toHaveBeenCalledTimes(1)
  rerender({ on: false })
  expect(result.current.failed).toBe(false)
  load.mockImplementation(() => Promise.resolve(FIXTURE_PHARMACIES))
  rerender({ on: true })
  await waitFor(() => expect(result.current.points).toHaveLength(2))
  expect(result.current.failed).toBe(false)
  expect(load).toHaveBeenCalledTimes(2)
})
it('serves the pharmacy file itself, not the app page, at /care/', () => {
  expect(JSON.parse(readFileSync('vercel.json', 'utf8')).rewrites[0].source).toContain('care/')
})
it('stops waiting for a pharmacy file that never comes, says so, and asks again on the next switch', async () => {
  vi.useFakeTimers()
  try {
    const load = vi.fn(() => new Promise<typeof FIXTURE_PHARMACIES>(() => {}))
    setPharmacySource(load)
    const { result, rerender } = hook(true)
    expect(result.current.failed).toBe(false)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000)
    })
    expect(result.current.failed).toBe(true)
    rerender({ on: false })
    rerender({ on: true })
    expect(load).toHaveBeenCalledTimes(2)
  } finally {
    vi.useRealTimers()
  }
})
it('treats a file that is not a list of places as one it could not read', async () => {
  setPharmacySource(() => Promise.resolve({ elements: [] } as unknown as typeof FIXTURE_PHARMACIES))
  const { result } = hook(true)
  await waitFor(() => expect(result.current.failed).toBe(true))
  expect(result.current.points).toEqual([])
})
