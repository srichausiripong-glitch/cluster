import { expect, it } from 'vitest'
import { codeKind } from './codes'

it('tells a clinic code from the look-alike slip and fast-track codes', () => {
  expect(codeKind(' abc123 ')).toBe('clinic')
  expect(codeKind('S12345')).toBe('slip')
  expect(codeKind('FF289')).toBe('fastTrack')
  expect(codeKind('hello')).toBe('unknown')
  expect(codeKind('')).toBe('unknown')
})
