import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import App from '../App'
import { th } from '../copy/th'

it('moves between screens without adding to the browser history, so Back leaves the app', async () => {
  const user = userEvent.setup()
  window.history.replaceState(null, '', '/app')
  const start = window.history.length
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  )
  for (const tab of [th.nav.list, th.nav.me, th.nav.help, th.nav.map]) await user.click(screen.getByRole('link', { name: tab }))
  await user.click(screen.getByRole('link', { name: th.home.found }))
  await user.click(screen.getByRole('button', { name: th.report.found.symptoms }))
  await user.click(screen.getByRole('button', { name: th.common.back }))
  expect(window.location.pathname).toBe('/app/report')
  expect(window.history.length).toBe(start)
})
it('replaces the page with a blank one on the quick exit', async () => {
  const user = userEvent.setup()
  const replace = vi.fn()
  vi.stubGlobal('location', { ...window.location, replace })
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  )
  await user.click(screen.getByRole('button', { name: th.common.quickExit }))
  expect(replace).toHaveBeenCalledWith('about:blank')
  vi.unstubAllGlobals()
})
it('says on the help page, behind ⓘ, what the quick exit cannot erase', async () => {
  const user = userEvent.setup()
  window.history.replaceState(null, '', '/app/help')
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  )
  await user.click(screen.getByRole('button', { name: th.help.exitMore }))
  expect(screen.getByText(th.help.historyNote)).toBeInTheDocument()
})

it('opens the followed district when the weekly notification is tapped, without adding to the history', async () => {
  const { phone } = await import('../store/stores')
  phone.update((s) => ({ ...s, follow: 'bang_rak' }))
  const worker = new EventTarget()
  Object.defineProperty(navigator, 'serviceWorker', { value: worker, configurable: true })
  try {
    window.history.replaceState(null, '', '/app/list')
    const start = window.history.length
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    )
    worker.dispatchEvent(new MessageEvent('message', { data: 'cluster-follow' }))
    expect(await screen.findByRole('dialog', { name: 'เขตบางรัก' })).toBeInTheDocument()
    expect(window.history.length).toBe(start)
  } finally {
    Reflect.deleteProperty(navigator, 'serviceWorker')
  }
})
