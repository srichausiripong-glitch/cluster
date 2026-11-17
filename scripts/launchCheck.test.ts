// @vitest-environment node
import { expect, it } from 'vitest'
import { launchCheck } from './launchCheck'

const ENV = {
  VITE_CONTROLLER_NAME: 'ผู้ควบคุม',
  VITE_CONTACT_EMAIL: 'a@example.org',
  ADMIN_USERS: JSON.stringify([{ name: 'a', hash: 'scrypt$x$y' }, { name: 'b', hash: 'scrypt$x$y' }]),
  ENVELOPE_PRIVATE_JWK: '{"kty":"EC"}',
  SESSION_SECRET: 's',
  DATABASE_URL: 'postgres://x',
  CRON_SECRET: 'c',
}
const point = (verified: boolean) => ({ id: 'p', source: 'https://example.org/care', fetched: '2026-11-17', verified: verified ? { date: '2026-11-20', by: 'x', method: 'phone' } : null })
const DATA = { carePoints: [point(true)], clinical: [{ id: 'a', status: 'signed' }] }

it('passes when everything is ready', () => {
  expect(launchCheck(ENV, DATA)).toEqual([])
})
it('names every reason it is not ready', () => {
  const reasons = launchCheck(
    { ...ENV, VITE_CONTROLLER_NAME: '', VITE_CONTACT_EMAIL: '', ADMIN_USERS: JSON.stringify([{ name: 'a', hash: 'h' }]), ENVELOPE_PRIVATE_JWK: '', SESSION_SECRET: '', DATABASE_URL: '', CRON_SECRET: '' },
    { carePoints: [point(true), { ...point(false), id: 'q', source: undefined }], clinical: [{ id: 'advice.x', status: 'draft' }] },
  )
  const text = reasons.join('\n')
  for (const word of ['q', 'advice.x', 'VITE_CONTROLLER_NAME', 'VITE_CONTACT_EMAIL', 'ADMIN_USERS', 'ENVELOPE_PRIVATE_JWK', 'SESSION_SECRET', 'DATABASE_URL', 'CRON_SECRET']) expect(text, word).toContain(word)
})
it('refuses an empty list of care points', () => {
  expect(launchCheck(ENV, { ...DATA, carePoints: [] }).join()).toMatch(/care point/)
})
it('lets a preview build through without confirmed data, but never production', () => {
  const unready = { carePoints: [], clinical: [{ id: 'a', status: 'draft' }] }
  expect(launchCheck({ ...ENV, LAUNCH_CHECK_PREVIEW: '1', VERCEL_ENV: 'preview' }, unready)).toEqual([])
  expect(launchCheck({ ...ENV, LAUNCH_CHECK_PREVIEW: '1', VERCEL_ENV: 'production' }, unready).length).toBeGreaterThan(0)
  expect(launchCheck({ ...ENV, LAUNCH_CHECK_PREVIEW: '1', VERCEL_ENV: 'preview', SESSION_SECRET: '' }, unready).join()).toContain('SESSION_SECRET')
})

// Two levels of trust (redesign spec 5.8): an unverified point may launch if it names where it came
// from and when; a verified one must say who confirmed it, when and how.
const reasonsFor = (carePoints: Record<string, unknown>[]) => launchCheck(ENV, { ...DATA, carePoints: carePoints as never })
it('lets unverified points launch when each names its source and the day it was copied', () => {
  expect(reasonsFor([{ id: 'a', verified: null, source: 'https://x.org', fetched: '2026-11-17' }])).toEqual([])
})
it('refuses an unverified point without an https source or a date', () => {
  expect(reasonsFor([{ id: 'a', verified: null, source: 'x', fetched: '2026-11-17' }]).join()).toMatch(/care point a\b.*source/)
  expect(reasonsFor([{ id: 'a', verified: null, source: 'http://x.org', fetched: '2026-11-17' }]).join()).toMatch(/care point a\b.*source/)
  expect(reasonsFor([{ id: 'a', verified: null, source: 'https://x.org' }]).join()).toMatch(/care point a\b.*copied/)
  expect(reasonsFor([{ id: 'a', verified: null, source: 'https://x.org', fetched: '17/11/2026' }]).join()).toMatch(/care point a\b.*copied/)
})
it('refuses a verified point whose verification lacks a date, a name or a method', () => {
  const at = (verified: unknown) => reasonsFor([{ id: 'a', source: 'https://x.org', fetched: '2026-11-17', verified }]).join()
  expect(at({ date: '2026-11-20', by: '', method: 'phone' })).toMatch(/care point a\b/)
  expect(at({ date: '', by: 'x', method: 'phone' })).toMatch(/care point a\b/)
  expect(at({ date: '2026-11-20', by: 'x', method: 'email' })).toMatch(/care point a\b/)
  expect(at(true)).toMatch(/care point a\b/)
  expect(at({ date: '2026-11-20', by: 'x', method: 'visit' })).toBe('')
})
it('refuses a PEP point verified other than by phone', () => {
  const pep = (method: string) => reasonsFor([{ id: 'a', pep: true, source: 'https://x.org', fetched: '2026-11-17', verified: { date: '2026-11-20', by: 'x', method } }]).join()
  expect(pep('visit')).toMatch(/care point a\b/)
  expect(pep('phone')).toBe('')
})
