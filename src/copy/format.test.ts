import { expect, it } from 'vitest'
import { formatThaiDay } from './format'

// A day kept as YYYY-MM-DD names that day on every phone, whatever its zone (final review, minor).
it('names a stored day as itself, not the day before on a phone west of UTC', () => {
  expect(formatThaiDay('2027-02-20')).toBe('20 ก.พ. 2570')
  expect(formatThaiDay('2026-01-01')).toBe('1 ม.ค. 2569')
})
