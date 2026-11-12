import { powOk } from '../domain/envelope'

export async function hashHex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Counts up until SHA-256 of `input:counter` has `bits` leading zero bits (hashcash). */
export async function solvePow(input: string, bits: number): Promise<string> {
  for (let counter = 0; ; counter++) {
    if (powOk(await hashHex(`${input}:${counter}`), bits)) return String(counter)
  }
}

/** Solves in a worker, so the screen never waits; where workers are missing it solves here. */
export function solveInBackground(input: string, bits: number): Promise<string> {
  if (typeof Worker === 'undefined') return solvePow(input, bits)
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./pow.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<string>) => {
      resolve(e.data)
      worker.terminate()
    }
    worker.onerror = (e) => {
      reject(e)
      worker.terminate()
    }
    worker.postMessage({ input, bits })
  })
}
