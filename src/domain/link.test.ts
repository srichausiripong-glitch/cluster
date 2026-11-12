import { expect, it } from 'vitest'
import { buildLink, decodeNotice, encodeNotice } from './link'
import type { Notice } from './types'

const n: Notice = { v: 2, group: 'syphilis', tier: 1, band: 'w4', week: '2026-W46' }

it('round-trips a notice through the URL fragment', () => {
  expect(decodeNotice(encodeNotice(n))).toEqual(n)
  expect(decodeNotice('#' + encodeNotice(n))).toEqual(n)
})
it('returns null for an empty, truncated or garbage fragment', () => {
  for (const bad of ['', '#', '%%%', 'e30', encodeNotice({ ...n, v: 1 } as never), encodeNotice({ ...n, v: 1, code: 'AB123' } as never), encodeNotice({ ...n, week: 'W46' })]) expect(decodeNotice(bad)).toBeNull()
})
it('keeps the notice out of the path and query', () => {
  expect(buildLink('https://example.test', n)).toBe('https://example.test/r#' + encodeNotice(n))
})
it('carries the "older or not sure" time band', () => {
  expect(decodeNotice(encodeNotice({ ...n, band: 'older' }))?.band).toBe('older')
})
it('carries no code for a clinic', () => {
  expect(Object.keys(decodeNotice(encodeNotice(n))!).sort()).toEqual(['band', 'group', 'tier', 'v', 'week'])
})
