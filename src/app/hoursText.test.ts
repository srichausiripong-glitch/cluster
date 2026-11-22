import { expect, it } from 'vitest'
import { th } from '../copy/th'
import { hoursLine } from './hoursText'

// Final review: "วันนี้" only for an opening later the same day, never one a week away.
const bangkok = (iso: string) => new Date(new Date(`${iso}Z`).getTime() - 7 * 3600_000)
const THURSDAY = [{ days: [4], from: '13:00', to: '15:00' }]

it('says "วันนี้" only for an opening later the same day', () => {
  expect(hoursLine(THURSDAY, bangkok('2026-11-19T10:00:00'))).toBe(`${th.hours.closed} · ${th.hours.opens.replace('{day}', th.hours.today).replace('{time}', '13:00')}`)
  expect(hoursLine(THURSDAY, bangkok('2026-11-19T16:00:00'))).toBe(`${th.hours.closed} · ${th.hours.opens.replace('{day}', th.hours.days[4]).replace('{time}', '13:00')}`)
})
