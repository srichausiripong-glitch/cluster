import { useMemo, useSyncExternalStore } from 'react'
import type { PublishedArea, PublishedFile } from '../domain/types'
import { ZONE_IDS } from '../store/seed'

// The latest weekly file the server published. Task 12 of the v1 plan fills it from /api/published;
// until a file arrives every area reads "ยังไม่มีข้อมูล".
let current: PublishedFile | null = null
const listeners = new Set<() => void>()

export function setPublished(file: PublishedFile | null): void {
  current = file
  listeners.forEach((fn) => fn())
}
/** Tests install a file the same way the fetch will. */
export const setPublishedForTest = setPublished

const empty = (areaId: string): PublishedArea => ({ areaId, state: 'no_data', density: null, step: null, testing: null })

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
