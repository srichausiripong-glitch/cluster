import { expect, it } from 'vitest'
import type { CountRow } from './display'
import { heldCells } from './held'

const row = (week: string, n: number): CountRow => ({ zone: 'south', kind: 'syphilis', week, n })

it('holds a week that jumps above twenty and above three times the four weeks before', () => {
  expect(heldCells([row('2026-W42', 5), row('2026-W43', 6), row('2026-W44', 7), row('2026-W45', 4), row('2026-W46', 22)], '2026-W46')).toEqual([{ zone: 'south', kind: 'syphilis', n: 22 }])
  // 21 is not above three times 7.
  expect(heldCells([row('2026-W44', 7), row('2026-W46', 21)], '2026-W46')).toEqual([])
})
it('lets a high week through when an earlier week was already high', () => {
  expect(heldCells([row('2026-W43', 8), row('2026-W46', 21)], '2026-W46')).toEqual([])
})
it('never holds twenty or fewer', () => {
  expect(heldCells([row('2026-W46', 20)], '2026-W46')).toEqual([])
})
it('looks only at the four weeks before, counting a missing week as none', () => {
  expect(heldCells([row('2026-W41', 30), row('2026-W46', 21)], '2026-W46')).toEqual([{ zone: 'south', kind: 'syphilis', n: 21 }])
})
it('judges each zone and kind on its own', () => {
  const other: CountRow = { zone: 'north', kind: 'tested', week: '2026-W46', n: 50 }
  expect(heldCells([row('2026-W46', 21), other], '2026-W46').map((c) => c.zone).sort()).toEqual(['north', 'south'])
})
it("holds a zone's signal cells when their sum jumps, even when neither kind does alone (amendment 6: the zone's count)", () => {
  const gono: CountRow = { zone: 'south', kind: 'gono_chlam', week: '2026-W46', n: 15 }
  expect(heldCells([row('2026-W46', 15), gono], '2026-W46').map((c) => c.kind).sort()).toEqual(['gono_chlam', 'syphilis'])
})
