import { expect, it } from 'vitest'
import type { PublishedArea } from '../domain/types'
import { toneOf } from './tone'

// One colour per district (2026-11-23 design): red before orange before green; a layer switched off
// lets the district fall to the next colour it qualifies for; green always shows.
const a = (over: Partial<PublishedArea>): PublishedArea => ({ areaId: 'bang_rak', state: 'shown', density: null, step: null, testing: null, symptoms: null, ...over })
const on = { confirmed: true, symptoms: true }
it('takes red before orange before green', () => {
  expect(toneOf(a({ density: 'thin', symptoms: 'dense', testing: 'high' }), on)).toEqual({ kind: 'confirmed', band: 'thin' })
  expect(toneOf(a({ symptoms: 'medium', testing: 'high' }), on)).toEqual({ kind: 'symptoms', band: 'medium' })
  expect(toneOf(a({ testing: 'low' }), on)).toEqual({ kind: 'tested', band: 'thin' })
})
it('falls to the next colour when a layer is off, and green always shows', () => {
  const red = a({ density: 'dense', symptoms: 'thin' })
  expect(toneOf(red, { confirmed: false, symptoms: true })).toEqual({ kind: 'symptoms', band: 'thin' })
  expect(toneOf(red, { confirmed: false, symptoms: false })).toBeNull()
  expect(toneOf(a({ testing: 'medium' }), { confirmed: false, symptoms: false })).toEqual({ kind: 'tested', band: 'medium' })
})
it('gives no colour to an area that is not shown', () => {
  expect(toneOf(a({ state: 'suspended', density: 'thin' }), on)).toBeNull()
  expect(toneOf(a({ state: 'below_threshold' }), on)).toBeNull()
  expect(toneOf(undefined, on)).toBeNull()
})
