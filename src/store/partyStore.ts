import { useSyncExternalStore } from 'react'

export interface PartyStore<T> {
  get(): T
  set(next: T): void
  update(fn: (state: T) => T): void
  subscribe(fn: () => void): () => void
  reset(): void
}

/**
 * One party's data, persisted under its own localStorage key. Separate keys stand in
 * for separate machines; `storage` events keep other tabs and frames in step, so the
 * phone view and the clinic console behave like two devices.
 */
export function createPartyStore<T>(key: string, initial: T, isValid: (value: unknown) => boolean = () => true): PartyStore<T> {
  const listeners = new Set<() => void>()
  let lastRaw: string | null | undefined
  let lastValue: T = initial

  const read = (): T => {
    let raw: string | null = null
    try {
      raw = localStorage.getItem(key)
    } catch {
      // storage unavailable (private mode): behave as empty
    }
    if (raw === lastRaw) return lastValue
    lastRaw = raw
    lastValue = initial
    if (raw !== null) {
      try {
        const parsed: unknown = JSON.parse(raw)
        if (parsed !== null && typeof parsed === 'object' && isValid(parsed)) lastValue = parsed as T
      } catch {
        // broken JSON falls back to the initial value
      }
    }
    return lastValue
  }

  const notify = () => listeners.forEach((fn) => fn())
  const write = (next: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // nothing to do: the demo keeps working from memory until reload
    }
    notify()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === key || event.key === null) notify()
    })
  }

  return {
    get: read,
    set: write,
    update: (fn) => write(fn(read())),
    subscribe: (fn) => {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    reset: () => {
      try {
        localStorage.removeItem(key)
      } catch {
        // see above
      }
      notify()
    },
  }
}

export function usePartyStore<T>(store: PartyStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
