import { useMemo, useSyncExternalStore } from 'react'
import type { PublishedArea, PublishedFile } from '../domain/types'
import { ZONE_IDS } from '../store/seed'

// The latest weekly file the server published, read from /api/published when the app opens. The
// last good file is kept on the phone for when the server cannot be reached; with neither, every
// area reads "ยังไม่มีข้อมูล".
let current: PublishedFile | null = null
const listeners = new Set<() => void>()

export function setPublished(file: PublishedFile | null): void {
  current = file
  listeners.forEach((fn) => fn())
}
/** Tests install a file the same way the fetch will. */
export const setPublishedForTest = setPublished

const empty = (areaId: string): PublishedArea => ({ areaId, state: 'no_data', density: null, step: null, testing: null, symptoms: null })

export interface Areas {
  zones: PublishedArea[]
  city: PublishedArea
  byId: (areaId: string) => PublishedArea
}
function areasOf(file: PublishedFile | null): Areas {
  const find = (id: string) => file?.areas.find((a) => a.areaId === id) ?? empty(id)
  return { zones: ZONE_IDS.map(find), city: find('bkk'), byId: find }
}

export function useAreas(): Areas {
  const file = useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => current,
  )
  return useMemo(() => areasOf(file), [file])
}

const CACHE = 'cluster.published'

/** Reads the weekly file. On failure keeps what is shown, or falls back to the last good file on this phone. */
export async function loadPublished(): Promise<void> {
  try {
    const res = await fetch('/api/published')
    if (!res.ok) throw new Error(String(res.status))
    const file = (await res.json()) as PublishedFile
    if (!Array.isArray(file.areas)) throw new Error('not a published file')
    setPublished(file)
    try {
      localStorage.setItem(CACHE, JSON.stringify(file))
    } catch {
      // storage unavailable: the file still shows until the app closes
    }
  } catch {
    if (current) return
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE) ?? 'null') as PublishedFile | null
      if (cached && Array.isArray(cached.areas)) setPublished(cached)
    } catch {
      // nothing usable kept: every area stays "ยังไม่มีข้อมูล"
    }
  }
}

/** Whether the server counts reports now. True until a file says otherwise. */
export function useIntakeOpen(): boolean {
  const file = useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => current,
  )
  return file?.intakeOpen ?? true
}
