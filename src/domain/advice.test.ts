import { expect, it } from 'vitest'
import { adviceFor } from './advice'

it('is urgent for a named HIV exposure within 72 hours, and not for later or other named infections', () => {
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
it('tells every recipient of a 72-hour link to go today, whether or not a disease is named', () => {
  for (const tier of [1, 2] as const) {
    const advice = adviceFor(null, tier, 'h72')
    expect(advice.urgent).toBe(true)
    expect(advice.steps.join(' ')).toContain('วันนี้')
    expect(advice.steps.join(' ')).toContain('72 ชั่วโมง')
  }
  expect(adviceFor(null, 2, 'w4').urgent).toBe(false)
})
it('does not point at a code when the link carried none', () => {
  expect(adviceFor(null, 2, 'w4', false).steps.join(' ')).not.toContain('รหัส')
  expect(adviceFor(null, 2, 'w4', true).steps.join(' ')).toContain('รหัส')
})
it('uses the blood-test advice for a syphilis contact older than three months', () => {
  const steps = adviceFor('syphilis', 1, 'older').steps.join(' ')
  expect(steps).not.toContain('แม้ผลเลือดปกติ')
  expect(steps).toContain('12 สัปดาห์')
})
