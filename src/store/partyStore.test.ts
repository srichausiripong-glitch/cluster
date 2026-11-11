import { expect, it, vi } from 'vitest'
import { createPartyStore } from './partyStore'

it('persists what is set', () => {
  const s = createPartyStore('t.key', { n: 0 })
  s.set({ n: 2 })
  expect(JSON.parse(localStorage.getItem('t.key')!)).toEqual({ n: 2 })
  expect(s.get()).toEqual({ n: 2 })
})
it('falls back to the initial value when stored JSON is broken', () => {
  localStorage.setItem('t.key', '{not json')
  expect(createPartyStore('t.key', { n: 0 }).get()).toEqual({ n: 0 })
})
it('falls back to the initial value when stored JSON has an older shape', () => {
  localStorage.setItem('t.old', '{"x":1}')
  const s = createPartyStore('t.old', { n: 0 }, (v) => typeof (v as { n?: unknown }).n === 'number')
  expect(s.get()).toEqual({ n: 0 })
})
it('re-reads and notifies when another tab or frame writes the key', () => {
  const s = createPartyStore('t.key', { n: 0 })
  const seen = vi.fn()
  s.subscribe(seen)
  localStorage.setItem('t.key', JSON.stringify({ n: 5 }))
  window.dispatchEvent(new StorageEvent('storage', { key: 't.key' }))
  expect(seen).toHaveBeenCalled()
  expect(s.get()).toEqual({ n: 5 })
})
it('returns the same snapshot object until the stored value changes', () => {
  const s = createPartyStore('t.key', { n: 0 })
  s.set({ n: 1 })
  expect(s.get()).toBe(s.get())
})
