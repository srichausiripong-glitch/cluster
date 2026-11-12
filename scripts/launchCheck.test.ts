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
const point = (verified: boolean) => ({ id: 'p', verified: verified ? { date: '2026-11-20', by: 'x', method: 'phone' } : null })
const DATA = { carePoints: [point(true)], clinical: [{ id: 'a', status: 'signed' }] }

it('passes when everything is ready', () => {
  expect(launchCheck(ENV, DATA)).toEqual([])
})
it('names every reason it is not ready', () => {
  const reasons = launchCheck(
    { ...ENV, VITE_CONTROLLER_NAME: '', VITE_CONTACT_EMAIL: '', ADMIN_USERS: JSON.stringify([{ name: 'a', hash: 'h' }]), ENVELOPE_PRIVATE_JWK: '', SESSION_SECRET: '', DATABASE_URL: '', CRON_SECRET: '' },
    { carePoints: [point(true), { ...point(false), id: 'q' }], clinical: [{ id: 'advice.x', status: 'draft' }] },
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
