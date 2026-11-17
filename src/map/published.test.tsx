import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import App from '../App'
import { th } from '../copy/th'
import { DISTRICTS } from '../domain/districts'
import type { PublishedFile } from '../domain/types'
import { loadPublished, setPublishedForTest } from './published'

afterEach(() => {
  setPublishedForTest(null)
  vi.unstubAllGlobals()
})
const FILE: PublishedFile = {
  week: '2026-W46',
  publishedAt: '2026-11-16T20:00:00.000Z',
  intakeOpen: true,
  areas: [
    { areaId: 'bang_rak', state: 'shown', density: 'medium', step: 'new', testing: 'medium', symptoms: null },
    { areaId: 'bkk', state: 'shown', density: 'thin', step: 'new', testing: 'low', symptoms: null },
  ],
}
const open = (path = '/app') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
const zoneButton = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}:`) })

it('fetches the weekly file and keeps the last good one for when the server cannot be reached', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(FILE))))
  await loadPublished()
  open()
  expect(zoneButton('บางรัก')).toHaveAccessibleName(`บางรัก: ${th.map.state.shown}`)
  setPublishedForTest(null)
  vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))))
  await loadPublished()
  expect(zoneButton('บางรัก')).toHaveAccessibleName(`บางรัก: ${th.map.state.shown}`)
})
it('shows every zone as having no data, and no error, before any file exists', async () => {
  localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ week: null, publishedAt: null, intakeOpen: true, areas: [] }))))
  await loadPublished()
  open()
  for (const { name } of DISTRICTS) expect(zoneButton(name)).toHaveAccessibleName(`${name}: ${th.map.state.no_data}`)
  expect(screen.queryByRole('alert')).toBeNull()
})
it('labels every signal as user reports, not places of infection, and shows the testing level in the district sheet', async () => {
  const user = userEvent.setup()
  setPublishedForTest(FILE)
  open()
  await user.click(zoneButton('บางรัก'))
  const sheet = within(await screen.findByRole('dialog'))
  // bang_rak: confirmed medium and testing medium, so two rows read ปานกลาง.
  expect(sheet.getAllByRole('img', { name: 'ปานกลาง' })).toHaveLength(2)
  await user.click(sheet.getByRole('button', { name: th.map.sheet.from }))
  expect(sheet.getByText(th.map.legendWhat)).toBeInTheDocument()
  expect(th.map.legendWhat).toBe('นับจากรายงานของผู้ใช้ที่เลือกเขตนี้เป็นเขตที่ใช้ชีวิต ไม่ใช่สถานที่ติดเชื้อ')
  expect(sheet.getByText(th.map.testingNotSafe)).toBeInTheDocument()
  expect(th.map.testingNotSafe).toBe('มีคนตรวจมากไม่ได้แปลว่าเขตนี้ปลอดภัย แปลว่ามีคนดูแลตัวเองมาก')
})
it('says reports are closed for now, in place of the map box, while intake is closed', async () => {
  const user = userEvent.setup()
  setPublishedForTest({ ...FILE, intakeOpen: false })
  open('/app/report')
  await user.click(screen.getByRole('button', { name: th.report.found.syphilis }))
  await user.click(screen.getByRole('button', { name: th.report.source.lab_result }))
  expect(screen.queryByRole('button', { name: th.report.toMap })).toBeNull()
  expect(screen.getByText(th.report.closed)).toBeInTheDocument()
})
