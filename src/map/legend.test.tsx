import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { HatchSwatch } from './legend'
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
