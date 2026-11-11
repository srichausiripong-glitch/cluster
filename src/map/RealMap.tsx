import { Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useReducer, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import { th } from '../copy/th'
import type { AreaState, PublishedArea } from '../domain/types'
import type { CarePoint } from '../store/seed'
import { CITY_EDGES, pathOf, zoneAt, ZONES } from './areas'
import { LEVELS, PPM, toXY, type Level, type XY } from './geo'
import { ManyBody, PinBody } from './legend'
import { paintDots, paintGround, paintLines, type Scene } from './paint'
import { mapSource } from './source'
import { PALETTE } from './style'
import type { CityData, Manifest, TileData } from './types'
import { advances, cityView, clampCity, deepestAt, fromScreen, MAP_INSET, markerBox, markers, nameBoxes, step, toScreen, viewAt, type Box, type Size, type View } from './view'

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
  /** Called when the level, or the zone under the middle of the map, changes. */
  onView?: (seen: { level: Level; zoneId: string | null }) => void
}

// The shapes of the button layer, in metres. They never change, so they are built once.
const CITY_PATH = pathOf(ZONES.flatMap((zone) => zone.rings))
const CITY_EDGE_PATH = pathOf(CITY_EDGES, false)
const ZONE_PATH = new Map(ZONES.map((zone) => [zone.id, pathOf(zone.rings)]))
const ZONE_EDGE_PATH = new Map(ZONES.map((zone) => [zone.id, pathOf(zone.edges, false)]))
/**
 * Where a selected pin or zone is brought to, in pixels down the map: low enough for the pin's name,
 * which sits above it, to clear the state box, and high enough to stay above the sheet on a short phone.
 */
const FOCUS_Y = 184
/** A finger must travel this far before a touch counts as a drag and not a tap. */
const DRAG_PX = 6
/** Drawing that takes longer than this cannot keep up with a finger: the last picture is carried along instead. */
const LIVE_MS = 8
/** A finger that has not moved for this long is resting: the map is drawn where it now is. */
const REST_MS = 120
/** How long one click on an area waits for a second: two clicks go one level in, one opens the area's sheet. */
const DOUBLE_MS = 250

const round = (n: number) => Math.round(n * 10) / 10
const press = (run: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    run()
  }
}
const wantsStill = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

type Gesture = { kind: 'drag'; from: XY; start: View; moved: boolean } | { kind: 'pinch'; span: number; done: boolean }

/**
 * The real map of Bangkok at three levels. Three canvases draw the ground, the signal dots and
 * the roads; the SVG layer above them holds what a person can act on, as real buttons: the city,
 * the zones and the care points.
 */
export function RealMap({ areas, cityState, carePoints, phase, showSignal, selectedArea, selectedPoint, onSelectArea, onSelectCarePoint, onView }: RealMapProps) {
  const wrap = useRef<HTMLDivElement>(null)
  const stack = useRef<HTMLDivElement>(null)
  const picture = useRef<HTMLDivElement>(null)
  const ground = useRef<HTMLCanvasElement>(null)
  const dots = useRef<HTMLCanvasElement>(null)
  const lines = useRef<HTMLCanvasElement>(null)
  // Before the first measurement, lay out for a phone.
  const [box, setBox] = useState({ w: 390, h: 714 })
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [city, setCity] = useState<CityData | null>(null)
  const [failed, setFailed] = useState<{ manifest?: true; city?: true; tiles?: boolean }>({})
  /** A double click or a grouped marker asked for a place the prototype has no deeper map for. */
  const [refused, setRefused] = useState(false)
  const [tiles, setTiles] = useState<Record<string, TileData>>({})
  /** Where the person has taken the map. Null is the city level as fitted to the screen. */
  const [stored, setStored] = useState<View | null>(null)
  const [still] = useState(wantsStill)
  /** Markers pop in once, when the map opens; later changes of view do not replay it. */
  const [fresh, setFresh] = useState(!still)
  const [, setFontsReady] = useState(false)
  const asked = useRef(new Set<string>())
  const bad = useRef(new Set<string>())
  const refusal = useRef<ReturnType<typeof setTimeout>>(undefined)
  /** When the level last changed, so the double click that follows a click on a grouped marker is not read as a second step. */
  const steppedAt = useRef(-Infinity)
  const alive = useRef(true)
  const pointers = useRef(new Map<number, XY>())
  const gesture = useRef<Gesture | null>(null)
  const scene = useRef<Scene | null>(null)
  /** What the canvases show now: the view it was drawn for, and how long the drawing took. */
  const drawn = useRef<{ view: View; w: number; h: number; ms: number } | null>(null)
  /** The canvases are being carried with the finger and no longer match the view. */
  const carried = useRef(false)
  const rested = useRef(false)
  const rest = useRef<ReturnType<typeof setTimeout>>(undefined)
  /** An area that was clicked once and is waiting to see whether a second click follows. */
  const picking = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  const lastLevel = useRef<{ level: Level; ppm: number } | null>(null)

  const size = useMemo<Size>(() => ({ w: box.w, h: box.h, inset: MAP_INSET }), [box.w, box.h])
  const view = useMemo<View>(() => {
    if (!stored) return cityView(size)
    if (stored.level === 'city') return clampCity(size, stored)
    // Until the list of map files has arrived the view is taken as asked; then it is moved onto the data.
    return manifest ? viewAt(manifest, size, stored.level, [stored.cx, stored.cy]) : stored
  }, [stored, size, manifest])

  // A selected care point, or a selected zone at city level, is brought up under the chips where the sheet does not cover it.
  const point = selectedPoint ? carePoints.find((p) => p.id === selectedPoint) : undefined
  const zone = selectedArea && view.level === 'city' ? ZONES.find((z) => z.id === selectedArea) : undefined
  const focusX = point ? toXY(point.lat, point.lon)[0] : zone ? zone.label[0] : null
  const focusY = point ? toXY(point.lat, point.lon)[1] : zone ? zone.label[1] : null
  const shown = useMemo<View>(() => {
    if (focusX === null || focusY === null) return view
    const [ax, ay] = toScreen(view, size, [view.cx, view.cy])
    return { ...view, cx: focusX - (size.w / 2 - ax) / view.ppm, cy: focusY - (FOCUS_Y - ay) / view.ppm }
  }, [view, size, focusX, focusY])

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
      () => alive.current && setFailed((f) => ({ ...f, manifest: true })),
    )
    source.city().then(
      (c) => alive.current && setCity(c),
      () => alive.current && setFailed((f) => ({ ...f, city: true })),
    )
    // Names are drawn on the canvas, so it is drawn again once the Thai font has arrived.
    document.fonts?.ready.then(() => alive.current && setFontsReady(true))
    const settle = setTimeout(() => setFresh(false), 1200)
    return () => {
      alive.current = false
      clearTimeout(settle)
      clearTimeout(rest.current)
      clearTimeout(picking.current)
      clearTimeout(refusal.current)
    }
  }, [])

  // On first leaving the city level, every deeper map file is read together, so the host's log
  // cannot tell which part of the city a person looked at (plan amendment 7). A file that failed
  // is asked for again only when the level next changes, never at every move.
  const level = shown.level
  useEffect(() => {
    if (!manifest || level === 'city') return
    for (const ref of [...manifest.district, ...manifest.street]) {
      if (asked.current.has(ref.file) && !bad.current.has(ref.file)) continue
      asked.current.add(ref.file)
      bad.current.delete(ref.file)
      mapSource()
        .tile(ref)
        .then(
          (tile) => alive.current && setTiles((old) => ({ ...old, [ref.file]: tile })),
          () => {
            bad.current.add(ref.file)
          },
        )
        .finally(() => alive.current && setFailed((f) => (Boolean(f.tiles) === bad.current.size > 0 ? f : { ...f, tiles: bad.current.size > 0 })))
    }
  }, [manifest, level])

  const marks = useMemo(() => markers(carePoints, shown, size), [carePoints, shown, size])
  const names = useMemo(() => (phase === 2 && shown.level === 'city' ? nameBoxes(ZONES, shown, size, marks) : []), [phase, shown, size, marks])
  const byId = useMemo(() => new Map(areas.map((a) => [a.areaId, a])), [areas])
  /** Only the dots of an area that was just reported move. */
  const breathing = !still && showSignal && areas.some((a) => a.state === 'shown' && a.step === 'new' && (phase === 2 ? a.areaId !== 'bkk' : a.areaId === 'bkk'))

  // Draw after every render: the view, the data or the layers may have changed.
  useEffect(() => {
    const g = gesture.current
    const last = drawn.current
    // Where drawing cannot keep up with a finger, the last picture is carried along, and the map is drawn again when the finger rests or lifts.
    if (g?.kind === 'drag' && g.moved && pointers.current.size > 0 && !rested.current && last && last.ms > LIVE_MS && last.view.level === shown.level && last.w === size.w && last.h === size.h) {
      if (picture.current) picture.current.style.transform = `translate(${round((last.view.cx - shown.cx) * shown.ppm)}px, ${round((last.view.cy - shown.cy) * shown.ppm)}px)`
      carried.current = true
      return
    }
    rested.current = false
    const started = performance.now()
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const level = shown.level
    scene.current = {
      view: shown,
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
    const now = scene.current
    const layers: [HTMLCanvasElement | null, (ctx: CanvasRenderingContext2D) => void][] = [
      [ground.current, (ctx) => paintGround(ctx, now)],
      [dots.current, (ctx) => paintDots(ctx, now, null)],
      [lines.current, (ctx) => paintLines(ctx, now)],
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
    drawn.current = { view: shown, w: size.w, h: size.h, ms: performance.now() - started }
    if (carried.current && picture.current) picture.current.style.transform = ''
    carried.current = false
  })

  // The newest zone breathes: its dots are redrawn on their own canvas, frame by frame.
  useEffect(() => {
    if (!breathing || typeof requestAnimationFrame !== 'function') return
    let frame = 0
    const tick = (time: number) => {
      const ctx = dots.current?.getContext('2d')
      if (ctx && scene.current) paintDots(ctx, scene.current, time)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [breathing])

  // A change of level is shown as one continuous growth or shrink, never a jump.
  useEffect(() => {
    const before = lastLevel.current
    lastLevel.current = { level: shown.level, ppm: shown.ppm }
    if (!before || before.level === shown.level || still) return
    stack.current?.animate?.([{ transform: `scale(${before.ppm / shown.ppm})`, opacity: 0.5 }, { transform: 'none', opacity: 1 }], { duration: 280, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' })
  }, [shown.level, shown.ppm, still])

  const zoneId = zoneAt([shown.cx, shown.cy])?.id ?? null
  const tell = useRef(onView)
  useEffect(() => {
    tell.current = onView
  })
  useEffect(() => {
    tell.current?.({ level: shown.level, zoneId })
  }, [shown.level, zoneId])

  /** Whether the prototype has map one level in at a place. Without the list of files nothing is known, and nothing is refused. */
  const deeperAt = (p: XY) => !manifest || LEVELS.indexOf(deepestAt(manifest, p)) > LEVELS.indexOf(shown.level)
  /**
   * The button goes in at the middle of the screen, so below city level it is offered only when
   * that place has map one level in. The whole-city view is not a place: from it the button goes
   * to the nearest part of the city the prototype has map for.
   */
  const canGoIn = shown.level !== 'street' && (shown.level === 'city' || deeperAt([shown.cx, shown.cy]))
  const noDetail = shown.level !== 'street' && (!canGoIn || refused)

  /**
   * One level in or out. Going in happens only where the place asked for has map one level in:
   * otherwise the map stays and says why, and never carries the person somewhere else.
   */
  const go = (by: 1 | -1, at?: XY) => {
    const to = step(shown.level, by)
    if (to === shown.level) return
    const target = at ?? [shown.cx, shown.cy]
    if (by === 1 && (at || shown.level !== 'city') && !deeperAt(target)) {
      setRefused(true)
      clearTimeout(refusal.current)
      refusal.current = setTimeout(() => setRefused(false), 4000)
      return
    }
    setRefused(false)
    steppedAt.current = performance.now()
    if (to === 'city') {
      setStored(null)
      return
    }
    setStored(manifest ? viewAt(manifest, size, to, target) : { level: to, ppm: PPM[to], cx: target[0], cy: target[1] })
  }

  /**
   * The areas cover the whole city, so the first click of a double click always lands on one. It
   * must not open that area's sheet, or the sheet would swallow the second click: a click waits a
   * moment, and a second click drops it and leaves the map to go one level in. The keyboard opens at once.
   */
  const pickArea = (areaId: string) => (e: MouseEvent) => {
    clearTimeout(picking.current)
    if (e.detail > 1) return
    picking.current = setTimeout(() => onSelectArea(areaId), DOUBLE_MS)
  }

  const local = (e: { clientX: number; clientY: number }): XY => {
    const rect = wrap.current?.getBoundingClientRect()
    return [e.clientX - (rect?.left ?? 0), e.clientY - (rect?.top ?? 0)]
  }
  const span = () => {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a[0] - b[0], a[1] - b[1])
  }
  const onPointerDown = (e: PointerEvent) => {
    pointers.current.set(e.pointerId, local(e))
    if (pointers.current.size === 1) gesture.current = { kind: 'drag', from: local(e), start: view, moved: false }
    else if (pointers.current.size === 2) gesture.current = { kind: 'pinch', span: span(), done: false }
  }
  const onPointerMove = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, local(e))
    const g = gesture.current
    if (!g) return
    if (g.kind === 'pinch') {
      // One level for one gesture, however far the fingers go.
      if (g.done || pointers.current.size < 2 || g.span === 0) return
      const ratio = span() / g.span
      if (ratio < 1.4 && ratio > 0.7) return
      g.done = true
      const [a, b] = [...pointers.current.values()]
      go(ratio >= 1.4 ? 1 : -1, fromScreen(shown, size, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]))
      return
    }
    const [x, y] = local(e)
    const dx = x - g.from[0]
    const dy = y - g.from[1]
    if (!g.moved && Math.abs(dx) + Math.abs(dy) <= DRAG_PX) return
    g.moved = true
    setStored({ ...g.start, cx: g.start.cx - dx / g.start.ppm, cy: g.start.cy - dy / g.start.ppm })
    clearTimeout(rest.current)
    rest.current = setTimeout(() => {
      if (!carried.current) return
      rested.current = true
      redraw()
    }, REST_MS)
  }
  const onPointerEnd = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size > 0) return
    clearTimeout(rest.current)
    // The gesture is forgotten a moment later, so the click that ends a drag can still be told from a tap.
    setTimeout(() => (gesture.current = null), 0)
    if (carried.current) redraw()
  }

  const [ox, oy] = toScreen(shown, size, [0, 0])
  const picked = marks.find((m) => (m.kind === 'one' ? m.point.id === selectedPoint : m.points.some((p) => p.id === selectedPoint)))
  const pickedName = picked ? (picked.kind === 'one' ? picked.point.name : (picked.points.find((p) => p.id === selectedPoint)?.name ?? '')) : ''
  const bubbleW = advances(pickedName) * 7.6 + 22
  const zoomButton = 'grid size-11 place-items-center box shadow-pop transition-[transform,box-shadow] duration-75 enabled:active:translate-x-[3px] enabled:active:translate-y-[3px] enabled:active:shadow-none disabled:bg-veil disabled:text-muted disabled:shadow-none'

  return (
    <div
      ref={wrap}
      data-map
      data-level={shown.level}
      data-still={still ? '' : undefined}
      className="absolute inset-0 touch-none select-none overflow-hidden bg-land-out"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={onPointerEnd}
      onClickCapture={(e) => {
        // A drag that ends on a marker must not open it.
        const g = gesture.current
        if (g?.kind === 'drag' && g.moved) e.stopPropagation()
      }}
      onDoubleClick={(e) => {
        // A double click never also opens an area's sheet, and one that follows a level change is the tail of the click that made it.
        clearTimeout(picking.current)
        if (performance.now() - steppedAt.current < 400) return
        go(1, fromScreen(shown, size, local(e)))
      }}
    >
      <div ref={stack} className="absolute inset-0">
        <div ref={picture} data-picture className="absolute inset-0" aria-hidden="true">
          <canvas ref={ground} className="absolute inset-0 h-full w-full" />
          <canvas ref={dots} className="absolute inset-0 h-full w-full" />
          <canvas ref={lines} className="absolute inset-0 h-full w-full" />
        </div>
        <svg width={size.w} height={size.h} className="absolute left-0 top-0" role="group" aria-label={th.map.source}>
          <g transform={`translate(${round(ox)} ${round(oy)}) scale(${shown.ppm})`}>
            <path d={CITY_PATH} fill="transparent" role="button" tabIndex={0} aria-label={`กรุงเทพฯ: ${th.map.state[cityState]}`} className="map-area cursor-pointer" onClick={pickArea('bkk')} onKeyDown={press(() => onSelectArea('bkk'))} />
            {phase === 2 &&
              ZONES.map((z) => (
                <path
                  key={z.id}
                  d={ZONE_PATH.get(z.id)}
                  fill="transparent"
                  role="button"
                  tabIndex={0}
                  aria-label={`${z.name}: ${th.map.state[byId.get(z.id)?.state ?? 'no_data']}`}
                  className="map-area cursor-pointer"
                  onClick={pickArea(z.id)}
                  onKeyDown={press(() => onSelectArea(z.id))}
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
          {marks.map((m, i) => {
            const one = m.kind === 'one'
            const open = one ? () => onSelectCarePoint(m.point.id) : () => go(1, fromScreen(shown, size, [m.x, m.y]))
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
                <g className={fresh ? 'pop-in' : undefined} style={fresh ? { animationDelay: `${150 + i * 60}ms` } : undefined}>
                  {one ? <PinBody kind={m.point.kind} /> : <ManyBody count={m.points.length} />}
                </g>
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
      </div>
      <div className="absolute right-3 top-[3.75rem] flex flex-col items-end gap-1.5" onDoubleClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label={th.map.zoomIn} disabled={!canGoIn} onClick={() => go(1)} className={zoomButton}>
          <Plus size={22} strokeWidth={2.25} aria-hidden="true" />
        </button>
        <button type="button" aria-label={th.map.zoomOut} disabled={shown.level === 'city'} onClick={() => go(-1)} className={zoomButton}>
          <Minus size={22} strokeWidth={2.25} aria-hidden="true" />
        </button>
        <p role="status" aria-label={th.map.levelNow} className="rounded-full border-[1.5px] border-ink bg-surface px-2 text-[11px] font-semibold">
          {th.map.level[shown.level]}
        </p>
        {noDetail && (
          <p data-map-note className="max-w-36 rounded-md border-[1.5px] border-ink bg-surface px-2 py-1 text-right text-[11px] leading-snug">
            {th.map.noDetail}
          </p>
        )}
      </div>
      {(failed.manifest || failed.city || failed.tiles) && (
        <p role="status" className="absolute inset-x-3 top-[7.5rem] mr-14 rounded-md border-[1.5px] border-ink bg-surface px-3 py-1.5 text-[12px] leading-snug">
          {th.map.loadFailed}
        </p>
      )}
      {/* The credit must stay readable beside the send button: on a narrow screen it wraps instead of running under it. */}
      <p className="absolute bottom-[5.25rem] left-2 max-w-[calc(100%-11.75rem)] rounded-md bg-bg/85 px-1.5 text-[9.5px] leading-4 text-muted">{th.map.credit}</p>
    </div>
  )
}
