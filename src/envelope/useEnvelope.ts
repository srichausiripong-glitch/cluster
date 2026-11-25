import { useEffect } from 'react'
import { phone } from '../store/stores'
import { solveInBackground } from './pow'
import { sendIfDue, type SendDeps, type Visit } from './send'

const EVERY_MS = 60_000
const random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32

/**
 * The day's envelope over one visit (2026-11-23 design, daily since the live map, owner 25 Nov 2026):
 * while the app is open and in view it is made ready on opening, every minute and whenever the waiting
 * report changes. A waiting report goes as soon as it is sealed; otherwise the envelope goes when the
 * person leaves, as the page is hidden or closed.
 */
export function useEnvelope(): void {
  useEffect(() => {
    const deps: SendDeps = { fetch: (...args) => fetch(...args), rand: random, solve: solveInBackground }
    const visit: Visit = { startedAt: Date.now() }
    let seen = phone.get().pending?.savedAt ?? null
    let busy = false
    let again = false
    // Set on unmount: a solve still running then must not start another prepare after the page is gone.
    let stopped = false
    const prepare = () => {
      if (stopped || document.visibilityState === 'hidden') return
      if (busy) {
        // A report changed mid-solve: prepare again once this one ends, for the report waiting then.
        again = true
        return
      }
      busy = true
      void sendIfDue(Date.now(), deps, visit).finally(() => {
        busy = false
        if (again) {
          again = false
          prepare()
        }
      })
    }
    const leave = () => void sendIfDue(Date.now(), deps, visit, true)
    const onVisibility = () => (document.visibilityState === 'hidden' ? leave() : prepare())
    const unsubscribe = phone.subscribe(() => {
      const savedAt = phone.get().pending?.savedAt ?? null
      if (savedAt === seen) return
      seen = savedAt
      prepare()
    })
    prepare()
    const timer = setInterval(prepare, EVERY_MS)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', leave)
    return () => {
      stopped = true
      unsubscribe()
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', leave)
    }
  }, [])
}
