import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

// Paths are from the project root: under Vitest's jsdom environment import.meta.url is not a file URL.
const tokens = readFileSync('src/design/tokens.css', 'utf8')
const css = readFileSync('src/index.css', 'utf8')
const sources = import.meta.glob('../**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const app = Object.entries(sources).filter(([path]) => !path.includes('.test.'))
const token = (name: string) => tokens.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`))?.[1] ?? ''
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)
/** Every source line that matches `rule` (and `also`, when given), as file:line. */
const lines = (rule: RegExp, also?: RegExp) =>
  app.flatMap(([path, text]) => text.split('\n').flatMap((line, i) => (rule.test(line) && (!also || also.test(line)) ? [`${path}:${i + 1}`] : [])))

it('uses the colours of the approved look', () => {
  const names = ['care', 'yellow', 'leaf', 'ink', 'bg', 'signal', 'signal-edge', 'land', 'water', 'park']
  expect(names.map(token)).toEqual(['#fd62ab', '#fee23c', '#70dc71', '#1e1f1c', '#fefbf0', '#6c3bf4', '#4a1fd0', '#fff0a6', '#46d3e6', '#c6f1ba'])
})
it('keeps text readable on every ground it may sit on', () => {
  for (const ground of ['care', 'care-soft', 'yellow', 'leaf', 'bg', 'surface', 'land']) expect(contrast(token('ink'), token(ground)), ground).toBeGreaterThanOrEqual(4.5)
  for (const ground of ['ink', 'signal', 'signal-edge']) expect(contrast('#ffffff', token(ground)), ground).toBeGreaterThanOrEqual(4.5)
  expect(contrast(token('muted'), token('bg'))).toBeGreaterThanOrEqual(4.5)
})
it('never puts white text on pink, yellow or green, and never writes in pink', () => {
  expect(lines(/\bbg-(care|yellow|leaf)\b/, /\btext-white\b/)).toEqual([])
  expect(lines(/\btext-care\b(?!-)/)).toEqual([])
})
it('uses hard shadows and flat fills only', () => {
  expect(lines(/\bshadow-(sm|md|lg|xl|2xl|float)\b/)).toEqual([])
  expect(lines(/\b(bg-gradient-|bg-linear-|from-|via-)\w/)).toEqual([])
})
it('outlines boxes in black, and keeps the soft line for row dividers', () => {
  expect(lines(/\bborder border-line\b/)).toEqual([])
})
it('uses no colour outside the palette', () => {
  expect(lines(/\b(bg|text|border|ring|outline|fill|stroke)-(red|rose|orange|amber|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|yellow)-\d/)).toEqual([])
})
it('stops every animation for people who ask for reduced motion, and draws focus in black', () => {
  expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*animation-duration: 0\.01ms !important/)
  expect(css).toMatch(/:focus-visible\s*\{[^}]*outline: 3px solid var\(--color-ink\)/)
})
it('keeps dots and motion out of the back office', () => {
  const office = app.filter(([path]) => /\/(clinic|operator|data)\//.test(path))
  expect(office.filter(([, text]) => /<canvas|pop-in|ripple/.test(text)).map(([path]) => path)).toEqual([])
})
