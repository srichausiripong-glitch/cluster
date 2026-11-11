import { expect, it } from 'vitest'
import { labelKind, roadClass } from './classify.ts'

it.each([
  ['poi', { class: 'hospital', subclass: 'clinic' }, null],
  ['poi', { class: 'lodging', subclass: 'hotel' }, null],
  ['poi', { class: 'bar' }, null],
  ['poi', { class: 'shop', subclass: 'mall' }, null],
  ['poi', { class: 'restaurant' }, null],
  ['poi', { class: 'school' }, null],
  ['poi', { class: 'railway', subclass: 'subway' }, 'station'],
  ['poi', { class: 'railway', subclass: 'subway_entrance' }, null],
  ['poi', { class: 'town_hall' }, 'civic'],
  ['poi', { class: 'place_of_worship' }, 'worship'],
  ['poi', { class: 'park' }, 'park'],
  ['transportation_name', { class: 'primary', name: 'ถนนพญาไท' }, 'road'],
  ['transportation_name', { class: 'minor', name: 'ซอยราชวิถี 6' }, 'soi'],
  ['transportation_name', { class: 'motorway', subclass: 'junction' }, null],
  ['transportation_name', { class: 'service', name: 'x' }, null],
  ['place', { class: 'suburb' }, 'district'],
  ['place', { class: 'town' }, 'town'],
  ['place', { class: 'neighbourhood' }, null],
  ['waterway', { class: 'canal', name: 'คลองแสนแสบ' }, 'water'],
] as const)('labels %s %o as %s', (layer, props, kind) => expect(labelKind(layer, props)).toBe(kind))

it.each([
  [{ class: 'motorway' }, 'hw'],
  [{ class: 'trunk' }, 'hw'],
  [{ class: 'primary' }, 'pri'],
  [{ class: 'secondary' }, 'sec'],
  [{ class: 'tertiary' }, 'ter'],
  [{ class: 'minor' }, 'res'],
  [{ class: 'service' }, 'srv'],
  [{ class: 'path', subclass: 'footway' }, 'foot'],
  [{ class: 'path', subclass: 'platform' }, null],
  [{ class: 'primary_construction' }, null],
  [{ class: 'ferry' }, null],
] as const)('classes the road %o as %s', (props, kind) => expect(roadClass(props)).toBe(kind))
