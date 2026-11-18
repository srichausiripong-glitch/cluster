import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { formatThaiDate } from '../copy/format'
import { th } from '../copy/th'
import { withDistrict } from '../data/carePoints'
import { FIXTURE_POINTS, FIXTURE_UNVERIFIED } from '../test/carePoints'
import { CarePointSheet } from './CarePointSheet'

// A place's sheet at two levels of trust (redesign spec 5.8): a place nobody has confirmed says to
// call first, where its data came from and when, and shows none of the detail it cannot vouch for.
const open = (id: string) => {
  const point = [...FIXTURE_POINTS, ...FIXTURE_UNVERIFIED].map(withDistrict).find((p) => p.id === id)!
  render(
    <MemoryRouter>
      <CarePointSheet point={point} onClose={() => {}} />
    </MemoryRouter>,
  )
  return within(screen.getByRole('dialog'))
}

it('shows an unverified place’s source and date and the call-first label, and none of the detail it cannot vouch for', () => {
  const sheet = open('cu1')
  expect(sheet.getByText(th.care.unverified)).toBeInTheDocument()
  const source = sheet.getByRole('link', { name: 'example.org' })
  expect(source).toHaveAttribute('href', 'https://example.org/care')
  expect(source).toHaveAttribute('target', '_blank')
  expect(sheet.getByText(th.care.fetched.replace('{date}', formatThaiDate(new Date('2026-11-17'))))).toBeInTheDocument()
  for (const word of ['ตรวจเอชไอวี', 'จันทร์-ศุกร์', th.care.pep, th.care.klassBNote]) expect(sheet.queryByText(word), word).toBeNull()
})
it('offers a call and the way there, the way there in a new tab', () => {
  const sheet = open('cu1')
  expect(sheet.getByRole('link', { name: th.care.call })).toHaveAttribute('href', 'tel:020000000')
  const way = sheet.getByRole('link', { name: th.care.directions })
  expect(way).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=13.62,100.44')
  expect(way).toHaveAttribute('target', '_blank')
})
it('keeps the call and the way there at the foot of the sheet, in view on a short screen too', () => {
  const sheet = open('cu1')
  expect(sheet.getByRole('link', { name: th.care.call }).closest('.sticky')).not.toBeNull()
  expect(sheet.getByRole('link', { name: th.care.directions }).closest('.sticky')).not.toBeNull()
})
it('offers no call button and no empty rows for a place without a phone or an address', () => {
  const sheet = open('cu2')
  expect(sheet.queryByRole('link', { name: th.care.call })).toBeNull()
  expect(sheet.getByRole('link', { name: th.care.directions })).toBeInTheDocument()
  for (const dd of screen.getByRole('dialog').querySelectorAll('dd')) expect(dd.textContent?.trim(), dd.outerHTML).not.toBe('')
})
it('keeps a verified place’s full detail, and adds the way there', () => {
  const sheet = open('cp1')
  for (const words of ['ตรวจเอชไอวี · ตรวจซิฟิลิส · ถุงยางอนามัย', 'จันทร์-ศุกร์ 08:00-16:00', 'ฟรีตามสิทธิ']) expect(sheet.getByText(words)).toBeInTheDocument()
  expect(sheet.getByRole('link', { name: th.care.directions })).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=13.766536,100.538162')
  expect(sheet.queryByText(th.care.unverified)).toBeNull()
})

// ---- contacts (2026-11-18 design, decision 1) -------------------------------------------------------
it('lists a place’s email, website, Facebook and LINE, each opening on its own', () => {
  const point = withDistrict({ ...FIXTURE_UNVERIFIED[0], email: 'a@clinic.example.org', website: 'https://clinic.example.org/', facebook: 'https://www.facebook.com/clinic', line: '@clinic' })
  render(
    <MemoryRouter>
      <CarePointSheet point={point} onClose={() => {}} />
    </MemoryRouter>,
  )
  const sheet = within(screen.getByRole('dialog'))
  expect(sheet.getByText(th.care.contact)).toBeInTheDocument()
  expect(sheet.getByRole('link', { name: th.care.email })).toHaveAttribute('href', 'mailto:a@clinic.example.org')
  for (const [name, href] of [[th.care.website, 'https://clinic.example.org/'], [th.care.facebook, 'https://www.facebook.com/clinic'], [th.care.line, 'https://line.me/R/ti/p/@clinic']]) {
    const link = sheet.getByRole('link', { name })
    expect(link).toHaveAttribute('href', href)
    expect(link).toHaveAttribute('target', '_blank')
  }
})
it('offers the Google Maps listing in place of a call, and no empty contact row, for a place with no phone', () => {
  const sheet = open('cu2')
  const maps = sheet.getByRole('link', { name: th.care.googleMaps })
  expect(maps).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('โรงพยาบาลทดสอบตัวอย่าง 13.88,100.72'))
  expect(maps).toHaveAttribute('target', '_blank')
  expect(sheet.queryByRole('link', { name: th.care.call })).toBeNull()
  expect(sheet.queryByText(th.care.contact)).toBeNull()
  cleanup()
  expect(open('cu1').queryByRole('link', { name: th.care.googleMaps })).toBeNull()
})
