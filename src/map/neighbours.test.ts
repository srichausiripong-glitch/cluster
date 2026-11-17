import { expect, it } from 'vitest'
import { DISTRICT_IDS } from '../domain/districts'
import { NEIGHBOURS } from './areas'

// "Near" is the same district or one next to it: the app never asks where the phone is (redesign spec 5.7).
it('names every district’s neighbours, both ways, and none twice', () => {
  expect(Object.keys(NEIGHBOURS).sort()).toEqual([...DISTRICT_IDS].sort())
  for (const [id, list] of Object.entries(NEIGHBOURS)) {
    expect(list.length, id).toBeGreaterThanOrEqual(2)
    expect(new Set(list).size, id).toBe(list.length)
    expect(list, id).not.toContain(id)
    for (const n of list) expect(NEIGHBOURS[n], `${id}↔${n}`).toContain(id)
  }
})
it('knows Bang Rak touches Pathum Wan, Samphanthawong and Sathon, and Nong Chok only its three', () => {
  expect(NEIGHBOURS.bang_rak).toEqual(expect.arrayContaining(['pathum_wan', 'samphanthawong', 'sathon']))
  expect(NEIGHBOURS.nong_chok).toEqual(['khlong_sam_wa', 'lat_krabang', 'min_buri'])
  expect(NEIGHBOURS.nong_chok).not.toContain('bang_rak')
})
