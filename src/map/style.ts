// Every size, dash and colour the map's canvas draws. The legend reads the same values, so a
// sample in the legend is exactly the mark on the map.
import type { DensityBand } from '../domain/types'
import type { RoadClass } from './types'

/** Distance between neighbouring signal dots, in screen pixels. */
export const DOT_GAP = 9
/** A level is the size of the dot, never a colour (plan amendment 15.2). */
export const DOT_R: Record<DensityBand, number> = { thin: 1.2, medium: 2.1, dense: 3.1 }
/** Length of a legend line sample, in pixels. */
export const SAMPLE_PX = 60
/** The age of a signal is carried by its edge. Widths and dashes are screen pixels. */
export const EDGE: Record<'new' | 'followup' | 'expiring' | 'mixed', { width: number; dash?: number[]; cap?: 'round' }> = {
  new: { width: 3.5 },
  followup: { width: 3, dash: [10, 6] },
  expiring: { width: 3, dash: [0.1, 7], cap: 'round' },
  mixed: { width: 3, dash: [8, 4, 0.1, 4], cap: 'round' },
}
/** How an area without a signal is marked. All three are quieter than any signal. */
export const QUIET = { below_threshold: 'hatch', no_data: 'none', no_partner: 'grid' } as const
/**
 * The slanted lines of an area below the threshold: how far apart along the ground, how wide, and
 * how opaque, in screen pixels. A test keeps them lighter on the ground than the smallest dots.
 */
export const HATCH = { gap: 12, width: 1, alpha: 0.5 } as const
/** Per level, low class to high: class, casing width, fill width, casing opacity. Widths in screen pixels. */
export const ROADS: Record<'district' | 'street', [RoadClass, number, number, number][]> = {
  district: [
    ['res', 2.3, 1.4, 0.38],
    ['ter', 3.7, 2.3, 0.75],
    ['sec', 4.8, 3.1, 1],
    ['pri', 6, 4.2, 1],
    ['hw', 6.8, 4.6, 1],
  ],
  street: [
    ['srv', 5.4, 3.6, 0.7],
    ['res', 10, 7.6, 1],
    ['ter', 13, 10.4, 1],
    ['sec', 16, 13.2, 1],
    ['pri', 20, 17, 1],
    ['hw', 18, 14.6, 1],
  ],
}

/**
 * How much a dot grows and shrinks: 1 when still, else one slow cycle of about 3.3 seconds.
 * It takes no signal level: a stronger signal never moves faster or further (plan amendment 15.5).
 */
export function breath(timeMs: number, still: boolean): number {
  return still ? 1 : 1 + 0.13 * Math.sin(timeMs / 520)
}

export interface Palette {
  ink: string
  surface: string
  care: string
  yellow: string
  signal: string
  signalEdge: string
  signalSoft: string
  land: string
  landOut: string
  water: string
  park: string
}
/** The token values again, because a canvas cannot read a CSS class. A test keeps the two in step. */
export const PALETTE: Palette = {
  ink: '#1e1f1c',
  surface: '#ffffff',
  care: '#fd62ab',
  yellow: '#fee23c',
  signal: '#6c3bf4',
  signalEdge: '#4a1fd0',
  signalSoft: '#9a80f2',
  land: '#fff0a6',
  landOut: '#f6f0dc',
  water: '#46d3e6',
  park: '#c6f1ba',
}
