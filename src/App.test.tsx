import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from './App'

const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
const inApp = () => screen.getByRole('navigation', { name: 'เมนูหลัก' })

it('opens the app itself at the bare address', () => {
  open('/')
  expect(inApp()).toBeInTheDocument()
})
it('has no demo screens, seeds or phase switch', () => {
  for (const path of ['/stage', '/clinic', '/clinic/issue', '/operator', '/data', '/design']) {
    const { unmount } = open(path)
    expect(inApp()).toBeInTheDocument()
    unmount()
  }
  open('/app?seed=threshold&phase=2')
  const keys = Object.keys(localStorage)
  expect(keys.filter((k) => /clinic|operator|public|ledger|demo/.test(k))).toEqual([])
  expect(document.body.textContent).not.toContain('ตัวอย่างเฟส 2')
  expect(document.body.textContent).not.toContain('ต้นแบบ ข้อมูลจำลอง')
})
it('keeps a place for the public pages and the back office', () => {
  for (const [path, name] of [
    ['/privacy', 'นโยบายความเป็นส่วนตัว'],
    ['/terms', 'ข้อตกลงการใช้'],
    ['/transparency', 'รายงานความโปร่งใส'],
    ['/admin', 'หลังบ้าน'],
  ]) {
    const { unmount } = open(path)
    expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument()
    unmount()
  }
})
