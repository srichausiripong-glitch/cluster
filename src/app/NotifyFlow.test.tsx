import { render, screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { decodeNotice } from '../domain/link'
import type { DiseaseGroup } from '../domain/types'

const open = (state?: { group: DiseaseGroup; hasClinicCode: boolean }) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/app/notify', state }]}>
      <App />
    </MemoryRouter>,
  )

const toLinkForm = async (user: UserEvent) => {
  await user.click(screen.getByRole('button', { name: th.notify.safeYes }))
  await user.click(screen.getByRole('button', { name: th.notify.linkTitle }))
}

it('takes the disease group from the report step without a query string', () => {
  open({ group: 'syphilis', hasClinicCode: true })
  expect(screen.getByText(th.notify.safetyQ)).toBeInTheDocument()
  expect(screen.queryByText(th.report.askGroup)).toBeNull()
})
it('asks for the group when opened on its own', () => {
  open()
  expect(screen.getByText(th.report.askGroup)).toBeInTheDocument()
})
it('does not threaten on the safety question, and warns truthfully on each way of telling', async () => {
  const user = userEvent.setup()
  open({ group: 'syphilis', hasClinicCode: true })
  expect(screen.queryByText(/ศาล/)).toBeNull()
  await toLinkForm(user)
  expect(screen.getByText(th.notify.truthLink)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: th.common.back }))
  await user.click(screen.getByRole('button', { name: th.notify.clinicTitle }))
  expect(screen.getByText(th.notify.truthClinic)).toBeInTheDocument()
})
it('preselects no time, will not make a link until one is chosen, and offers "older or not sure"', async () => {
  const user = userEvent.setup()
  open({ group: 'syphilis', hasClinicCode: true })
  await toLinkForm(user)
  const radios = screen.getAllByRole('radio') as HTMLInputElement[]
  expect(radios).toHaveLength(5)
  expect(radios.some((r) => r.checked)).toBe(false)
  expect(screen.getByRole('button', { name: th.notify.makeLink })).toBeDisabled()
  expect(screen.getByText(th.notify.bandFirst)).toBeInTheDocument()
  await user.click(screen.getByRole('radio', { name: th.notify.bands.older }))
  expect(screen.getByRole('button', { name: th.notify.makeLink })).toBeEnabled()
})
it('tells the sender what the recipient will see, including the same-day advice for 72 hours', async () => {
  const user = userEvent.setup()
  open({ group: 'syphilis', hasClinicCode: true })
  await toLinkForm(user)
  expect(screen.getByText(th.notify.seeUnnamed, { exact: false })).toBeInTheDocument()
  expect(screen.queryByText(th.notify.seeUrgent, { exact: false })).toBeNull()
  await user.click(screen.getByRole('radio', { name: th.notify.bands.h72 }))
  expect(screen.getByText(th.notify.seeUrgent, { exact: false })).toBeInTheDocument()
  await user.click(screen.getByLabelText(th.notify.nameDisease))
  expect(screen.getByText(th.notify.seeNamed, { exact: false })).toBeInTheDocument()
})
it('gives a way out after postponing or skipping', async () => {
  const user = userEvent.setup()
  open({ group: 'syphilis', hasClinicCode: true })
  await user.click(screen.getByRole('button', { name: th.notify.safeLater }))
  expect(screen.getByText(th.notify.laterDone)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: th.report.backToMap })).toHaveAttribute('href', '/app')
})
it('builds a 72-hour HIV link that names no disease by default', async () => {
  const user = userEvent.setup()
  open({ group: 'hiv', hasClinicCode: false })
  await toLinkForm(user)
  await user.click(screen.getByRole('radio', { name: th.notify.bands.h72 }))
  await user.click(screen.getByRole('button', { name: th.notify.makeLink }))
  const link = (screen.getByLabelText(th.notify.linkLabel) as HTMLInputElement).value
  expect(decodeNotice(link.slice(link.indexOf('#')))).toMatchObject({ group: null, band: 'h72', tier: 2 })
  expect(link).not.toContain('hiv')
})
