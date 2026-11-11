import { Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { th } from '../copy/th'
import type { AreaState, PublishedArea } from '../domain/types'
import type { CarePoint } from '../store/seed'
import { CITY_EDGES, pathOf, ZONES } from './areas'
import type { XY } from './geo'
import { ManyBody, PinBody } from './legend'
import { paintDots, paintGround, paintLines, type Scene } from './paint'
import { mapSource } from './source'
import { PALETTE } from './style'
import type { CityData, Manifest, TileData } from './types'
import { advances, cityView, fromScreen, MAP_INSET, markerBox, markers, nameBoxes, step, toScreen, viewAt, type Box, type Size, type View } from './view'

export interface RealMapProps {
  areas: PublishedArea[]
  /** The city's published state, for its spoken name, whatever layers are shown. */
  cityState: AreaState
  carePoints: CarePoint[]
  phase: 1 | 2
  showSignal: boolean
  selectedArea?: string | null
  selectedPoint?: string | null
  onSelectArea: (areaId: string) => void
  onSelectCarePoint: (id: string) => void
}

// The shapes of the button layer, in metres. They never change, so they are built once.
const CITY_PATH = pathOf(ZONES.flatMap((zone) => zone.rings))
const CITY_EDGE_PATH = pathOf(CITY_EDGES, false)
const ZONE_PATH = new Map(ZONES.map((zone) => [zone.id, pathOf(zone.rings)]))
const ZONE_EDGE_PATH = new Map(ZONES.map((zone) => [zone.id, pathOf(zone.edges, false)]))

const round = (n: number) => Math.round(n * 10) / 10
const press = (run: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    run()
  }
}

/**
 * The real map of Bangkok at three levels. Three canvases draw the ground, the signal dots and
 * the roads; the SVG layer above them holds what a person can act on, as real buttons: the city,
 * the zones and the care points.
 */
export function RealMap({ areas, cityState, carePoints, phase, showSignal, selectedArea, selectedPoint, onSelectArea, onSelectCarePoint }: RealMapProps) {
  const wrap = useRef<HTMLDivElement>(null)
  const ground = useRef<HTMLCanvasElement>(null)
  const dots = useRef<HTMLCanvasElement>(null)
  const lines = useRef<HTMLCanvasElement>(null)
  // Before the first measurement, lay out for a phone.
  const [box, setBox] = useState({ w: 390, h: 714 })
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [city, setCity] = useState<CityData | null>(null)
  const [tiles, setTiles] = useState<Record<string, TileData>>({})
  /** The view below city level; null is the city level, fitted to the screen. */
  const [deep, setDeep] = useState<View | null>(null)
  const [, setFontsReady] = useState(false)
  const asked = useRef(new Set<string>())
  const alive = useRef(true)

  const size = useMemo<Size>(() => ({ w: box.w, h: box.h, inset: MAP_INSET }), [box.w, box.h])
  const view = useMemo(() => deep ?? cityView(size), [deep, size])

  useEffect(() => {
    const el = wrap.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) setBox({ w: el.clientWidth, h: el.clientHeight })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    alive.current = true
    const source = mapSource()
    // A failed read leaves the map without its drawing; zones and care points still work.
    source.manifest().then(
      (m) => alive.current && setManifest(m),
      () => {},
    )
    source.city().then(
      (c) => alive.current && setCity(c),
      () => {},
    )
    // Names are drawn on the canvas, so it is drawn again once the Thai font has arrived.
    document.fonts?.ready.then(() => alive.current && setFontsReady(true))
    return () => {
      alive.current = false
    }
  }, [])

  // Below city level, read the map files that touch the screen.
  useEffect(() => {
    if (!manifest || view.level === 'city') return
    const [x0, y0] = fromScreen(view, size, [0, 0])
    const [x1, y1] = fromScreen(view, size, [size.w, size.h])
    for (const ref of manifest[view.level]) {
      if (asked.current.has(ref.file) || ref.box[2] < x0 || ref.box[0] > x1 || ref.box[3] < y0 || ref.box[1] > y1) continue
      asked.current.add(ref.file)
      mapSource()
        .tile(ref)
        .then(
          (tile) => alive.current && setTiles((old) => ({ ...old, [ref.file]: tile })),
          () => asked.current.delete(ref.file),
        )
    }
  }, [manifest, view, size])

  const marks = useMemo(() => markers(carePoints, view, size), [carePoints, view, size])
  const names = useMemo(() => (phase === 2 && view.level === 'city' ? nameBoxes(ZONES, view, size, marks) : []), [phase, view, size, marks])
  const byId = useMemo(() => new Map(areas.map((a) => [a.areaId, a])), [areas])

  // Draw after every render: the view, the data or the layers may have changed.
  useEffect(() => {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const level = view.level
    const scene: Scene = {
      view,
      size,
      dpr,
      palette: PALETTE,
      city,
      tiles: level === 'city' || !manifest ? [] : manifest[level].map((ref) => tiles[ref.file]).filter(Boolean),
      areas: byId,
      phase,
      showSignal,
      avoid: [...marks.map(markerBox), ...names.map((b): Box => [b.x - b.w / 2, b.y - b.h / 2, b.x + b.w / 2, b.y + b.h / 2])],
    }
    const layers: [HTMLCanvasElement | null, (ctx: CanvasRenderingContext2D) => void][] = [
      [ground.current, (ctx) => paintGround(ctx, scene)],
      [dots.current, (ctx) => paintDots(ctx, scene, null)],
      [lines.current, (ctx) => paintLines(ctx, scene)],
    ]
    for (const [canvas, paint] of layers) {
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) continue
      const w = Math.round(size.w * dpr)
      const h = Math.round(size.h * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      paint(ctx)
    }
  })

  /** One level in or out. Going in lands as near `focus` as the prototype has map for. */
  const go = async (by: 1 | -1, focus?: XY) => {
    const next = step(view.level, by)
    if (next === view.level) return
    if (next === 'city') {
      setDeep(null)
      return
    }
    try {
      const m = manifest ?? (await mapSource().manifest())
      setDeep(viewAt(m, size, next, focus ?? [view.cx, view.cy]))
    } catch {
      // Without the map files there is no deeper level to show; the city level still works.
    }
  }

  const [ox, oy] = toScreen(view, size, [0, 0])
  const picked = marks.find((m) => (m.kind === 'one' ? m.point.id === selectedPoint : m.points.some((p) => p.id === selectedPoint)))
  const pickedName = picked ? (picked.kind === 'one' ? picked.point.name : (picked.points.find((p) => p.id === selectedPoint)?.name ?? '')) : ''
  const bubbleW = advances(pickedName) * 7.6 + 22
  const zoomButton = 'grid size-11 place-items-center box shadow-pop transition-[transform,box-shadow] duration-75 enabled:active:translate-x-[3px] enabled:active:translate-y-[3px] enabled:active:shadow-none disabled:bg-veil disabled:text-muted disabled:shadow-none'

  return (
    <div ref={wrap} data-map data-level={view.level} className="absolute inset-0 touch-none select-none overflow-hidden bg-land-out">
      <canvas ref={ground} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <canvas ref={dots} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <canvas ref={lines} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <svg width={size.w} height={size.h} className="absolute left-0 top-0" role="group" aria-label={th.map.source}>
        <g transform={`translate(${round(ox)} ${round(oy)}) scale(${view.ppm})`}>
          <path d={CITY_PATH} fill="transparent" role="button" tabIndex={0} aria-label={`กรุงเทพฯ: ${th.map.state[cityState]}`} className="map-area cursor-pointer" onClick={() => onSelectArea('bkk')} onKeyDown={press(() => onSelectArea('bkk'))} />
          {phase === 2 &&
            ZONES.map((zone) => (
              <path
                key={zone.id}
                d={ZONE_PATH.get(zone.id)}
                fill="transparent"
                role="button"
                tabIndex={0}
                aria-label={`${zone.name}: ${th.map.state[byId.get(zone.id)?.state ?? 'no_data']}`}
                className="map-area cursor-pointer"
                onClick={() => onSelectArea(zone.id)}
                onKeyDown={press(() => onSelectArea(zone.id))}
              />
            ))}
          {selectedArea && (selectedArea === 'bkk' || ZONE_EDGE_PATH.has(selectedArea)) && (
            <path d={selectedArea === 'bkk' ? CITY_EDGE_PATH : ZONE_EDGE_PATH.get(selectedArea)} fill="none" stroke="var(--color-ink)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'none' }} />
          )}
        </g>
        {names.map((b) => (
          <g key={b.id} data-caption transform={`translate(${round(b.x)} ${round(b.y)})`} aria-hidden="true" style={{ pointerEvents: 'none' }}>
            <rect x={-b.w / 2 + 2.5} y={-b.h / 2 + 2.5} width={b.w} height={b.h} rx="6" fill="var(--color-ink)" />
            <rect data-face x={-b.w / 2} y={-b.h / 2} width={b.w} height={b.h} rx="6" fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth="1.8" />
            <text y="4.5" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="var(--color-ink)">
              {b.name}
            </text>
          </g>
        ))}
        {marks.map((m) => {
          const one = m.kind === 'one'
          const open = one ? () => onSelectCarePoint(m.point.id) : () => void go(1, fromScreen(view, size, [m.x, m.y]))
          return (
            <g
              key={one ? m.point.id : m.points.map((p) => p.id).join('+')}
              transform={`translate(${round(m.x)} ${round(m.y)})`}
              role="button"
              tabIndex={0}
              aria-label={one ? m.point.name : th.map.many.replace('{n}', String(m.points.length))}
              data-selected={m === picked}
              data-many={one ? undefined : m.points.length}
              className="map-pin cursor-pointer"
              onClick={open}
              onKeyDown={press(open)}
            >
              <circle data-hit cy={one ? -22 : 0} r={one ? 24 : 22} fill="transparent" />
              <circle className="map-pin-ring" cy={one ? -26 : 0} r={one ? 20 : 22} fill="none" stroke="var(--color-ink)" strokeWidth="2.5" />
              {one ? <PinBody kind={m.point.kind} /> : <ManyBody count={m.points.length} />}
            </g>
          )
        })}
        {picked && pickedName && (
          <g data-bubble transform={`translate(${round(Math.min(size.w - bubbleW / 2 - 6, Math.max(bubbleW / 2 + 6, picked.x)))} ${round(picked.y - (picked.kind === 'one' ? 62 : 38))})`} aria-hidden="true" style={{ pointerEvents: 'none' }}>
            <rect x={-bubbleW / 2 + 3} y={-13 + 3} width={bubbleW} height="26" rx="9" fill="var(--color-ink)" />
            <rect x={-bubbleW / 2} y="-13" width={bubbleW} height="26" rx="9" fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth="2" />
            <text y="4.8" textAnchor="middle" fontSize="13.5" fontWeight="700" fill="var(--color-ink)">
              {pickedName}
            </text>
          </g>
        )}
      </svg>
      <div className="absolute right-3 top-[3.75rem] flex flex-col items-end gap-1.5">
        <button type="button" aria-label={th.map.zoomIn} disabled={view.level === 'street'} onClick={() => void go(1)} className={zoomButton}>
          <Plus size={22} strokeWidth={2.25} aria-hidden="true" />
        </button>
        <button type="button" aria-label={th.map.zoomOut} disabled={view.level === 'city'} onClick={() => void go(-1)} className={zoomButton}>
          <Minus size={22} strokeWidth={2.25} aria-hidden="true" />
        </button>
        <p role="status" aria-label={th.map.levelNow} className="rounded-full border-[1.5px] border-ink bg-surface px-2 text-[11px] font-semibold">
          {th.map.level[view.level]}
        </p>
      </div>
      <p className="absolute bottom-[5.25rem] left-2 rounded-md bg-bg/85 px-1.5 text-[9.5px] leading-4 text-muted">{th.map.credit}</p>
    </div>
  )
}
