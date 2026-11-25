import { expect, it } from 'vitest'
import { stepFor } from './lifecycle'

it('ages gonorrhoea and chlamydia signals over four weeks', () => {
  expect([1, 2, 3, 4, 5].map((w) => stepFor('gono_chlam', w))).toEqual(['new', 'followup', 'expiring', 'expiring', 'expired'])
})
it('ages syphilis signals over twelve weeks', () => {
  expect([2, 3, 8, 9, 12, 13].map((w) => stepFor('syphilis', w))).toEqual(['new', 'followup', 'followup', 'expiring', 'expiring', 'expired'])
})
