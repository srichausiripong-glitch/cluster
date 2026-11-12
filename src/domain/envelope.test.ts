import { expect, it } from 'vitest'
import { makePlain, pad, PLAIN_BYTES, powOk, Q, REPORT_KINDS, unpad } from './envelope'
import { ZONES_IN_FILE } from './display'

const NONCE = '00112233445566778899aabbccddeeff'

it('pads every envelope to the same size, whatever it carries', () => {
  const empty = makePlain(null, () => 0.5, NONCE)
  const tested = makePlain({ kind: 'tested', zone: 'thon_south', savedAt: '2026-11-12T00:00:00.000Z' }, () => 0.5, NONCE)
  const positive = makePlain({ kind: 'gono_chlam', zone: 'thon_north', savedAt: '2026-11-12T00:00:00.000Z' }, () => 0.5, NONCE)
  for (const plain of [empty, tested, positive]) expect(pad(plain)).toHaveLength(PLAIN_BYTES)
  for (const plain of [empty, tested, positive]) expect(unpad(pad(plain))).toEqual(plain)
})
it('carries the pending report, and never more than one', () => {
  expect(makePlain({ kind: 'syphilis', zone: 'south', savedAt: '2026-11-12T00:00:00.000Z' }, () => 0, NONCE).report).toEqual({ zone: 'south', kind: 'syphilis' })
})
it('adds a random report with probability q when there is no real one', () => {
  expect(Q).toBe(0.002)
  expect(makePlain(null, () => 0.001, NONCE).report).not.toBeNull()
  expect(makePlain(null, () => 0.5, NONCE).report).toBeNull()
})
it('spreads random reports evenly over the six zones and the three kinds', () => {
  const seen = new Set<string>()
  const cells = ZONES_IN_FILE.length * REPORT_KINDS.length
  for (let i = 0; i < cells; i++) {
    // The first draw decides that a random report goes; the second picks its cell.
    const draws = [0.001, (i + 0.5) / cells]
    const plain = makePlain(null, () => draws.shift()!, NONCE)
    seen.add(`${plain.report!.zone}|${plain.report!.kind}`)
  }
  expect(seen.size).toBe(cells)
})
it('refuses a plain envelope that would not fit', () => {
  expect(() => pad({ v: 1, nonce: 'x'.repeat(300), report: null })).toThrow()
})
it('accepts proof of work with enough leading zero bits', () => {
  expect(powOk('0000f' + '0'.repeat(59), 16)).toBe(true)
  expect(powOk('0001' + '0'.repeat(60), 16)).toBe(false)
  expect(powOk('0f' + '0'.repeat(62), 4)).toBe(true)
  expect(powOk('1f' + '0'.repeat(62), 4)).toBe(false)
})
