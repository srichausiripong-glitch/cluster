import type { CityData, Manifest, TileData, TileRef } from './types'

/** Where the map files come from. The app reads its own files; tests put a stand-in here. */
export interface MapSource {
  manifest(): Promise<Manifest>
  city(): Promise<CityData>
  tile(ref: TileRef): Promise<TileData>
}

/** Reads the baked files under `map/` on the app's own origin, once per file. No other site is ever asked. */
export function fetchSource(): MapSource {
  const base = `${import.meta.env.BASE_URL}map/`
  const cache = new Map<string, Promise<unknown>>()
  const get = <T,>(file: string): Promise<T> => {
    if (!cache.has(file)) {
      cache.set(
        file,
        fetch(base + file)
          .then((res) => {
            if (!res.ok) throw new Error(`${file}: ${res.status}`)
            return res.json()
          })
          .catch((error) => {
            // A failed read is not remembered, so the next try can succeed.
            cache.delete(file)
            throw error
          }),
      )
    }
    return cache.get(file) as Promise<T>
  }
  const manifest = () =>
    get<Manifest>('index.json').then((m) => {
      if (!m || typeof m.city !== 'string' || !Array.isArray(m.district) || !Array.isArray(m.street)) throw new Error('index.json: not a map manifest')
      return m
    })
  return { manifest, city: () => manifest().then((m) => get<CityData>(m.city)), tile: (ref) => get<TileData>(ref.file) }
}

let current: MapSource = fetchSource()
export function setMapSource(source: MapSource): void {
  current = source
}
export function mapSource(): MapSource {
  return current
}
