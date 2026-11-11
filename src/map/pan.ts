export const MAP_W = 1000
export const MAP_H = 1100

export interface Fit {
  scale: number
  width: number
  height: number
  x: number
  y: number
}

/** Scale the map to cover the viewport, centred. The overflow is what the person can drag through. */
export function fitMap(containerW: number, containerH: number): Fit {
  const scale = Math.max(containerW / MAP_W, containerH / MAP_H)
  const width = MAP_W * scale
  const height = MAP_H * scale
  return { scale, width, height, x: (containerW - width) / 2, y: (containerH - height) / 2 }
}

export function clampPan(fit: Fit, containerW: number, containerH: number, x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(0, Math.max(containerW - fit.width, x)),
    y: Math.min(0, Math.max(containerH - fit.height, y)),
  }
}
