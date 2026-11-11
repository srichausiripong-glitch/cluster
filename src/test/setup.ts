import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { setMapSource } from '../map/source'
import { stubSource } from './mapStub'

// jsdom has no canvas. The map draws nothing without a context; what it draws is tested with a recording stand-in.
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext

beforeEach(() => {
  setMapSource(stubSource())
})
afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})
