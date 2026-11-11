import { expect, it } from 'vitest'
import { densityBand, publishArea } from './publication'
import type { DiseaseGroup } from './types'

const r = (n: number, group: DiseaseGroup, week: string) => Array.from({ length: n }, () => ({ group, week }))

it('bands density only from the threshold up', () => {
  expect(densityBand(9)).toBeNull()
  expect(densityBand(10)).toBe('thin')
  expect(densityBand(20)).toBe('medium')
  expect(densityBand(50)).toBe('dense')
})
it('hides an area with nine reports and shows it with ten', () => {
  expect(publishArea('bkk', r(9, 'syphilis', '2026-W46'), '2026-W46', true)).toMatchObject({ state: 'below_threshold', density: null, step: null })
  expect(publishArea('bkk', r(10, 'syphilis', '2026-W46'), '2026-W46', true)).toMatchObject({ state: 'shown', density: 'thin', step: 'new' })
})
it('never counts HIV or mpox reports toward an area', () => {
  expect(publishArea('bkk', r(10, 'hiv', '2026-W46'), '2026-W46', true).state).toBe('no_data')
  expect(publishArea('bkk', r(10, 'mpox', '2026-W46'), '2026-W46', true).state).toBe('no_data')
})
it('marks an area with no partner clinic as its own state', () => {
  expect(publishArea('bkk', [], '2026-W46', false).state).toBe('no_partner')
})
it('shows the step as mixed when no single step reaches the threshold', () => {
  const mixed = [...r(6, 'gono_chlam', '2026-W46'), ...r(6, 'gono_chlam', '2026-W45')]
  expect(publishArea('bkk', mixed, '2026-W46', true)).toMatchObject({ state: 'shown', step: 'mixed' })
})
it('drops reports that have expired', () => {
  expect(publishArea('bkk', r(12, 'gono_chlam', '2026-W40'), '2026-W46', true).state).toBe('no_data')
})
