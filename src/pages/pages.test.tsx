import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import App from '../App'
import { th } from '../copy/th'

afterEach(() => vi.unstubAllEnvs())
const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

it('names who controls the data and how to reach them, from the deploy settings', () => {
  vi.stubEnv('VITE_CONTROLLER_NAME', 'ผู้ควบคุมทดสอบ')
  vi.stubEnv('VITE_CONTACT_EMAIL', 'contact@example.org')
  open('/privacy')
  expect(screen.getByText(/ผู้ควบคุมทดสอบ/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'contact@example.org' })).toHaveAttribute('href', 'mailto:contact@example.org')
})
it('says what the server keeps, what Vercel keeps, and that the operator sees an envelope while taking it', () => {
  open('/privacy')
  const kept = within(screen.getByRole('region', { name: th.privacy.serverKeeps }))
  for (const line of th.privacy.kept) expect(kept.getByText(line)).toBeInTheDocument()
  expect(screen.getByText(th.privacy.vercelLogs)).toBeInTheDocument()
  expect(screen.getByText(th.privacy.operatorSees)).toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/คลินิกพาร์ตเนอร์|รหัสคลินิก/)
})
it('says in the terms that signals are user reports nobody checks', () => {
  open('/terms')
  expect(screen.getByText(th.terms.unverified)).toBeInTheDocument()
})
it('links both pages from the help page, the consent step of a report and the check-in', async () => {
  const user = userEvent.setup()
  const view = open('/app/help')
  expect(screen.getByRole('link', { name: th.privacy.title })).toHaveAttribute('href', '/privacy')
  expect(screen.getByRole('link', { name: th.terms.title })).toHaveAttribute('href', '/terms')
  view.unmount()
  const report = open('/app/report')
  await user.click(screen.getByRole('button', { name: th.report.way.positive }))
  await user.click(screen.getByRole('button', { name: th.group.syphilis }))
  await user.click(screen.getByRole('button', { name: th.source.lab_result }))
  expect(screen.getByRole('link', { name: th.privacy.title })).toHaveAttribute('href', '/privacy')
  report.unmount()
  open('/app')
  await user.click(screen.getByRole('button', { name: new RegExp(th.checkIn.cta) }))
  expect(within(screen.getByRole('dialog')).getByRole('link', { name: th.privacy.title })).toHaveAttribute('href', '/privacy')
})
it('offers a way back into the app and the quick exit on the privacy and terms pages', () => {
  for (const path of ['/privacy', '/terms']) {
    const view = open(path)
    expect(screen.getByRole('link', { name: th.common.backToApp }), path).toHaveAttribute('href', '/app')
    expect(screen.getByRole('button', { name: th.common.quickExit }), path).toBeInTheDocument()
    view.unmount()
  }
})
