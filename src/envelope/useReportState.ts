import { useSyncExternalStore } from 'react'
import { phone } from '../store/stores'
import { onSendChange, reportState, type ReportState } from './send'

/** How the report saved at `savedAt` stands, kept current as the envelope goes (live map, owner 25 Nov 2026). */
export function useReportState(savedAt: string | null): ReportState | null {
  return useSyncExternalStore(
    (fn) => {
      const stopPhone = phone.subscribe(fn)
      const stopSend = onSendChange(fn)
      return () => {
        stopPhone()
        stopSend()
      }
    },
    () => (savedAt ? reportState(savedAt) : null),
  )
}
