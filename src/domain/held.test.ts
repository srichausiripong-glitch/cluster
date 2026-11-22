import { expect, it } from 'vitest'
import type { CountRow } from './display'
import { heldCells } from './held'
import { shiftWeek } from './weeks'

const row = (week: string, n: number): CountRow => ({ zone: 'bang_rak', kind: 'syphilis', week, n })

it('holds a week that jumps above twenty and above three times the four weeks before', () => {
  expect(heldCells([row('2026-W42', 5), row('2026-W43', 6), row('2026-W44', 7), row('2026-W45', 4), row('2026-W46', 22)], '2026-W46')).toEqual([{ zone: 'bang_rak', kind: 'syphilis', n: 22 }])
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
  expect(heldCells([row('2026-W41', 30), row('2026-W46', 21)], '2026-W46')).toEqual([{ zone: 'bang_rak', kind: 'syphilis', n: 21 }])
})
it('judges each district and kind on its own', () => {
  const other: CountRow = { zone: 'chatuchak', kind: 'tested', week: '2026-W46', n: 50 }
  expect(heldCells([row('2026-W46', 21), other], '2026-W46').map((c) => c.zone).sort()).toEqual(['bang_rak', 'chatuchak'])
})
it("holds a district's signal cells when their sum jumps, even when neither kind does alone (amendment 6: the area's count)", () => {
  const gono: CountRow = { zone: 'bang_rak', kind: 'gono_chlam', week: '2026-W46', n: 15 }
  expect(heldCells([row('2026-W46', 15), gono], '2026-W46').map((c) => c.kind).sort()).toEqual(['gono_chlam', 'syphilis'])
})

it('holds a jump in symptoms on its own', () => {
  const W = '2026-W46'
  const rows: CountRow[] = [1, 2, 3, 4].map((back) => ({ zone: 'bang_rak', kind: 'symptoms', week: shiftWeek(W, -back), n: 2 }))
  expect(heldCells([...rows, { zone: 'bang_rak', kind: 'symptoms', week: W, n: 25 }], W)).toEqual([{ zone: 'bang_rak', kind: 'symptoms', n: 25 }])
})
it('never adds symptoms to the confirmed sum', () => {
  const W = '2026-W46'
  expect(heldCells([{ zone: 'bang_rak', kind: 'gono_chlam', week: W, n: 12 }, { zone: 'bang_rak', kind: 'symptoms', week: W, n: 15 }], W)).toEqual([])
})
