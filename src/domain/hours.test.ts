import { expect, it } from 'vitest'
import { openStatus, parseOsmHours, type OpenSpan } from './hours'

// Opening hours (2026-11-18 design, decision 3): read only the common OpenStreetMap forms; anything
// else is unknown, never a guess. Open or closed is worked out in Bangkok time.

const ALL = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAYS = [1, 2, 3, 4, 5]
/** A moment given as Bangkok wall time, whatever zone the test runs in. */
const bangkok = (iso: string) => new Date(new Date(`${iso}Z`).getTime() - 7 * 3600_000)

it('reads the common OpenStreetMap hours forms', () => {
  expect(parseOsmHours('24/7')).toEqual([{ days: ALL, from: '00:00', to: '24:00' }])
  expect(parseOsmHours('Mo-Fr 08:00-20:00; Sa 09:00-12:00')).toEqual([
    { days: WEEKDAYS, from: '08:00', to: '20:00' },
    { days: [6], from: '09:00', to: '12:00' },
  ])
  expect(parseOsmHours('Mo,We,Fr 16:30-20:00')).toEqual([{ days: [1, 3, 5], from: '16:30', to: '20:00' }])
  expect(parseOsmHours('Mo-Su 08:00-12:00,13:00-17:00')).toEqual([
    { days: ALL, from: '08:00', to: '12:00' },
    { days: ALL, from: '13:00', to: '17:00' },
  ])
  expect(parseOsmHours('Mo-Sa 08:00-20:00; Su off')).toEqual([{ days: [1, 2, 3, 4, 5, 6], from: '08:00', to: '20:00' }])
  expect(parseOsmHours('Mo-Su 08:00-22:00; PH off')).toEqual([{ days: ALL, from: '08:00', to: '22:00' }])
  expect(parseOsmHours('Mo-Fr 08:00-17:00, Sa 08:00-12:00')).toEqual([
    { days: WEEKDAYS, from: '08:00', to: '17:00' },
    { days: [6], from: '08:00', to: '12:00' },
  ])
})
it('leaves an hours tag it cannot read unknown', () => {
  for (const tag of ['sunrise-sunset', 'Mo-Fr 08:00-20:00 "by appointment"', 'Jan-Mar Mo 10:00-12:00', 'Mo-Fr 8-20', '', undefined]) expect(parseOsmHours(tag), String(tag)).toBeNull()
})
it('works out open or closed in Bangkok time, across midnight and for 24/7', () => {
  const office: OpenSpan[] = [{ days: WEEKDAYS, from: '08:00', to: '16:00' }]
  // Wednesday 18 Nov 2026, 20:30 in Bangkok, given as a UTC moment: a phone in another zone sees the same.
  expect(openStatus(office, new Date('2026-11-18T13:30:00Z'))).toEqual({ open: false, opens: { day: 4, at: '08:00' } })
  expect(openStatus(office, bangkok('2026-11-18T10:00:00'))).toEqual({ open: true, closes: '16:00' })
  // Friday evening: next opening is Monday.
  expect(openStatus(office, bangkok('2026-11-20T17:00:00'))).toEqual({ open: false, opens: { day: 1, at: '08:00' } })
  const night: OpenSpan[] = [{ days: ALL, from: '22:00', to: '02:00' }]
  expect(openStatus(night, bangkok('2026-11-19T01:00:00'))).toEqual({ open: true, closes: '02:00' })
  expect(openStatus(night, bangkok('2026-11-19T03:00:00'))).toEqual({ open: false, opens: { day: 4, at: '22:00' } })
  expect(openStatus([{ days: ALL, from: '00:00', to: '24:00' }], bangkok('2026-11-19T03:00:00'))).toEqual({ open: true, closes: null })
  expect(openStatus(undefined, bangkok('2026-11-19T03:00:00'))).toBeNull()
  expect(openStatus([], bangkok('2026-11-19T03:00:00'))).toBeNull()
})
// Final review: a later ";" rule replaces the hours of the days it names, as OpenStreetMap reads it.
it('lets a later ";" rule replace the hours of the days it names, while ", " adds', () => {
  expect(parseOsmHours('Mo-Fr 08:00-20:00; We 10:00-12:00')).toEqual([
    { days: [1, 2, 4, 5], from: '08:00', to: '20:00' },
    { days: [3], from: '10:00', to: '12:00' },
  ])
  expect(parseOsmHours('Mo-Su 08:00-22:00; Sa-Su 10:00-18:00')).toEqual([
    { days: [1, 2, 3, 4, 5], from: '08:00', to: '22:00' },
    { days: [0, 6], from: '10:00', to: '18:00' },
  ])
  expect(openStatus(parseOsmHours('Mo-Fr 08:00-20:00; We 10:00-12:00')!, bangkok('2026-11-18T14:00:00'))).toEqual({ open: false, opens: { day: 4, at: '08:00' } })
})
it('refuses a public-holiday tag inside a day range instead of looping', () => {
  expect(parseOsmHours('Mo-PH 08:00-20:00')).toBeNull()
  expect(parseOsmHours('PH-Fr 08:00-20:00')).toBeNull()
})
