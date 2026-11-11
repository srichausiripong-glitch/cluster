// What the base map may show. Anything not listed here is left out, so a new kind of place stays
// hidden until someone allows it (plan amendment 15.4: no shops, hotels, venues, clinics or hospitals).
import type { LabelKind, RoadClass } from '../../src/map/types.ts'

type Props = Record<string, unknown>

const ROAD: Record<string, RoadClass> = { motorway: 'hw', trunk: 'hw', primary: 'pri', secondary: 'sec', tertiary: 'ter', minor: 'res', service: 'srv', busway: 'srv', path: 'foot' }
const NAMED_ROADS = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor'])
const STATIONS = new Set(['station', 'subway', 'halt'])

export function roadClass(props: Props): RoadClass | null {
  if (props.class === 'path' && props.subclass === 'platform') return null
  return ROAD[String(props.class)] ?? null
}

/**
 * A name is checked as well as its kind: a rail halt, a lane or an office can be named after a
 * hospital or a hotel, and that name must not sit on a map that shows health signals.
 */
const NAMED_AFTER = /โรงพยาบาล|รพ\.|คลินิก|โรงแรม|พยาธิ|อนามัย|สถานพยาบาล|ผับ|บาร์|ซาวน่า|นวด|สปา|hospital|clinic|hotel|sauna|massage|\bbar\b|\bpub\b|\bspa\b|\bclub\b/i
/** A public office is kept only when its name says it is one. The tiles file many other places under the same class. */
const OFFICE = /^(สำนักงาน|ที่ว่าการ|ศาลา|ศาล|กระทรวง|กรม|เทศบาล|สถานี)/

export function labelKind(layer: string, props: Props): LabelKind | null {
  const kind = kindOf(layer, props)
  const name = String(props.name ?? '')
  if (!kind || NAMED_AFTER.test(name)) return null
  if (kind === 'civic' && !OFFICE.test(name)) return null
  return kind
}
function kindOf(layer: string, props: Props): LabelKind | null {
  const cls = String(props.class ?? '')
  const sub = String(props.subclass ?? '')
  if (layer === 'transportation_name') {
    if (sub === 'junction' || !NAMED_ROADS.has(cls)) return null
    return cls === 'minor' && String(props.name ?? '').startsWith('ซอย') ? 'soi' : 'road'
  }
  if (layer === 'poi') {
    if (cls === 'railway') return STATIONS.has(sub) ? 'station' : null
    if (cls === 'town_hall') return 'civic'
    if (cls === 'place_of_worship') return 'worship'
    if (cls === 'park') return 'park'
    return null
  }
  if (layer === 'place') {
    if (cls === 'suburb' || cls === 'quarter') return 'district'
    if (cls === 'city' || cls === 'town') return 'town'
    return null
  }
  if (layer === 'waterway') return cls === 'river' || cls === 'canal' ? 'water' : null
  return null
}
