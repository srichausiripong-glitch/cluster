import { expect, it } from 'vitest'
import { adviceFor } from './advice'

it('is urgent only for HIV exposure within 72 hours', () => {
  expect(adviceFor('hiv', 1, 'h72').urgent).toBe(true)
  expect(adviceFor('hiv', 1, 'w4').urgent).toBe(false)
  expect(adviceFor('mpox', 1, 'w2').urgent).toBe(false)
})
it('tells a syphilis contact to go for treatment even with a normal blood test', () => {
  expect(adviceFor('syphilis', 1, 'w4').steps.join(' ')).toContain('แม้ผลเลือดปกติ')
})
it('tells a gonorrhoea contact not to self-medicate', () => {
  expect(adviceFor('gono_chlam', 1, 'w2').steps.join(' ')).toContain('ไม่ซื้อยาปฏิชีวนะกินเอง')
})
it('has advice for an invitation that names no disease', () => {
  expect(adviceFor(null, 2, 'w4').steps.length).toBeGreaterThan(0)
})
