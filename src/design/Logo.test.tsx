import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Logo } from './Logo'

it('shows the logo as one image named cluster', () => {
  render(<Logo />)
  expect(screen.getByRole('img', { name: 'cluster' }).querySelectorAll('img')).toHaveLength(2)
  expect(screen.queryByText('Cluster')).toBeNull()
})
it('has replaced the old word mark everywhere', () => {
  const sources = import.meta.glob('../**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  expect(Object.entries(sources).filter(([path, text]) => !path.includes('.test.') && /Wordmark/.test(text)).map(([path]) => path)).toEqual([])
})
