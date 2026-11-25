import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Emoji } from './Emoji'
import { EMOJI_NAMES } from './emojiCodes'

it('draws every emoji the app names from a file of its own origin, so every phone shows the same picture', () => {
  expect(EMOJI_NAMES).toHaveLength(27)
  for (const name of EMOJI_NAMES) {
    const { container, unmount } = render(<Emoji name={name} />)
    const src = container.querySelector('img')!.getAttribute('src')
    expect(src, name).toBeTruthy()
    expect(src, name).not.toMatch(/^https?:\/\//)
    unmount()
  }
})

it('names an emoji only when it stands for words, and hides it otherwise', () => {
  render(
    <>
      <Emoji name="check" />
      <Emoji name="check" label="ไม่เจอ" />
    </>,
  )
  const [plain, named] = document.querySelectorAll('img')
  expect(plain).toHaveAttribute('alt', '')
  expect(plain).toHaveAttribute('aria-hidden', 'true')
  expect(named).toHaveAttribute('alt', 'ไม่เจอ')
  expect(named).not.toHaveAttribute('aria-hidden')
})
