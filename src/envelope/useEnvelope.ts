import { useEffect } from 'react'
import { solveInBackground } from './pow'
import { sendIfDue } from './send'

const EVERY_MS = 60_000
const random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32

/** While the app is open and in view, checks every minute whether this phone's weekly envelope is due. */
export function useEnvelope(): void {
  useEffect(() => {
    let busy = false
    const check = () => {
      if (busy || document.visibilityState === 'hidden') return
      busy = true
      void sendIfDue(Date.now(), { fetch: (...args) => fetch(...args), rand: random, solve: solveInBackground }).finally(() => (busy = false))
    }
    check()
    const timer = setInterval(check, EVERY_MS)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])
}
