import { readdirSync, readFileSync, statSync } from 'node:fs'
import { expect, it } from 'vitest'
import { pointInRings } from '../../scripts/map/geometry.ts'
import { CARE_POINTS, ZONE_IDS } from '../store/seed'
import zones from './data/zones.json'
import type { CityData, LabelKind, Manifest, TileData } from './types'

// Paths are from the project root: under Vitest's jsdom environment import.meta.url is not a file URL.
const dir = 'public/map/'
const read = <T,>(file: string): T => JSON.parse(readFileSync(dir + file, 'utf8'))
const manifest = read<Manifest>('index.json')
const city = read<CityData>(manifest.city)
const xy = (lat: number, lon: number): [number, number] => [(lon - manifest.origin.lon) * manifest.origin.kx, (manifest.origin.lat - lat) * manifest.origin.ky]
const inBox = ([x, y]: [number, number], [x0, y0, x1, y1]: number[]) => x >= x0 && x <= x1 && y >= y0 && y <= y1
const ALLOWED: LabelKind[] = ['road', 'soi', 'station', 'district', 'town', 'park', 'water', 'civic', 'worship']

it('stays under 12 MB in total', () => {
  const size = (d: string): number => readdirSync(d, { withFileTypes: true }).reduce((sum, e) => sum + (e.isDirectory() ? size(`${d}${e.name}/`) : statSync(d + e.name).size), 0)
  expect(size(dir)).toBeLessThanOrEqual(12 * 1024 * 1024)
})
it('carries the credit line and lists only files that exist', () => {
  expect(manifest.credit).toBe('© ผู้ร่วมสร้าง OpenStreetMap · OpenMapTiles')
  expect(manifest.district).toHaveLength(6)
  expect(manifest.street).toHaveLength(3)
  for (const ref of [...manifest.district, ...manifest.street]) expect(statSync(dir + ref.file).size).toBeGreaterThan(1000)
})
it('has six zones made of all fifty districts', () => {
  expect(zones.map((z) => z.id).sort()).toEqual([...ZONE_IDS].sort())
  expect(zones.map((z) => z.name).sort()).toEqual(['กรุงธนเหนือ', 'กรุงธนใต้', 'กรุงเทพกลาง', 'กรุงเทพตะวันออก', 'กรุงเทพเหนือ', 'กรุงเทพใต้'].sort())
  expect(city.districts).toHaveLength(50)
})
it('labels only streets, lanes, stations, parks, water, districts, towns, public offices and places of worship', () => {
  const tiles = [...manifest.district, ...manifest.street].map((ref) => read<TileData>(ref.file))
  const kinds = new Set([...city.labels, ...tiles.flatMap((t) => t.labels)].map((l) => l.k))
  expect([...kinds].filter((k) => !ALLOWED.includes(k))).toEqual([])
  expect(kinds.has('road') && kinds.has('station') && kinds.has('district')).toBe(true)
})
it('has street-level and district-level map round the four care points of the pitch', () => {
  const at = (id: string) => {
    const p = CARE_POINTS.find((c) => c.id === id)!
    return xy(p.lat, p.lon)
  }
  for (const id of ['cp1', 'cp2', 'cp4', 'cp5']) expect(manifest.street.some((ref) => inBox(at(id), ref.box)), id).toBe(true)
  for (const id of ['cp1', 'cp2', 'cp4', 'cp5']) expect(manifest.district.some((ref) => inBox(at(id), ref.box)), id).toBe(true)
})
it('adds no map library: the app still runs on the same six packages', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  expect(Object.keys(pkg.dependencies).sort()).toEqual(['@fontsource-variable/anuphan', 'lucide-react', 'qrcode.react', 'react', 'react-dom', 'react-router-dom'])
})
it('keeps every example care point inside its zone and at least 60 m from a real clinic or hospital', () => {
  for (const p of CARE_POINTS) {
    expect(p.name.endsWith('ตัวอย่าง'), p.id).toBe(true)
    expect(pointInRings(xy(p.lat, p.lon), zones.find((z) => z.id === p.zoneId)!.rings), `${p.id} in ${p.zoneId}`).toBe(true)
    expect(manifest.clearance[p.id], p.id).toBeGreaterThanOrEqual(60)
  }
})
it('writes no name of a hospital, clinic, hotel or venue on the base map', () => {
  const tiles = [...manifest.district, ...manifest.street].map((ref) => read<TileData>(ref.file))
  const names = [...city.labels, ...tiles.flatMap((t) => t.labels)].map((l) => l.t)
  expect(names.length).toBeGreaterThan(100)
  expect(names.filter((name) => /โรงพยาบาล|รพ\.|คลินิก|โรงแรม|พยาธิ|hospital|clinic|hotel|สโลว์คอมโบ/i.test(name))).toEqual([])
})
