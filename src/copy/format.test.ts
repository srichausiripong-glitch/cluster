import { expect, it } from 'vitest'
import { formatThaiDay, formatThaiWeek } from './format'

// A day kept as YYYY-MM-DD names that day on every phone, whatever its zone (final review, minor).
it('names a stored day as itself, not the day before on a phone west of UTC', () => {
  expect(formatThaiDay('2027-02-20')).toBe('20 ก.พ. 2570')
  expect(formatThaiDay('2026-01-01')).toBe('1 ม.ค. 2569')
})
// The back office's weeks (owner, 22 Nov 2026): Monday to Sunday in Thai words, the month once when shared.
it('names an ISO week by its Monday and Sunday', () => {
  expect(formatThaiWeek('2026-W47')).toBe('16–22 พ.ย.')
  expect(formatThaiWeek('2026-W49')).toBe('30 พ.ย.–6 ธ.ค.')
})
