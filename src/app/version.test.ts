import { afterEach, expect, it, vi } from 'vitest'
import { moduleSrc, reloadIfNewVersion } from './version'

afterEach(() => {
  vi.unstubAllGlobals()
  document.head.innerHTML = ''
})

// Deferred minor (traffic-light review): a tab opened before a new version keeps drawing the old map.
it('reads the module script a page loads', () => {
  expect(moduleSrc('<script type="module" crossorigin src="/assets/index-abc.js"></script>')).toBe('/assets/index-abc.js')
  expect(moduleSrc('<p>no script</p>')).toBeNull()
})
it('reloads an old tab when the server now serves another version, and leaves a current one alone', async () => {
  document.head.innerHTML = '<script type="module" src="/assets/index-old.js"></script>'
  const reload = vi.fn()
  vi.stubGlobal('fetch', vi.fn(async () => new Response('<script type="module" src="/assets/index-new.js"></script>')))
  expect(await reloadIfNewVersion(reload)).toBe(true)
  expect(reload).toHaveBeenCalledOnce()
  vi.stubGlobal('fetch', vi.fn(async () => new Response('<script type="module" src="/assets/index-old.js"></script>')))
  expect(await reloadIfNewVersion(reload)).toBe(false)
  vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))))
  expect(await reloadIfNewVersion(reload)).toBe(false)
  expect(reload).toHaveBeenCalledOnce()
})
