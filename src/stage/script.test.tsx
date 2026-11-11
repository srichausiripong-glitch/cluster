import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { resetDemo } from '../store/actions'
import { clinic, operator, phone, pub } from '../store/stores'

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

/** The eight-step pitch script, end to end, across the clinic console, the user app and the publisher. */
it('walks the pitch script: one confirmed person tells a contact, and one report alone does not light the map', async () => {
  const user = userEvent.setup()
  resetDemo()

  // 1-2: the clinic issues a code and records a positive result against it
  let view = at('/clinic/issue')
  await user.click(screen.getByRole('button', { name: th.clinic.issue }))
  const id = clinic.get().codes[0].id
  view.unmount()
  view = at('/clinic/results')
  await user.selectOptions(screen.getByLabelText(`${th.clinic.setPositive} ${id}`), 'syphilis')
  view.unmount()

  // 3-4: the person sends a signal with the code and agrees to be counted
  view = at('/app/report')
  await user.click(screen.getByRole('button', { name: th.group.syphilis }))
  await user.click(screen.getByRole('button', { name: th.source.clinic_code }))
  await user.type(screen.getByLabelText(th.report.codeInput), id)
  await user.click(screen.getByRole('button', { name: th.report.useCode }))
  await user.click(screen.getByLabelText(th.report.addToArea))
  await user.click(screen.getByRole('button', { name: th.report.finish }))
  expect(screen.getByText(th.report.receiptClinicCarries)).toBeInTheDocument()
  expect(phone.get().card).toBeNull()
  view.unmount()

  // 5: tell a contact with a self-sent link
  view = at('/app/notify?g=syphilis&c=1')
  await user.click(screen.getByRole('button', { name: th.notify.safeYes }))
  await user.click(screen.getByRole('button', { name: th.notify.linkTitle }))
  await user.click(screen.getByRole('button', { name: th.notify.makeLink }))
  const link = (screen.getByLabelText(th.notify.linkLabel) as HTMLInputElement).value
  expect(link).toContain('/r#')
  view.unmount()

  // 6: the recipient opens it; the default names no disease but carries a clinic code
  view = at('/r' + link.slice(link.indexOf('#')))
  await user.click(screen.getByRole('button', { name: th.recipient.reveal }))
  expect(screen.queryByText(th.group.syphilis)).toBeNull()
  expect(screen.getByText(th.recipient.fastTrack)).toBeInTheDocument()
  view.unmount()

  // 7: the clinic sends counts only
  view = at('/clinic/batch')
  await user.click(screen.getByRole('button', { name: th.clinic.sendBatch }))
  expect(operator.get().batches[0].counts).toEqual({ syphilis: 1 })
  view.unmount()

  // 8: the publisher publishes; one report stays under the threshold
  view = at('/')
  await user.click(screen.getByRole('button', { name: th.operator.publish }))
  expect(pub.get().files.at(-1)!.areas[0].state).toBe('below_threshold')
  view.unmount()
  at('/app')
  await user.click(screen.getByRole('button', { name: th.map.openSignal }))
  expect(within(screen.getByRole('dialog')).getByText(th.map.state.below_threshold)).toBeInTheDocument()
})
