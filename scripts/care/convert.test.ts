// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import type { CarePointData } from '../../src/data/carePoints'
import { launchCheck, type LaunchData } from '../launchCheck'
import { applyOverrides, cleanEmail, cleanLine, cleanUrl, firstPhone, healthCentresFrom, hospitalKey, hospitalsFrom, parseCsv, pharmaciesFrom, type OverpassElement } from './convert'

// Public lists become our own files once, at build time (redesign spec 5.8). Every point they give
// is "not yet confirmed": it carries where it came from and the day it was copied.

/** A registry point as the converters see it: only the name matters to them. */
const registered = (name: string): CarePointData => ({ id: name, name, kind: 'clinic', layer: 'sti', klass: 'A', lat: 13.7, lon: 100.5, address: 'ที่อยู่', free: true, community: false, source: 'https://example.org', fetched: '2026-11-12', verified: null })

it('reads a quoted CSV with commas and new lines inside fields, and a byte-order mark', () => {
  expect(parseCsv('﻿a,b,c\r\n1,"x, y","line\none"\n2,"say ""hi""",\n\n')).toEqual([
    { a: '1', b: 'x, y', c: 'line\none' },
    { a: '2', b: 'say "hi"', c: '' },
  ])
})
it('keeps an unnamed pharmacy as ร้านยา, and only the first phone number', () => {
  const [p] = pharmaciesFrom([{ type: 'node', id: 1, lat: 13.75, lon: 100.5, tags: { amenity: 'pharmacy', phone: '02 111 2222;081 000 0000' } }], '2026-11-17', () => true)
  expect(p).toMatchObject({ id: 'osm-node-1', name: 'ร้านยา', layer: 'pharmacy', kind: 'pharmacy', klass: 'B', phone: '021112222', free: false, community: false, verified: null, source: 'https://www.openstreetmap.org/node/1', fetched: '2026-11-17' })
})
it('takes a way’s centre, drops a same-name pharmacy within 25 m, and drops points outside Bangkok', () => {
  const elements: OverpassElement[] = [
    { type: 'way', id: 7, center: { lat: 13.75, lon: 100.5 }, tags: { amenity: 'pharmacy', name: 'ร้านยาเอ', 'addr:housenumber': '12', 'addr:street': 'ถนนตัวอย่าง' } },
    { type: 'node', id: 8, lat: 13.75005, lon: 100.50005, tags: { amenity: 'pharmacy', name: 'ร้านยาเอ' } },
    { type: 'node', id: 9, lat: 13.75005, lon: 100.50005, tags: { amenity: 'pharmacy', name: 'ร้านยาบี' } },
    { type: 'node', id: 10, lat: 13.76, lon: 100.5, tags: { amenity: 'pharmacy', 'name:en': 'Pharmacy A' } },
    { type: 'node', id: 11, lat: 14.5, lon: 100.5, tags: { amenity: 'pharmacy', name: 'ร้านยาซี' } },
  ]
  const list = pharmaciesFrom(elements, '2026-11-17', (lat) => lat < 14)
  expect(list.map((p) => p.id)).toEqual(['osm-way-7', 'osm-node-9', 'osm-node-10'])
  expect(list[0]).toMatchObject({ lat: 13.75, lon: 100.5, address: '12 ถนนตัวอย่าง', source: 'https://www.openstreetmap.org/way/7' })
  expect(list[0].phone).toBeUndefined()
  expect(list[2].name).toBe('Pharmacy A')
})
it('turns the BMA health-centre list into unverified points, skipping a centre number the registry has', () => {
  const csv = [
    'HCCode,HCName,Address,Latitude,longitude,ContactNumber',
    '13668,ศูนย์บริการสาธารณสุข 23 สี่พระยา,ที่อยู่ 23,13.73,100.52,022336329',
    '13646,ศูนย์บริการสาธารณสุข 1 สะพานมอญ,"ที่อยู่ 1, ถนนตัวอย่าง",13.745,100.497,022265897 022227874',
    '13700,ศูนย์บริการสาธารณสุข 99 ไม่มีพิกัด,ที่อยู่ 99,,,',
  ].join('\n')
  const list = healthCentresFrom(csv, '2026-11-17', [registered('ศูนย์บริการสาธารณสุข 23 สี่พระยา (คลินิกรักปลอดภัย)')])
  expect(list).toHaveLength(1)
  expect(list[0]).toEqual({
    id: 'bma-phc-13646', name: 'ศูนย์บริการสาธารณสุข 1 สะพานมอญ', kind: 'clinic', layer: 'health_centre', klass: 'A', lat: 13.745, lon: 100.497,
    address: 'ที่อยู่ 1, ถนนตัวอย่าง', phone: '022265897', free: false, community: false,
    source: 'https://data.bangkok.go.th/dataset/phc_2025', fetched: '2026-11-17', verified: null,
  })
})
it('turns the BMA hospital list into unverified points, skipping one the registry already has under a slightly different spelling', () => {
  const csv = ['id_hos,name,address,tel,lat,lng', '6,โรงพยาบาลหลวงพ่อทวีศักด์ ชุตินธโร อุทิศ,ที่อยู่ 6,0 2429 3575-81,13.70,100.40', '11,โรงพยาบาลบางนา,ที่อยู่ 11,02 746 8630,13.66,100.63'].join('\n')
  const list = hospitalsFrom(csv, '2026-11-17', [registered('คลินิกรักษ์เพื่อน โรงพยาบาลหลวงพ่อทวีศักดิ์ ชุตินฺธโร อุทิศ')])
  expect(list.map((p) => p.id)).toEqual(['bma-hos-11'])
  expect(list[0]).toMatchObject({ name: 'โรงพยาบาลบางนา', kind: 'hospital', layer: 'hospital', klass: 'A', lat: 13.66, lon: 100.63, address: 'ที่อยู่ 11', phone: '027468630', source: 'https://data.bangkok.go.th/dataset/bmahospital', verified: null })
})
it('keys hospital names so spelling marks do not matter', () => {
  expect(hospitalKey('โรงพยาบาลเวชการุณรัศมิ์')).toBe(hospitalKey('คลินิกรักษ์เพื่อน โรงพยาบาลเวชการุณย์รัศมิ์'))
  expect(hospitalKey('โรงพยาบาลบางนา')).not.toBe(hospitalKey('โรงพยาบาลกลาง'))
  expect(hospitalKey('คลินิกนิรนาม')).toBe('')
})
it('keeps only the first phone number, as digits', () => {
  expect(['022265897 022227874', '0 2289 7000-3', '022112353 ext 101', '+66 81 234 5678', '02-123-4567', '1330', ''].map(firstPhone))
    .toEqual(['022265897', '022897000', '022112353', '0812345678', '021234567', undefined, undefined])
  expect(firstPhone(undefined)).toBeUndefined()
  expect(firstPhone('+66 (0) 2731 6532 (ext. 102 for the clinic)')).toBe('027316532')
})
it('writes only points the launch check accepts', () => {
  const read = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as LaunchData['carePoints']
  const points = ['src/data/bma-health-centres.json', 'src/data/bma-hospitals.json', 'public/care/pharmacies.json'].flatMap(read)
  expect(points.length).toBeGreaterThan(300)
  expect(launchCheck({}, { carePoints: points, clinical: [] }).filter((r) => r.includes('care point'))).toEqual([])
})

// ---- contacts (2026-11-18 design, decision 1) -------------------------------------------------------
it('cleans the contact links the lists give, and drops what is not one', () => {
  expect(cleanUrl('https://www.facebook.com/p/ศูนย์-3-61560131507957/?_rdr')).toBe('https://www.facebook.com/p/ศูนย์-3-61560131507957/')
  // A query that names the page stays; only tracking goes (final review, Important 1).
  expect(cleanUrl('https://www.facebook.com/profile.php?id=100064218376021&ref=embed_page&mibextid=ZbWKwL&fbclid=x&locale=th_TH')).toBe('https://www.facebook.com/profile.php?id=100064218376021')
  expect(cleanUrl('https://example.go.th/page?utm_source=fb&lang=th#top')).toBe('https://example.go.th/page?lang=th')
  expect(cleanUrl('www.lkbhosp.go.th/')).toBe('https://www.lkbhosp.go.th/')
  expect(cleanUrl('http://www.klanghospital.go.th/')).toBe('http://www.klanghospital.go.th/')
  for (const bad of ['-', 'ไม่มี', '', 'javascript:alert(1)', undefined]) expect(cleanUrl(bad), String(bad)).toBeUndefined()
  expect(cleanEmail(' saraban.hd.phc1@bangkok.go.th ')).toBe('saraban.hd.phc1@bangkok.go.th')
  expect(cleanEmail('-')).toBeUndefined()
  expect(cleanLine('@swingthailand')).toBe('@swingthailand')
  expect(cleanLine('https://line.me/R/ti/p/@swing')).toBe('https://line.me/R/ti/p/@swing')
  expect(cleanLine('call us')).toBeUndefined()
})
it('copies the email, website and Facebook page of each BMA health centre, and the website of each hospital', () => {
  const csv = ['HCCode,HCName,Address,Latitude,longitude,ContactNumber,EmailAddress,Website,FBChanel', '13646,ศูนย์บริการสาธารณสุข 1 สะพานมอญ,ที่อยู่,13.745,100.497,022265897,saraban.hd.phc1@bangkok.go.th,https://webportal.bangkok.go.th/healthcenter1,https://www.facebook.com/healthcenter1?ref=x'].join('\n')
  expect(healthCentresFrom(csv, '2026-11-18', [])[0]).toMatchObject({ email: 'saraban.hd.phc1@bangkok.go.th', website: 'https://webportal.bangkok.go.th/healthcenter1', facebook: 'https://www.facebook.com/healthcenter1' })
  const hos = ['id_hos,name,address,tel,www,lat,lng', '11,โรงพยาบาลบางนา,ที่อยู่,02 746 8630,www.bangnahospital.go.th/,13.66,100.63'].join('\n')
  expect(hospitalsFrom(hos, '2026-11-18', [])[0]).toMatchObject({ website: 'https://www.bangnahospital.go.th/' })
})
it('copies a pharmacy’s website, email, Facebook and LINE from its OpenStreetMap tags', () => {
  const [p] = pharmaciesFrom([{ type: 'node', id: 5, lat: 13.75, lon: 100.5, tags: { amenity: 'pharmacy', name: 'ร้านยาเอ', 'contact:website': 'shop.example.co.th', email: 'a@shop.co.th', 'contact:facebook': 'https://facebook.com/shop', 'contact:line': '@shopa' } }], '2026-11-18', () => true)
  expect(p).toMatchObject({ website: 'https://shop.example.co.th/', email: 'a@shop.co.th', facebook: 'https://facebook.com/shop', line: '@shopa' })
})
// Numbers found by searching, kept in scripts/care/found-phones.json so a new fetch does not lose them (owner, 18 Nov 2026).
// Hours from OpenStreetMap, read only in the forms parseOsmHours knows (2026-11-18 design, decision 3).
it('keeps a pharmacy\'s hours only when its tag can be read, with its page', () => {
  const [known, unknown] = pharmaciesFrom(
    [
      { type: 'node', id: 7, lat: 13.75, lon: 100.5, tags: { amenity: 'pharmacy', name: 'ก', opening_hours: 'Mo-Fr 08:00-20:00' } },
      { type: 'node', id: 8, lat: 13.76, lon: 100.51, tags: { amenity: 'pharmacy', name: 'ข', opening_hours: 'sunrise-sunset' } },
    ],
    '2026-11-18',
    () => true,
  )
  expect(known).toMatchObject({ open: [{ days: [1, 2, 3, 4, 5], from: '08:00', to: '20:00' }], openSource: 'https://www.openstreetmap.org/node/7', openKind: 'office' })
  expect(unknown.open).toBeUndefined()
  expect(unknown.openSource).toBeUndefined()
})
// One overrides file for the team's fixes and the pages found by searching (2026-11-18 design, decision 4).
it('applies an override over the source: a confirmed number replaces a wrong one, a closed place is dropped, a moved one moves', () => {
  const base = { kind: 'pharmacy', layer: 'pharmacy', klass: 'B', lat: 13.7, lon: 100.5, address: '', free: false, community: false, source: 'https://www.openstreetmap.org/node/1', fetched: '2026-11-18', verified: null } as const
  const points = [
    { ...base, id: 'a', name: 'ก', phone: '021111111', phoneSource: 'https://example.org/old' },
    { ...base, id: 'b', name: 'ข' },
    { ...base, id: 'c', name: 'ค' },
    { ...base, id: 'd', name: 'ง' },
  ]
  const out = applyOverrides(points, {
    a: { phone: '029999999', phoneConfirmed: { date: '2026-11-20', by: 'ทีม' } },
    b: { closed: true },
    c: { lat: 13.8, lon: 100.6, open: [{ days: [1], from: '08:00', to: '12:00' }], openSource: 'https://example.go.th/hours', openKind: 'service' },
    d: { phone: '026316407', phoneSource: 'https://www.wongnai.com/businesses/x' },
    z: { phone: '020000000', phoneSource: 'https://example.org/z' },
  })
  expect(out.map((p) => p.id)).toEqual(['a', 'c', 'd'])
  expect(out[0]).toMatchObject({ phone: '029999999', phoneConfirmed: { date: '2026-11-20', by: 'ทีม' } })
  expect(out[0].phoneSource).toBeUndefined()
  expect(out[1]).toMatchObject({ lat: 13.8, lon: 100.6, openSource: 'https://example.go.th/hours', openKind: 'service' })
  expect(out[2]).toMatchObject({ phone: '026316407', phoneSource: 'https://www.wongnai.com/businesses/x' })
})
