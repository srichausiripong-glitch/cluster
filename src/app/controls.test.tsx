import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { th } from '../copy/th'
import { DISTRICTS } from '../domain/districts'
import { DistrictPicker } from './DistrictPicker'
import { levelOf } from './level'
import { LevelDots } from './LevelDots'
import { More } from './More'
import { SendsOnly } from './SendsOnly'

/** A district list that keeps its choice, as a screen would. */
function Harness() {
  const [id, setId] = useState<string | null>(null)
  return <DistrictPicker district={id} onDistrict={setId} name="d" />
}
const names = () => screen.getAllByRole('radio').map((r) => r.closest('label')!.textContent)

it('lists all 50 districts as choices, in the order of the district list', () => {
  render(<Harness />)
  expect(names()).toEqual(DISTRICTS.map((d) => d.name))
})

it('finds a district by part of its name, with or without the word เขต or spaces', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  const search = screen.getByLabelText(th.picker.search)
  await user.type(search, 'บาง')
  expect(names()).toHaveLength(12)
  for (const n of names()) expect(n).toContain('บาง')
  await user.clear(search)
  await user.type(search, 'เขต บางรัก')
  expect(names()).toEqual(['บางรัก'])
})

it('says so when nothing matches, and keeps the district already chosen', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  await user.click(screen.getByRole('radio', { name: 'บางรัก' }))
  await user.type(screen.getByLabelText(th.picker.search), 'zz')
  expect(screen.getByText(th.picker.none)).toBeInTheDocument()
  await user.clear(screen.getByLabelText(th.picker.search))
  expect(screen.getByRole('radio', { name: 'บางรัก' })).toBeChecked()
})

it('offers no way to use the phone’s position', () => {
  render(<Harness />)
  expect(screen.queryAllByRole('button', { name: /ตำแหน่ง/ })).toEqual([])
  expect(screen.queryAllByRole('checkbox', { name: /ตำแหน่ง/ })).toEqual([])
})

it('opens and closes an explanation from its ⓘ line', async () => {
  const user = userEvent.setup()
  render(<More summary="สรุป">รายละเอียด</More>)
  const button = screen.getByRole('button', { name: 'สรุป' })
  expect(button).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByText('รายละเอียด')).toBeNull()
  await user.click(button)
  expect(button).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText('รายละเอียด')).toBeInTheDocument()
  await user.click(button)
  expect(screen.queryByText('รายละเอียด')).toBeNull()
})

it('shows a level as filled dots out of three, named in words', () => {
  render(<LevelDots level={levelOf('medium')} label="ปานกลาง" />)
  expect(screen.getByRole('img', { name: 'ปานกลาง' }).querySelectorAll('[data-filled]')).toHaveLength(2)
  expect([levelOf('thin'), levelOf('low'), levelOf('dense'), levelOf('high')]).toEqual([1, 1, 3, 3])
})

it('says in one line what leaves the phone, and the rest behind ⓘ with the privacy notice in a new tab', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <SendsOnly emoji="check" kind="ไม่เจอ" extra={['เพิ่ม']} />
    </MemoryRouter>,
  )
  const line = screen.getByRole('button', { name: /ส่งแค่:\s*ไม่เจอ\s*· เขต · สัปดาห์/ })
  await user.click(line)
  for (const d of [...th.send.details, 'เพิ่ม']) expect(screen.getByText(d)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: th.privacy.title })).toHaveAttribute('target', '_blank')
})
