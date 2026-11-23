import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { HatchSwatch, ShadeSwatch } from './legend'
import { SYMPTOM_GAP } from './style'

it('draws the symptoms key with the map’s own spacing for each level', () => {
  render(
    <>
      {(['thin', 'medium', 'dense'] as const).map((l) => (
        <HatchSwatch key={l} level={l} />
      ))}
    </>,
  )
  expect([...document.querySelectorAll('[data-gap]')].map((el) => Number(el.getAttribute('data-gap')))).toEqual([SYMPTOM_GAP.thin, SYMPTOM_GAP.medium, SYMPTOM_GAP.dense])
})

// 2026-11-23 design: each colour carries its map cue, so the key is never told by colour alone.
it('keys red with its bold edge, orange with its hatch and green plain', () => {
  render(
    <>
      <ShadeSwatch tone="confirmed" band="dense" />
      <ShadeSwatch tone="symptoms" band="dense" />
      <ShadeSwatch tone="tested" band="dense" />
    </>,
  )
  const swatches = [...document.querySelectorAll('[data-tone]')]
  expect(swatches.map((el) => el.getAttribute('data-tone'))).toEqual(['confirmed', 'symptoms', 'tested'])
  expect(swatches.map((el) => [!!el.querySelector('[data-edge]'), !!el.querySelector('[data-hatch]')])).toEqual([[true, false], [false, true], [false, false]])
  expect(swatches[0].querySelector('[data-fill]')).toHaveAttribute('fill', 'var(--color-red)')
  expect(swatches[2].querySelector('[data-fill]')).toHaveAttribute('fill', 'var(--color-green)')
})
