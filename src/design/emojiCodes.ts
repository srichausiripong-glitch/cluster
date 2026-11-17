import type { MapLayer } from '../domain/types'

/**
 * The emoji the app shows, by name, with the OpenMoji file each is drawn from (decision 1 of the
 * round 2 plan). Every emoji is a picture bundled with the app, so every phone shows the same one.
 * No JSX here: scripts/emoji/fetch.ts reads this list to download the files.
 */
export const CODES = {
  check: '2705', stethoscope: '1FA7A', pin: '1F4CD', confirmed: '1F7E3', feverish: '1F912', testTube: '1F9EA',
  hospital: '1F3E5', pill: '1F48A', map: '1F5FA', clipboard: '1F4CB', smile: '1F642', sos: '1F198',
  envelope: '1F4E8', petri: '1F9EB', blood: '1FA78', ribbon: '1F397', blueCircle: '1F535', house: '1F3E0',
  speech: '1F4AC', alarm: '23F0', pushpin: '1F4CC', pause: '23F8', search: '1F50E', lock: '1F512', phone: '1F4DE',
} as const

export type EmojiName = keyof typeof CODES

/** The emoji of each layer of the map, on its switch and on its marks (redesign spec 5.8). */
export const LAYER_EMOJI: Record<MapLayer, EmojiName> = { confirmed: 'confirmed', symptoms: 'feverish', sti: 'testTube', health_centre: 'stethoscope', hospital: 'hospital', pharmacy: 'pill' }

export const EMOJI_NAMES = Object.keys(CODES) as EmojiName[]
