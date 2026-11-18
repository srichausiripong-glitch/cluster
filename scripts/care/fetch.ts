// Copies public lists of care points into our own files, once, at build time (redesign spec 5.8):
// the BMA's health centres and hospitals, bundled with the app, and OpenStreetMap's pharmacies, a
// file on our own server that the app reads only when 💊 is on. One file per layer. The requests
// carry a plain program name and nothing about the project or anyone who uses it.
//   npm run care:fetch
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { CarePointData } from '../../src/data/carePoints.ts'
import { inRings, toXY } from '../../src/map/geo.ts'
import { addFoundPhones, healthCentresFrom, hospitalsFrom, pharmaciesFrom, type FoundPhones, type OverpassElement } from './convert.ts'

const headers = { 'User-Agent': 'care-data-script/1.0' }
const PHC_CSV = 'https://data.bangkok.go.th/dataset/b5974a39-b3c6-4448-aa27-01beb681498a/resource/1d79c024-92b8-4dcc-8f0a-ed6cd7ff96a0/download/hdplacemay1469.csv'
const HOS_CSV = 'https://data.bangkok.go.th/dataset/d395ff02-39e4-40d2-8579-5c53a7514128/resource/eb548cdb-1a9a-4347-b85c-71902546c91c/download/bma_hos.csv'
const QUERY = '[out:json][timeout:180];area["ISO3166-2"="TH-10"]->.b;nwr["amenity"="pharmacy"](area.b);out center tags;'
const HOSTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
const at = (path: string) => new URL(path, import.meta.url)
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms))

/** The day in Bangkok, as YYYY-MM-DD: the day the data was copied. */
const fetched = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })

async function text(url: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(60000) })
      if (!res.ok) throw new Error(`${res.status}`)
      return await res.text()
    } catch (e) {
      if (attempt >= 3) throw new Error(`${url}: ${String(e)}`)
      await sleep(4000 * attempt)
    }
  }
}

async function pharmacyElements(): Promise<OverpassElement[]> {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(HOSTS[attempt % HOSTS.length], { method: 'POST', headers, body: new URLSearchParams({ data: QUERY }), signal: AbortSignal.timeout(240000) })
      const body = await res.text()
      if (!res.ok || !body.trimStart().startsWith('{')) throw new Error(`${res.status}`)
      return (JSON.parse(body) as { elements: OverpassElement[] }).elements
    } catch (e) {
      console.log('pharmacies: retry', String(e).slice(0, 80))
      await sleep(8000 + attempt * 6000)
    }
  }
  throw new Error('pharmacies: every Overpass server failed; try again later')
}

const districts = JSON.parse(await readFile(at('../../src/map/data/districts.json'), 'utf8')) as { rings: number[][] }[]
const inBangkok = (lat: number, lon: number) => districts.some((d) => inRings(toXY(lat, lon), d.rings))
const registry = JSON.parse(await readFile(at('../../src/data/care-points.json'), 'utf8')) as CarePointData[]

async function write(path: string, label: string, all: CarePointData[]) {
  const list = all.filter((p) => inBangkok(p.lat, p.lon)).sort((a, b) => a.id.localeCompare(b.id))
  await writeFile(at(path), JSON.stringify(list, null, 2) + '\n')
  console.log(`${label}: ${list.length}${list.length < all.length ? ` (${all.length - list.length} outside the 50 districts left out)` : ''}`)
}

await write('../../src/data/bma-health-centres.json', 'health centres', healthCentresFrom(await text(PHC_CSV), fetched, registry))
await write('../../src/data/bma-hospitals.json', 'hospitals', hospitalsFrom(await text(HOS_CSV), fetched, registry))
await mkdir(at('../../public/care/'), { recursive: true })
/** Pharmacy numbers found by searching the web, each with its page: OpenStreetMap has a number for very few. */
const found = JSON.parse(await readFile(at('./found-phones.json'), 'utf8')) as FoundPhones
await write('../../public/care/pharmacies.json', 'pharmacies', addFoundPhones(pharmaciesFrom(await pharmacyElements(), fetched, inBangkok), found))
