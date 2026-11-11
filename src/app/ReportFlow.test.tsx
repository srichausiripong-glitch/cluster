import { render, screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import type { DiseaseGroup } from '../domain/types'
import { createSlip, flagPositive, issueClinicCode, resetDemo, saveCard } from '../store/actions'
import { clinic, operator, phone } from '../store/stores'

const open = (path = '/app/report') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

async function enterCode(user: UserEvent, group: DiseaseGroup, id: string) {
  await user.click(screen.getByRole('button', { name: th.group[group] }))
  await user.click(screen.getByRole('button', { name: th.source.clinic_code }))
  await user.clear(screen.getByLabelText(th.report.codeInput))
  await user.type(screen.getByLabelText(th.report.codeInput), id)
  await user.click(screen.getByRole('button', { name: th.report.useCode }))
}

it('says at the first step what a signal is and who sees it', () => {
  open()
  expect(screen.getByText(th.report.privacy)).toBeInTheDocument()
})
it('never offers the area signal for HIV, even with a clinic code the clinic flagged for HIV', async () => {
  const user = userEvent.setup()
  resetDemo()
  const id = issueClinicCode()
  flagPositive(id, 'hiv')
  open()
  await enterCode(user, 'hiv', id)
  expect(screen.queryByLabelText(th.report.addToArea)).toBeNull()
  expect(screen.getByText(th.report.hivNoMap)).toBeInTheDocument()
})
it('shows the same screen for a code with a result and a code without one, so it cannot be used as proof of a result', async () => {
  const user = userEvent.setup()
  resetDemo()
  const flagged = issueClinicCode()
  flagPositive(flagged, 'syphilis')
  const unflagged = issueClinicCode()
  const seen: string[] = []
  for (const id of [flagged, unflagged]) {
    const view = open()
    await enterCode(user, 'syphilis', id)
    expect(screen.getByLabelText(th.report.addToArea)).toBeInTheDocument()
    seen.push(view.container.textContent ?? '')
    view.unmount()
  }
  expect(seen[0]).toBe(seen[1])
})
it('records consent at the clinic with the chosen group, and says the code check reached the clinic', async () => {
  const user = userEvent.setup()
  resetDemo()
  const id = issueClinicCode()
  flagPositive(id, 'syphilis')
  open()
  await enterCode(user, 'syphilis', id)
  await user.click(screen.getByLabelText(th.report.addToArea))
  await user.click(screen.getByRole('button', { name: th.report.finish.area }))
  expect(clinic.get().codes[0]).toMatchObject({ cityConsent: true, consentGroup: 'syphilis' })
  expect(phone.get().card).toBeNull()
  expect(screen.getByRole('heading', { name: th.report.outcome.counted })).toBeInTheDocument()
  expect(screen.getByText(th.report.receiptCodeChecked)).toBeInTheDocument()
  expect(screen.getByText(th.report.receiptMapWeekly)).toBeInTheDocument()
})
it('never carries a ticked consent box over to another disease group', async () => {
  const user = userEvent.setup()
  resetDemo()
  const id = issueClinicCode()
  open()
  await enterCode(user, 'syphilis', id)
  await user.click(screen.getByLabelText(th.report.addToArea))
  await user.click(screen.getByRole('button', { name: th.common.back }))
  await user.click(screen.getByRole('button', { name: th.common.back }))
  await enterCode(user, 'gono_chlam', id)
  expect(screen.getByLabelText(th.report.addToArea)).not.toBeChecked()
})
it('explains a slip code or a fast-track code typed in place of a clinic code', async () => {
  const user = userEvent.setup()
  resetDemo()
  open()
  await enterCode(user, 'syphilis', createSlip())
  expect(screen.getByText(th.report.codeIsSlip)).toBeInTheDocument()
  await user.clear(screen.getByLabelText(th.report.codeInput))
  await user.type(screen.getByLabelText(th.report.codeInput), 'FF289{Enter}')
  expect(screen.getByText(th.report.codeIsFastTrack)).toBeInTheDocument()
  await user.clear(screen.getByLabelText(th.report.codeInput))
  await user.type(screen.getByLabelText(th.report.codeInput), 'ZZZ000{Enter}')
  expect(screen.getByText(th.report.codeBad)).toBeInTheDocument()
})
it('gives a person without a code a reason and a way to care points', async () => {
  const user = userEvent.setup()
  open()
  await user.click(screen.getByRole('button', { name: th.group.syphilis }))
  expect(screen.getByText(th.report.noCodeSyphilis)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: th.report.findCare })).toHaveAttribute('href', '/app/list')
})
it('says plainly when nothing was sent or kept, and sends an untested person to care points first', async () => {
  const user = userEvent.setup()
  resetDemo()
  open()
  await user.click(screen.getByRole('button', { name: th.group.gono_chlam }))
  await user.click(screen.getByRole('button', { name: th.source.symptoms }))
  await user.click(screen.getByRole('button', { name: th.report.finish.none })) // both boxes left unticked
  expect(screen.getByRole('heading', { name: th.report.outcome.nothing })).toBeInTheDocument()
  expect(screen.queryByText(th.report.outcome.counted)).toBeNull()
  expect(screen.getByText(th.report.receiptNothingLeft)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: th.report.nextTest })).toHaveAttribute('href', '/app/list')
  expect(phone.get().card).toBeNull()
  expect(operator.get().batches).toHaveLength(0)
})
it('keeps a card on the phone only when the person ticks the box, and labels the button with what it will do', async () => {
  const user = userEvent.setup()
  resetDemo()
  open()
  await user.click(screen.getByRole('button', { name: th.group.mpox }))
  await user.click(screen.getByRole('button', { name: th.source.symptoms }))
  expect(screen.getByRole('button', { name: th.report.finish.none })).toBeInTheDocument()
  await user.click(screen.getByLabelText(th.report.keepCard))
  await user.click(screen.getByRole('button', { name: th.report.finish.card }))
  expect(phone.get().card).toMatchObject({ group: 'mpox', source: 'symptoms', hasClinicCode: false })
  expect(screen.getByRole('heading', { name: th.report.outcome.kept })).toBeInTheDocument()
})
it('sends a self-tester to confirm the result and to 1663, and opens the notify step without the disease in the address', async () => {
  const user = userEvent.setup()
  resetDemo()
  open()
  await user.click(screen.getByRole('button', { name: th.group.hiv }))
  await user.click(screen.getByRole('button', { name: th.source.hiv_self_test }))
  await user.click(screen.getByRole('button', { name: th.report.finish.none }))
  expect(screen.getByRole('link', { name: th.report.nextConfirm })).toHaveAttribute('href', '/app/list')
  expect(screen.getByRole('link', { name: th.report.call1663 })).toHaveAttribute('href', 'tel:1663')
  expect(screen.getByRole('link', { name: th.report.goNotify })).toHaveAttribute('href', '/app/notify')
})
it('keeps embed=1 on links inside the stage pane', async () => {
  const user = userEvent.setup()
  resetDemo()
  open('/app/report?embed=1')
  await user.click(screen.getByRole('button', { name: th.group.gono_chlam }))
  await user.click(screen.getByRole('button', { name: th.source.symptoms }))
  await user.click(screen.getByRole('button', { name: th.report.finish.none }))
  expect(screen.getByRole('link', { name: th.report.backToMap })).toHaveAttribute('href', '/app?embed=1')
  expect(screen.getByRole('link', { name: th.report.goNotify })).toHaveAttribute('href', '/app/notify?embed=1')
})

// ---- found by the use walk-through ---------------------------------------------------------------
it('does not say the phone holds nothing while an earlier card is still on it', async () => {
  const user = userEvent.setup()
  resetDemo()
  saveCard({ group: 'syphilis', source: 'clinic_code', sentAt: new Date().toISOString(), hasClinicCode: true })
  open()
  await user.click(screen.getByRole('button', { name: th.group.gono_chlam }))
  await user.click(screen.getByRole('button', { name: th.source.symptoms }))
  await user.click(screen.getByRole('button', { name: th.report.finish.none }))
  expect(screen.queryByText(th.report.receiptNoCard)).toBeNull()
  expect(screen.getByText(th.report.receiptOldCard)).toBeInTheDocument()
})
