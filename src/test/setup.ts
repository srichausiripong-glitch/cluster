import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { setMapSource } from '../map/source'
import { setCarePoints } from '../data/carePoints'
import { FIXTURE_POINTS } from './carePoints'
import { stubSource } from './mapStub'

// Server tests run in Node (marked `@vitest-environment node`), where there is no page.
const browser = typeof window !== 'undefined'

// jsdom has no canvas. The map draws nothing without a context; what it draws is tested with a recording stand-in.
if (browser) HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext

beforeEach(() => {
  setMapSource(stubSource())
  // Tests run on made-up care points; the real registry is checked on its own in src/data/carePoints.test.ts.
  setCarePoints(FIXTURE_POINTS)
})
afterEach(() => {
  if (!browser) return
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})
