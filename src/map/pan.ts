export const MAP_W = 1000
export const MAP_H = 1100
/** Bounding box of the city outline with its stroke, in map units. */
export const CITY_BOX = { x: 82, y: 85, w: 852, h: 888 }
/** Space the map screen's own controls take: chips at the top; the care point card and half the send button at the bottom. */
export const MAP_INSET = { top: 108, right: 10, bottom: 116, left: 10 }
/** Pins and zone names keep one size on screen whatever the map's scale. */
export const LABEL_PX = 12
export const PIN_PX = 13
export const HIT_PX = 22

/**
 * On a very small map (the stage's phone frame in a short window) pins and names shrink a
 * little so they do not crowd each other. At phone sizes they keep their full size.
 */
export function markScale(scale: number): number {
  return Math.max(0.72, Math.min(1, scale / 0.36))
}

export interface Inset {
  top: number
  right: number
  bottom: number
  left: number
}
export interface Fit {
  scale: number
  width: number
  height: number
  x: number
  y: number
}

const NONE: Inset = { top: 0, right: 0, bottom: 0, left: 0 }

/** Scale the map so the whole city sits inside the free window, centred there. */
export function fitMap(containerW: number, containerH: number, inset: Inset = NONE): Fit {
  const freeW = Math.max(1, containerW - inset.left - inset.right)
  const freeH = Math.max(1, containerH - inset.top - inset.bottom)
  const scale = Math.min(freeW / CITY_BOX.w, freeH / CITY_BOX.h)
  return {
    scale,
    width: MAP_W * scale,
    height: MAP_H * scale,
    x: inset.left + (freeW - CITY_BOX.w * scale) / 2 - CITY_BOX.x * scale,
    y: inset.top + (freeH - CITY_BOX.h * scale) / 2 - CITY_BOX.y * scale,
  }
}

/** The map can be dragged a little, to look behind a control, but never away. */
export function clampPan(fit: Fit, containerW: number, containerH: number, x: number, y: number): { x: number; y: number } {
  const slackX = containerW * 0.35
  const slackY = containerH * 0.35
  return {
    x: Math.min(fit.x + slackX, Math.max(fit.x - slackX, x)),
    y: Math.min(fit.y + slackY, Math.max(fit.y - slackY, y)),
  }
}
