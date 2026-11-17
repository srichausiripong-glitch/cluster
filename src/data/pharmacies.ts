import { useEffect, useSyncExternalStore } from 'react'
import { withDistrict, type CarePoint, type CarePointData } from './carePoints'

/**
 * The pharmacies, from a file on our own server (scripts/care/fetch.ts), read only once 💊 is on
 * and then kept for the visit (redesign spec 5.8). A read that fails says so, and the next time
 * 💊 is switched on the file is asked for again; it is never asked for in a loop.
 */
type Load = () => Promise<CarePointData[]>

const fromServer: Load = async () => {
  const res = await fetch(`${import.meta.env.BASE_URL}care/pharmacies.json`)
  if (!res.ok) throw new Error(`pharmacies: ${res.status}`)
  return (await res.json()) as CarePointData[]
}

type State = { points: CarePoint[]; failed: boolean; reading: boolean; read: boolean }
/** One empty list for every "none", so a screen that keeps the list sees no change. */
const NONE: CarePoint[] = []
const FIRST: State = { points: NONE, failed: false, reading: false, read: false }
const OFF = { points: NONE, failed: false }

let source: Load = fromServer
let state = FIRST
const listeners = new Set<() => void>()
const change = (next: Partial<State>) => {
  state = { ...state, ...next }
  for (const listener of listeners) listener()
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const current = () => state

/** Where the pharmacies come from; the tests hand in their own. */
export function setPharmacySource(load: Load): void {
  source = load
}

export function resetPharmaciesForTest(): void {
  source = fromServer
  state = FIRST
}

function read(): void {
  if (state.read || state.reading) return
  change({ reading: true, failed: false })
  source().then(
    (list) => change({ points: list.map(withDistrict), read: true, reading: false }),
    () => change({ failed: true, reading: false }),
  )
}

/** The pharmacies while 💊 is on, with whether the file could not be read; nothing while it is off. */
export function usePharmacies(on: boolean): { points: CarePoint[]; failed: boolean } {
  const now = useSyncExternalStore(subscribe, current, current)
  useEffect(() => {
    if (on) read()
  }, [on])
  return on ? { points: now.points, failed: now.failed } : OFF
}
