import { expect, it } from 'vitest'
import { clampPan, fitMap } from './pan'

it('scales the 1000 x 1100 map to cover the viewport and centres it', () => {
  const fit = fitMap(390, 650)
  expect(fit.height).toBeCloseTo(650)
  expect(fit.width).toBeCloseTo(590.9, 1)
  expect(fit.x).toBeCloseTo(-100.45, 1)
  expect(fit.y).toBeCloseTo(0)
})
it('never lets the map be dragged past its edges', () => {
  const fit = fitMap(390, 650)
  expect(clampPan(fit, 390, 650, 50, 20)).toEqual({ x: 0, y: 0 })
  expect(clampPan(fit, 390, 650, -999, -999).x).toBeCloseTo(390 - fit.width)
})
