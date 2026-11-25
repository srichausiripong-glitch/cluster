import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it } from 'vitest'
import App from '../App'
import { encodeNotice } from '../domain/link'
import { composeNotice, type NoticeInput } from '../domain/notify'
import { CLINICAL, setClinicalForTest, SOURCE_HOSTS, sourcesOf } from './clinical'
import { th } from './th'

afterEach(() => setClinicalForTest(null))
const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
const hashOf = (input: Partial<NoticeInput>) => '#' + encodeNotice(composeNotice({ group: 'syphilis', hasLabResult: true, nameDisease: true, band: 'w4', week: '2026-W46', ...input }))
/** Every element that shows clinical text, with the id it claims. */
const shown = () => [...document.querySelectorAll<HTMLElement>('[data-clinical]')].map((el) => ({ id: el.dataset.clinical!, text: el.textContent ?? '' }))

it('takes every clinical sentence on the help page and the recipient page from the register', async () => {
  const user = userEvent.setup()
  const seen: { id: string; text: string }[] = []
  let view = open('/app/help')
  seen.push(...shown())
  view.unmount()
  for (const input of [{}, { group: 'gono_chlam' as const }, { group: 'mpox' as const }, { nameDisease: false }, { nameDisease: false, band: 'h72' as const }]) {
    view = open('/r' + hashOf(input))
    await user.click(screen.getByRole('button', { name: th.recipient.reveal }))
    seen.push(...shown())
    view.unmount()
  }
  expect(seen.length).toBeGreaterThan(10)
  for (const { id, text } of seen) {
    expect(CLINICAL[id], id).toBeDefined()
    if (!CLINICAL[id].days) expect(text, id).toBe(CLINICAL[id].text)
  }
})
// General guidance with its sources, not a physician's signature (2026-11-18 design, decision 2).
it('backs every clinical sentence with an https source from a trusted publisher', () => {
  for (const t of Object.values(CLINICAL)) {
    const url = new URL(t.source.url)
    expect(url.protocol, t.id).toBe('https:')
    expect(SOURCE_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`)), `${t.id} ${url.hostname}`).toBe(true)
    expect(t.source.name.length, t.id).toBeGreaterThan(0)
  }
})
it('ends each advice block with the guidance line and each of its sources once', async () => {
  const user = userEvent.setup()
  let view = open('/app/help')
  const pep = screen.getByText(CLINICAL['help.pep'].text).closest('section')!
  expect(pep).toHaveTextContent(th.guidance.note)
  const links = (root: HTMLElement) => [...root.querySelectorAll<HTMLAnchorElement>('[data-source]')].map((a) => a.getAttribute('href'))
  expect(links(pep)).toEqual(sourcesOf('help.pep').map((s) => s.url))
  for (const a of pep.querySelectorAll('[data-source]')) expect(a).toHaveAttribute('target', '_blank')
  view.unmount()
  view = open('/r' + hashOf({ group: 'gono_chlam' }))
  await user.click(screen.getByRole('button', { name: th.recipient.reveal }))
  const ids = shown().map((s) => s.id)
  const all = links(document.body)
  expect(new Set(all).size).toBe(all.length)
  expect(new Set(all)).toEqual(new Set(sourcesOf(...ids).map((s) => s.url)))
  expect(document.body.textContent).not.toMatch(/ร่าง/)
  view.unmount()
})
