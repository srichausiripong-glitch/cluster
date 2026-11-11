import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { th } from '../copy/th'
import { issueClinicCode } from '../store/actions'
import { usePartyStore } from '../store/partyStore'
import { clinic } from '../store/stores'
import { ErrorBoundary } from './ErrorBoundary'

/** Stands in for a screen that cannot draw the data it finds in the browser. */
function Bomb() {
  const { codes } = usePartyStore(clinic)
  if (codes.length > 0) throw new Error('unreadable store')
  return <p>ok</p>
}

it('offers a reset instead of a blank page when stored demo data breaks a screen', async () => {
  const user = userEvent.setup()
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
  issueClinicCode()
  render(
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>,
  )
  expect(screen.getByText(th.recover.title)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: th.recover.action }))
  expect(screen.getByText('ok')).toBeInTheDocument()
  expect(clinic.get().codes).toHaveLength(0)
  quiet.mockRestore()
})
