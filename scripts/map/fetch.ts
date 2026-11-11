// Downloads what the map is baked from, into scripts/map/.cache (not committed):
// vector tiles of OpenStreetMap data in the OpenMapTiles layout, served by OpenFreeMap, and the
// outlines of Bangkok's districts from the Overpass API. Run: npm run map:fetch
import { existsSync } from 'node:fs'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { CARE_POINTS } from '../../src/store/seed.ts'
import { idOf, SETS, tileAt, type TileId } from './sets.ts'

const CACHE = new URL('./.cache/', import.meta.url)
/** Downloads kept from the design mock. Used when present, so a slow server does not block the build. */
const MOCK = new URL('../../../.oil-ui/warm-real-map/osm/', import.meta.url)
const headers = { 'User-Agent': 'map-tile-script/1.0' }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

await mkdir(new URL('tiles/', CACHE), { recursive: true })

// The tile under each care point is needed once, to measure how far the point is from a real clinic.
const wanted = new Map<string, TileId>()
for (const tile of [...Object.values(SETS).flat(), ...CARE_POINTS.map((p) => tileAt(14, p.lat, p.lon))]) wanted.set(idOf(tile), tile)

const info = (await (await fetch('https://tiles.openfreemap.org/planet', { headers })).json()) as { tiles: string[] }
const template = info.tiles[0]
const stamp = template.match(/\/(\d{4})(\d{2})(\d{2})_/)
await writeFile(new URL('source.json', CACHE), JSON.stringify({ template, date: stamp ? `${stamp[1]}-${stamp[2]}-${stamp[3]}` : 'unknown' }))

let fetched = 0
let copied = 0
for (const [id, [z, x, y]] of wanted) {
  const file = new URL(`tiles/${id}.pbf`, CACHE)
  if (existsSync(file)) continue
  const kept = new URL(`tiles/${id}.pbf`, MOCK)
  if (existsSync(kept)) {
    await copyFile(kept, file)
    copied++
    continue
  }
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y)), { headers, signal: AbortSignal.timeout(60000) })
      if (!res.ok) throw new Error(String(res.status))
      await writeFile(file, Buffer.from(await res.arrayBuffer()))
      fetched++
      break
    } catch (e) {
      if (attempt === 3) throw new Error(`tile ${id}: ${String(e)}`)
      await sleep(1500 * (attempt + 1))
    }
  }
}
console.log(`tiles wanted ${wanted.size} | downloaded ${fetched} | taken from the mock ${copied}`)

const districts = new URL('districts.json', CACHE)
if (!existsSync(districts)) {
  const kept = new URL('r_khet.json', MOCK)
  if (existsSync(kept)) {
    await copyFile(kept, districts)
    console.log('district outlines taken from the mock')
  } else {
    const query = '[out:json][timeout:240];relation["boundary"="administrative"]["admin_level"="6"](13.46,100.30,13.98,100.96);out geom qt;'
    const hosts = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
    let saved = false
    for (let attempt = 0; attempt < 6 && !saved; attempt++) {
      try {
        const res = await fetch(hosts[attempt % hosts.length], {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(280000),
        })
        const text = await res.text()
        if (!res.ok || !text.trimStart().startsWith('{')) throw new Error(`${res.status}`)
        JSON.parse(text)
        await writeFile(districts, text)
        saved = true
      } catch (e) {
        console.log('district outlines: retry', String(e).slice(0, 80))
        await sleep(8000 + attempt * 6000)
      }
    }
    if (!saved) throw new Error('district outlines: every Overpass server failed; try again later')
    console.log('district outlines downloaded')
  }
}
console.log('done')
