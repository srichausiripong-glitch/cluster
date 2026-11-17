// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import type { CarePointData } from '../../src/data/carePoints'
import { launchCheck, type LaunchData } from '../launchCheck'
import { firstPhone, healthCentresFrom, hospitalKey, hospitalsFrom, parseCsv, pharmaciesFrom, type OverpassElement } from './convert'

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
})
it('writes only points the launch check accepts', () => {
  const read = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as LaunchData['carePoints']
  const points = ['src/data/bma-health-centres.json', 'src/data/bma-hospitals.json', 'public/care/pharmacies.json'].flatMap(read)
  expect(points.length).toBeGreaterThan(300)
  expect(launchCheck({}, { carePoints: points, clinical: [] }).filter((r) => r.includes('care point'))).toEqual([])
})
