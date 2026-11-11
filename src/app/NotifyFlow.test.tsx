import { render, screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { decodeNotice } from '../domain/link'
import type { DiseaseGroup } from '../domain/types'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
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

// ---- found by the use walk-through ---------------------------------------------------------------
const makeLink = async (user: UserEvent) => {
  open({ group: 'syphilis', hasClinicCode: true })
  await toLinkForm(user)
  await user.click(screen.getByLabelText(th.notify.bands.w2))
  await user.click(screen.getByRole('button', { name: th.notify.makeLink }))
}

it('brings the new link into view and puts the keyboard on the copy button', async () => {
  const user = userEvent.setup()
  const scrolled = vi.fn()
  vi.stubGlobal('scrollTo', () => {})
  Element.prototype.scrollIntoView = scrolled
  await makeLink(user)
  expect(scrolled).toHaveBeenCalled()
  expect(screen.getByRole('button', { name: th.notify.copyLink })).toHaveFocus()
})
it('says so at the button when the link was copied', async () => {
  const user = userEvent.setup()
  Element.prototype.scrollIntoView = () => {}
  await makeLink(user)
  await user.click(screen.getByRole('button', { name: th.notify.copyLink }))
  expect(await screen.findByRole('button', { name: th.common.copied })).toBeInTheDocument()
  expect(screen.queryByText(th.notify.copyFailed)).toBeNull()
})
it('says how to copy by hand when the browser refuses to copy', async () => {
  const user = userEvent.setup()
  Element.prototype.scrollIntoView = () => {}
  await makeLink(user)
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
  await user.click(screen.getByRole('button', { name: th.notify.copyLink }))
  expect(await screen.findByText(th.notify.copyFailed)).toBeInTheDocument()
})
it('says how to copy by hand where the browser has no way to copy at all', async () => {
  const user = userEvent.setup()
  Element.prototype.scrollIntoView = () => {}
  await makeLink(user)
  vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
  await user.click(screen.getByRole('button', { name: th.notify.copyLink }))
  expect(await screen.findByText(th.notify.copyFailed)).toBeInTheDocument()
})
it('can be opened again from the self-care screen, as the "later" answer promises', () => {
  render(
    <MemoryRouter initialEntries={['/app/me']}>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getByRole('link', { name: th.report.goNotify })).toHaveAttribute('href', '/app/notify')
})
