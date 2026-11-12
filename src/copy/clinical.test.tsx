import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it } from 'vitest'
import App from '../App'
import { encodeNotice } from '../domain/link'
import { composeNotice, type NoticeInput } from '../domain/notify'
import { CLINICAL, isSigned, setClinicalForTest } from './clinical'
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
it('shows the draft label on a block exactly while one of its sentences is a draft', async () => {
  const user = userEvent.setup()
  let view = open('/r' + hashOf({ group: 'gono_chlam' }))
  await user.click(screen.getByRole('button', { name: th.recipient.reveal }))
  const ids = shown().map((s) => s.id)
  expect(screen.getAllByText(th.draftClinical).length).toBeGreaterThan(0)
  view.unmount()
  setClinicalForTest(Object.fromEntries(ids.map((id) => [id, { ...CLINICAL[id], status: 'signed', signer: 'นพ. ทดสอบ', license: 'ว.00000', date: '2026-11-20' }])))
  view = open('/r' + hashOf({ group: 'gono_chlam' }))
  await user.click(screen.getByRole('button', { name: th.recipient.reveal }))
  expect(screen.queryAllByText(th.draftClinical)).toHaveLength(0)
  view.unmount()
})
it('has a name, a licence and a date for every signed sentence', () => {
  for (const entry of Object.values(CLINICAL)) {
    if (entry.status === 'signed') {
      expect(entry.signer, entry.id).toBeTruthy()
      expect(entry.license, entry.id).toBeTruthy()
      expect(entry.date, entry.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  }
  expect(isSigned()).toBe(true)
})
