import { expect, it } from 'vitest'
import { buildIcs } from './ics'

it('exports a calendar entry with a neutral title', () => {
  const ics = buildIcs([{ date: '2026-12-09' }])
  expect(ics).toContain('BEGIN:VCALENDAR')
  expect(ics).toContain('SUMMARY:นัดหมาย')
  expect(ics).toContain('DTSTART;VALUE=DATE:20261209')
})
