import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { th } from '../copy/th'
import { saveCard } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { phone } from '../store/stores'
import { ErrorBoundary } from './ErrorBoundary'

/** Stands in for a screen that cannot draw the data it finds in the browser. */
function Bomb() {
  const { card } = usePartyStore(phone)
  if (card) throw new Error('unreadable store')
  return <p>ok</p>
}

it('offers a reset instead of a blank page when stored data breaks a screen', async () => {
  const user = userEvent.setup()
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
  saveCard({ group: 'syphilis', source: 'symptoms', sentAt: '2026-11-11T00:00:00.000Z', hasLabResult: false })
  render(
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>,
  )
  expect(screen.getByText(th.recover.title)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: th.recover.action }))
  expect(screen.getByText('ok')).toBeInTheDocument()
  expect(phone.get().card).toBeNull()
  quiet.mockRestore()
})
