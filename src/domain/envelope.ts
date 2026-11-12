import { ZONES_IN_FILE } from './display'
import type { PendingReport, ReportKind } from './types'

/** Every envelope's plain content is padded to this many bytes before it is sealed (amendment 5). */
export const PLAIN_BYTES = 256
/** Chance that an envelope with no real report carries a random one (amendment 5). */
export const Q = 0.002
export const REPORT_KINDS: readonly ReportKind[] = ['gono_chlam', 'syphilis', 'tested']

/** What an envelope says once opened. `nonce` lets the server refuse the same envelope twice. */
export interface Plain {
  v: 1
  nonce: string
  report: { zone: string; kind: ReportKind } | null
}

/** The envelope's content: the waiting report, else a random report with probability Q, else nothing. */
export function makePlain(pending: PendingReport | null, rand: () => number, nonce: string): Plain {
  if (pending) return { v: 1, nonce, report: { zone: pending.zone, kind: pending.kind } }
  if (rand() >= Q) return { v: 1, nonce, report: null }
  const cells = ZONES_IN_FILE.length * REPORT_KINDS.length
  const cell = Math.min(cells - 1, Math.floor(rand() * cells))
  return { v: 1, nonce, report: { zone: ZONES_IN_FILE[Math.floor(cell / REPORT_KINDS.length)], kind: REPORT_KINDS[cell % REPORT_KINDS.length] } }
}

/** JSON in UTF-8, padded with spaces to PLAIN_BYTES. */
export function pad(plain: Plain): Uint8Array {
  const bytes = new TextEncoder().encode(JSON.stringify(plain))
  if (bytes.length > PLAIN_BYTES) throw new Error('envelope content too long')
  const out = new Uint8Array(PLAIN_BYTES).fill(0x20)
  out.set(bytes)
  return out
}

export function unpad(bytes: Uint8Array): Plain {
  return JSON.parse(new TextDecoder().decode(bytes).trimEnd()) as Plain
}

/** What the proof of work is computed over: the server week and the sealed content. */
export function powInput(ct: string, week: string): string {
  return `${week}:${ct}`
}

/** Whether a SHA-256 hash in hex starts with at least `bits` zero bits. */
export function powOk(hashHex: string, bits: number): boolean {
  let zeros = 0
  for (const ch of hashHex) {
    const nibble = parseInt(ch, 16)
    if (nibble === 0) {
      zeros += 4
      if (zeros >= bits) return true
      continue
    }
    zeros += Math.clz32(nibble) - 28
    break
  }
  return zeros >= bits
}

/** The proof of work is sent as ten digits, so every envelope's body has the same length. */
export const POW_DIGITS = 10
