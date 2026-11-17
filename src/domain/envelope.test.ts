import { expect, it } from 'vitest'
import { makePlain, pad, PLAIN_BYTES, powOk, Q, REPORT_KINDS, unpad } from './envelope'
import { DISTRICT_IDS } from './districts'

const NONCE = '00112233445566778899aabbccddeeff'

it('pads every envelope to the same size, whatever it carries', () => {
  const empty = makePlain(null, () => 0.5, NONCE)
  const tested = makePlain({ kind: 'tested', zone: 'bang_khae', savedAt: '2026-11-12T00:00:00.000Z' }, () => 0.5, NONCE)
  const positive = makePlain({ kind: 'gono_chlam', zone: 'bangkok_yai', savedAt: '2026-11-12T00:00:00.000Z' }, () => 0.5, NONCE)
  for (const plain of [empty, tested, positive]) expect(pad(plain)).toHaveLength(PLAIN_BYTES)
  for (const plain of [empty, tested, positive]) expect(unpad(pad(plain))).toEqual(plain)
})
it('carries the pending report, and never more than one', () => {
  expect(makePlain({ kind: 'syphilis', zone: 'bang_rak', savedAt: '2026-11-12T00:00:00.000Z' }, () => 0, NONCE).report).toEqual({ zone: 'bang_rak', kind: 'syphilis' })
})
it('adds a random report with probability q when there is no real one', () => {
  expect(Q).toBe(0.002)
  expect(makePlain(null, () => 0.001, NONCE).report).not.toBeNull()
  expect(makePlain(null, () => 0.5, NONCE).report).toBeNull()
})
it('draws a random report from every district and every kind, and from nothing else', () => {
  const seen = new Set<string>()
  for (let cell = 0; cell < 200; cell++) {
    // The first draw decides that a random report goes; the second picks its cell.
    const draws = [0, (cell + 0.5) / 200]
    const plain = makePlain(null, () => draws.shift()!, NONCE)
    seen.add(`${plain.report!.zone}|${plain.report!.kind}`)
  }
  expect(seen.size).toBe(200)
  expect(REPORT_KINDS).toHaveLength(4)
  for (const pair of seen) expect(DISTRICT_IDS).toContain(pair.split('|')[0])
})
it('fits the longest district and kind in the padded content', () => {
  expect(pad({ v: 1, nonce: 'x'.repeat(64), report: { zone: 'pom_prap_sattru_phai', kind: 'symptoms' } })).toHaveLength(PLAIN_BYTES)
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
