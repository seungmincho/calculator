'use client'

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/imageMosaic'
import {
  Upload, ClipboardPaste, ImagePlus, MousePointer2, Square, Circle, Paintbrush, Hand,
  Undo2, Redo2, ZoomIn, ZoomOut, Maximize, Trash2, Download, Copy, Check, ScanFace,
} from 'lucide-react'
import {
  type Region, type Effect, type Shape, type Point, type Handle,
  clamp, normalizeRect, pixelBounds, clientToImage, fitZoom, strengthScale, brushBounds,
  topRegionAt, moveRegion, handleAt, handlePoints, oppositeCorner, pixelate, boxBlur,
  ZOOM_MIN, ZOOM_MAX,
} from '@/utils/imageMosaic'

type Tool = 'select' | Shape | 'pan'

interface Source {
  canvas: HTMLCanvasElement
  w: number
  h: number
  /** original size when it had to be shrunk to fit the canvas limit */
  orig?: { w: number; h: number }
}

type Op =
  | { kind: 'draw'; id: number; start: Point; before: Region[] }
  | { kind: 'move'; id: number; last: Point; before: Region[] }
  | { kind: 'resize'; id: number; fixed: Point; before: Region[] }
  | { kind: 'pan'; cx: number; cy: number; sl: number; st: number }
  | { kind: 'pinch'; d0: number; z0: number }

type FaceDetectorCtor = new (o?: { maxDetectedFaces?: number; fastMode?: boolean }) => {
  detect(img: CanvasImageSource): Promise<{ boundingBox: DOMRectReadOnly }[]>
}

// iOS Safari refuses canvases above ~16.7M pixels
const MAX_PIXELS = 16_777_216
const HISTORY_MAX = 200

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}
const ctx2d = (c: HTMLCanvasElement) => c.getContext('2d', { willReadFrequently: true })!

// Draw original + every region in order. Each region samples what is already under it,
// so a later mosaic over an earlier solid box never resurfaces the original pixels.
function renderComposite(out: HTMLCanvasElement, src: Source, regions: Region[]) {
  const { w: W, h: H } = src
  if (out.width !== W || out.height !== H) {
    out.width = W
    out.height = H
  }
  const ctx = ctx2d(out)
  ctx.clearRect(0, 0, W, H)
  ctx.drawImage(src.canvas, 0, 0)
  const k = strengthScale(W, H)

  for (const r of regions) {
    const b = pixelBounds(r, W, H)
    if (!b) continue
    const tmp = makeCanvas(b.w, b.h)
    const tctx = ctx2d(tmp)
    if (r.effect === 'black' || r.effect === 'white') {
      tctx.fillStyle = r.effect === 'black' ? '#000' : '#fff'
      tctx.fillRect(0, 0, b.w, b.h)
    } else if (r.effect === 'mosaic') {
      const img = ctx.getImageData(b.x, b.y, b.w, b.h)
      pixelate(img.data, b.w, b.h, r.strength * k)
      tctx.putImageData(img, 0, 0)
    } else {
      const rad = r.strength * k
      const pad = Math.ceil(rad * 3)
      const pb = pixelBounds({ x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad }, W, H)!
      const img = ctx.getImageData(pb.x, pb.y, pb.w, pb.h)
      boxBlur(img.data, pb.w, pb.h, rad)
      tctx.putImageData(img, pb.x - b.x, pb.y - b.y)
    }
    // keep only the region's shape
    tctx.globalCompositeOperation = 'destination-in'
    tctx.translate(-b.x, -b.y)
    tctx.fillStyle = '#000'
    tctx.beginPath()
    if (r.shape === 'rect') {
      tctx.rect(r.x, r.y, r.w, r.h)
      tctx.fill()
    } else if (r.shape === 'ellipse') {
      tctx.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2)
      tctx.fill()
    } else if (r.points?.length) {
      const pts = r.points, rad = r.radius ?? 1
      tctx.arc(pts[0].x, pts[0].y, rad, 0, Math.PI * 2)
      tctx.fill()
      if (pts.length > 1) {
        tctx.beginPath()
        tctx.moveTo(pts[0].x, pts[0].y)
        for (const p of pts) tctx.lineTo(p.x, p.y)
        tctx.lineWidth = rad * 2
        tctx.lineCap = 'round'
        tctx.lineJoin = 'round'
        tctx.stroke()
      }
    }
    ctx.drawImage(tmp, b.x, b.y)
  }
}

const isTypingTarget = (el: EventTarget | null) => {
  const e = el as HTMLElement | null
  if (!e) return false
  return e.isContentEditable || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT' ||
    (e.tagName === 'INPUT' && (e as HTMLInputElement).type !== 'range')
}

export default function ImageMosaic() {
  const t = useTranslations('imageMosaic')

  const [src, setSrc] = useState<Source | null>(null)
  const [baseName, setBaseName] = useState('image')
  const [regions, setRegions] = useState<Region[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [tool, setTool] = useState<Tool>('rect')
  const [effect, setEffect] = useState<Effect>('mosaic')
  const [strengths, setStrengths] = useState({ mosaic: 16, blur: 10 })
  const [brushSize, setBrushSize] = useState(30)
  const [zoomSet, setZoomSet] = useState<number | null>(null) // null = fit
  const [view, setView] = useState({ w: 800, h: 600 })
  const [hover, setHover] = useState<Point | null>(null)
  const [format, setFormat] = useState<'png' | 'jpeg'>('png')
  const [quality, setQuality] = useState(0.92)
  const [notice, setNotice] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [faceSupported, setFaceSupported] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [, setHistoryVersion] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const regionsRef = useRef<Region[]>([])
  const pastRef = useRef<Region[][]>([])
  const futureRef = useRef<Region[][]>([])
  const lastKeyRef = useRef<string | null>(null)
  const nextIdRef = useRef(1)
  const opRef = useRef<Op | null>(null)
  const pointersRef = useRef(new Map<number, Point>())
  const anchorRef = useRef<{ p: Point; client: Point } | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const fit = src ? fitZoom(src.w, src.h, view.w, view.h) : 1
  const zoom = zoomSet ?? fit
  const selected = regions.find((r) => r.id === selectedId) ?? null

  const flash = useCallback((msg: string) => {
    setNotice(msg)
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), 4000)
  }, [])

  // ── Regions + history (snapshots of the region list; the original pixels never change) ──
  const setLive = useCallback((next: Region[]) => {
    regionsRef.current = next
    setRegions(next)
  }, [])

  const pushPast = useCallback((before: Region[], key: string | null = null) => {
    if (!key || key !== lastKeyRef.current) {
      pastRef.current.push(before)
      if (pastRef.current.length > HISTORY_MAX) pastRef.current.shift()
    }
    futureRef.current = []
    lastKeyRef.current = key
    setHistoryVersion((v) => v + 1)
  }, [])

  // `key` merges consecutive edits (e.g. dragging a slider) into one undo step
  const commit = useCallback((next: Region[], key: string | null = null) => {
    pushPast(regionsRef.current, key)
    setLive(next)
  }, [pushPast, setLive])

  const undo = useCallback(() => {
    const prev = pastRef.current.pop()
    if (!prev) return
    futureRef.current.push(regionsRef.current)
    lastKeyRef.current = null
    setLive(prev)
    setHistoryVersion((v) => v + 1)
  }, [setLive])

  const redo = useCallback(() => {
    const next = futureRef.current.pop()
    if (!next) return
    pastRef.current.push(regionsRef.current)
    lastKeyRef.current = null
    setLive(next)
    setHistoryVersion((v) => v + 1)
  }, [setLive])

  const deleteRegion = useCallback((id: number) => {
    commit(regionsRef.current.filter((r) => r.id !== id))
    setSelectedId((s) => (s === id ? null : s))
  }, [commit])

  // ── Loading (file / drop / paste) ──
  const loadFile = useCallback((file: File | Blob, name: string) => {
    if (!file.type.startsWith('image/')) {
      flash(t('loadFailed'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      let w = img.naturalWidth
      let h = img.naturalHeight
      const orig = w * h > MAX_PIXELS ? { w, h } : undefined
      if (orig) {
        const s = Math.sqrt(MAX_PIXELS / (w * h))
        w = Math.floor(w * s)
        h = Math.floor(h * s)
      }
      const canvas = makeCanvas(w, h)
      ctx2d(canvas).drawImage(img, 0, 0, w, h) // EXIF orientation is applied by the browser here
      URL.revokeObjectURL(url)
      pastRef.current = []
      futureRef.current = []
      lastKeyRef.current = null
      setLive([])
      setSelectedId(null)
      setZoomSet(null)
      setBaseName(name.replace(/\.[^.]+$/, '') || 'image')
      setFormat(file.type === 'image/jpeg' ? 'jpeg' : 'png')
      setSrc({ canvas, w, h, orig })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      flash(t('loadFailed'))
    }
    img.src = url
  }, [flash, setLive, t])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file, file.name)
  }, [loadFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  // Ctrl+V anywhere on the page
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTypingTarget(e.target)) return
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'))
      const file = item?.getAsFile()
      if (!file) return
      e.preventDefault()
      loadFile(file, 'screenshot')
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [loadFile])

  // Button version for touch devices (needs async clipboard read permission)
  const pasteFromClipboard = useCallback(async () => {
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((ty) => ty.startsWith('image/'))
        if (type) {
          loadFile(await item.getType(type), 'screenshot')
          return
        }
      }
      flash(t('pasteFailed'))
    } catch {
      flash(t('pasteFailed'))
    }
  }, [flash, loadFile, t])

  useEffect(() => {
    setFaceSupported(typeof window !== 'undefined' && 'FaceDetector' in window)
  }, [])

  // ── Render ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!src || !canvas) return
    const id = requestAnimationFrame(() => renderComposite(canvas, src, regions))
    return () => cancelAnimationFrame(id)
  }, [src, regions])

  // Viewport size → fit zoom
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const update = () => setView({ w: vp.clientWidth, h: Math.max(240, window.innerHeight * 0.7) })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(vp)
    return () => ro.disconnect()
  }, [src])

  // Zoom around an anchor: keep the image point that was under `client` under it after re-layout
  const zoomTo = useCallback((z: number, client?: Point) => {
    const vp = viewportRef.current
    const stage = stageRef.current
    if (!src || !vp || !stage) return
    const vr = vp.getBoundingClientRect()
    const c = client ?? { x: vr.left + vr.width / 2, y: vr.top + vr.height / 2 }
    anchorRef.current = { p: clientToImage(c.x, c.y, stage.getBoundingClientRect(), src.w, src.h), client: c }
    setZoomSet(clamp(z, ZOOM_MIN, ZOOM_MAX))
  }, [src])

  useLayoutEffect(() => {
    const a = anchorRef.current
    const vp = viewportRef.current
    const stage = stageRef.current
    anchorRef.current = null
    if (!a || !vp || !stage) return
    const r = stage.getBoundingClientRect()
    vp.scrollLeft += r.left + a.p.x * zoom - a.client.x
    vp.scrollTop += r.top + a.p.y * zoom - a.client.y
  }, [zoom])

  // Ctrl/⌘ + wheel zoom (React's onWheel is passive, so attach natively)
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      zoomTo(zoom * Math.exp(-e.deltaY * 0.002), { x: e.clientX, y: e.clientY })
    }
    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => vp.removeEventListener('wheel', onWheel)
  }, [zoom, zoomTo])

  // ── Keyboard ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      const key = e.key.toLowerCase()
      if (e.ctrlKey || e.metaKey) {
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault()
          undo()
        } else if ((key === 'z' && e.shiftKey) || key === 'y') {
          e.preventDefault()
          redo()
        }
        return
      }
      if ((key === 'delete' || key === 'backspace') && selectedId != null) {
        e.preventDefault()
        deleteRegion(selectedId)
      } else if (key === 'escape') {
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, deleteRegion, selectedId])

  // ── Pointer (mouse, pen, touch; two fingers = pinch zoom) ──
  const toImage = (e: { clientX: number; clientY: number }, clampToImage = true): Point => {
    const p = clientToImage(e.clientX, e.clientY, stageRef.current!.getBoundingClientRect(), src!.w, src!.h)
    return clampToImage ? { x: clamp(p.x, 0, src!.w), y: clamp(p.y, 0, src!.h) } : p
  }

  const replaceRegion = (id: number, fn: (r: Region) => Region) =>
    setLive(regionsRef.current.map((r) => (r.id === id ? fn(r) : r)))

  const pinchInfo = () => {
    const [a, b] = Array.from(pointersRef.current.values())
    return { d: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!src || (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1)) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size === 2) {
      // second finger: abandon the half-drawn edit and pinch instead
      const op = opRef.current
      if (op && 'before' in op) setLive(op.before)
      opRef.current = { kind: 'pinch', d0: pinchInfo().d, z0: zoom }
      return
    }
    if (pointersRef.current.size > 2) return

    const vp = viewportRef.current!
    if (tool === 'pan' || e.button === 1) {
      opRef.current = { kind: 'pan', cx: e.clientX, cy: e.clientY, sl: vp.scrollLeft, st: vp.scrollTop }
      return
    }

    const p = toImage(e)
    const before = regionsRef.current
    const tol = (e.pointerType === 'touch' ? 16 : 8) / zoom

    if (tool === 'select') {
      const sel = before.find((r) => r.id === selectedId)
      const h = sel && sel.shape !== 'brush' ? handleAt(sel, p, tol) : null
      if (sel && h) {
        opRef.current = { kind: 'resize', id: sel.id, fixed: oppositeCorner(sel, h), before }
        return
      }
      const hit = topRegionAt(before, p, tol / 2)
      setSelectedId(hit?.id ?? null)
      opRef.current = hit ? { kind: 'move', id: hit.id, last: p, before } : null
      return
    }

    const id = nextIdRef.current++
    const strength = effect === 'mosaic' || effect === 'blur' ? strengths[effect] : 0
    let region: Region
    if (tool === 'brush') {
      const radius = brushSize / 2 / zoom
      region = { id, shape: 'brush', effect, strength, points: [p], radius, ...brushBounds([p], radius) }
    } else {
      region = { id, shape: tool, effect, strength, x: p.x, y: p.y, w: 0, h: 0 }
    }
    opRef.current = { kind: 'draw', id, start: p, before }
    setSelectedId(id)
    setLive([...before, region])
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!src) return
    if (tool === 'brush' && e.pointerType !== 'touch') setHover(toImage(e, false))
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const op = opRef.current
    if (!op) return

    if (op.kind === 'pinch') {
      if (pointersRef.current.size < 2) return
      const { d, mid } = pinchInfo()
      zoomTo((op.z0 * d) / Math.max(1, op.d0), mid)
      return
    }
    if (op.kind === 'pan') {
      const vp = viewportRef.current!
      vp.scrollLeft = op.sl - (e.clientX - op.cx)
      vp.scrollTop = op.st - (e.clientY - op.cy)
      return
    }

    const p = toImage(e)
    if (op.kind === 'draw') {
      replaceRegion(op.id, (r) => {
        if (r.shape !== 'brush') return { ...r, ...normalizeRect(op.start, p) }
        const pts = r.points!
        const last = pts[pts.length - 1]
        if (Math.hypot(p.x - last.x, p.y - last.y) < r.radius! / 4) return r
        const points = [...pts, p]
        return { ...r, points, ...brushBounds(points, r.radius!) }
      })
    } else if (op.kind === 'move') {
      const dx = p.x - op.last.x
      const dy = p.y - op.last.y
      op.last = p
      replaceRegion(op.id, (r) => moveRegion(r, dx, dy))
    } else if (op.kind === 'resize') {
      replaceRegion(op.id, (r) => ({ ...r, ...normalizeRect(op.fixed, p) }))
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId)
    const op = opRef.current
    if (!op) return
    if (op.kind === 'pinch') {
      if (pointersRef.current.size === 0) opRef.current = null
      return
    }
    opRef.current = null
    if (op.kind === 'pan') return

    const cur = regionsRef.current
    if (op.kind === 'draw') {
      const r = cur.find((x) => x.id === op.id)
      // a click without a real drag (< 4 screen px) is not a region
      if (r && r.shape !== 'brush' && (r.w * zoom < 4 || r.h * zoom < 4)) {
        setLive(op.before)
        setSelectedId(null)
        return
      }
    }
    if (cur !== op.before) pushPast(op.before)
  }

  // ── Editing controls (apply to the selected region, else to the next one) ──
  const curEffect = selected?.effect ?? effect
  const curStrength = selected ? selected.strength : curEffect === 'mosaic' || curEffect === 'blur' ? strengths[curEffect] : 0

  const chooseEffect = (ef: Effect) => {
    setEffect(ef)
    if (selected && selected.effect !== ef) {
      const strength = ef === 'mosaic' || ef === 'blur' ? strengths[ef] : 0
      commit(regionsRef.current.map((r) => (r.id === selected.id ? { ...r, effect: ef, strength } : r)))
    }
  }

  const chooseStrength = (v: number) => {
    if (curEffect === 'mosaic' || curEffect === 'blur') setStrengths((s) => ({ ...s, [curEffect]: v }))
    if (selected) {
      commit(regionsRef.current.map((r) => (r.id === selected.id ? { ...r, strength: v } : r)), `strength:${selected.id}`)
    }
  }

  const clearAll = () => {
    if (!regionsRef.current.length) return
    commit([])
    setSelectedId(null)
  }

  const detectFaces = async () => {
    if (!src) return
    try {
      const FD = (window as unknown as { FaceDetector: FaceDetectorCtor }).FaceDetector
      const faces = await new FD({ maxDetectedFaces: 50, fastMode: false }).detect(src.canvas)
      if (!faces.length) {
        flash(t('faceNone'))
        return
      }
      const strength = effect === 'mosaic' || effect === 'blur' ? strengths[effect] : 0
      const added: Region[] = faces.map(({ boundingBox: b }) => {
        const px = b.width * 0.2, py = b.height * 0.25
        return { id: nextIdRef.current++, shape: 'ellipse', effect, strength, x: b.x - px, y: b.y - py, w: b.width + 2 * px, h: b.height + 2 * py }
      })
      commit([...regionsRef.current, ...added])
      flash(t('faceFound', { n: faces.length }))
    } catch {
      flash(t('faceNone'))
    }
  }

  // ── Export: canvas re-encode = pixels only, so EXIF/GPS from the source file never reaches the output ──
  const exportCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || !src) return null
    renderComposite(canvas, src, regionsRef.current)
    return canvas
  }

  const handleDownload = () => {
    const canvas = exportCanvas()
    if (!canvas) return
    let out = canvas
    if (format === 'jpeg') {
      // JPEG has no alpha: flatten transparent areas onto white instead of black
      out = makeCanvas(canvas.width, canvas.height)
      const octx = out.getContext('2d')!
      octx.fillStyle = '#fff'
      octx.fillRect(0, 0, out.width, out.height)
      octx.drawImage(canvas, 0, 0)
    }
    out.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${baseName}-mosaic.${format === 'png' ? 'png' : 'jpg'}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, format === 'png' ? 'image/png' : 'image/jpeg', format === 'jpeg' ? quality : undefined)
  }

  const handleCopy = async () => {
    const canvas = exportCanvas()
    if (!canvas) return
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      flash(t('copyFailed'))
      return
    }
    try {
      // pass the Promise straight in so Safari keeps the user-gesture
      const blob = new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'))
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      flash(t('copyFailed'))
    }
  }

  // ── UI ──
  const seg = (active: boolean) =>
    `flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
      active ? 'bg-primary text-white' : 'bg-soft hover:bg-subtle text-body'
    }`
  const iconBtn = 'p-2 rounded-xl bg-soft hover:bg-subtle text-body disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

  const tools: { id: Tool; label: string; Icon: typeof Square }[] = [
    { id: 'select', label: t('toolSelect'), Icon: MousePointer2 },
    { id: 'rect', label: t('rectangle'), Icon: Square },
    { id: 'ellipse', label: t('toolEllipse'), Icon: Circle },
    { id: 'brush', label: t('brush'), Icon: Paintbrush },
    { id: 'pan', label: t('toolPan'), Icon: Hand },
  ]
  const effects: Effect[] = ['mosaic', 'blur', 'black', 'white']
  const shapeLabel = (s: Shape) => (s === 'rect' ? t('rectangle') : s === 'ellipse' ? t('toolEllipse') : t('brush'))
  const cursor = tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : tool === 'brush' ? 'none' : 'crosshair'
  const hs = 10 / zoom // handle size in image px

  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) loadFile(file, file.name)
        e.target.value = ''
      }}
    />
  )

  const noticeLine = notice && (
    <p role="status" className="text-sm text-body bg-subtle rounded-xl px-4 py-3">{notice}</p>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>
      {hiddenInput}

      {!src ? (
        <div
          className={`ui-card p-6 sm:p-10 border-2 border-dashed transition-colors ${dragOver ? 'border-primary bg-primary-soft' : 'border-line-strong'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOver(false)}
        >
          <div className="flex flex-col items-center text-center gap-4 py-8">
            <Upload className="w-10 h-10 text-faint" />
            <p className="text-lg font-semibold text-fg">{t('dropTitle')}</p>
            <p className="text-sm text-muted">{t('pasteHint')}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="ui-btn px-5 py-3 flex items-center gap-2">
                <ImagePlus className="w-4 h-4" />
                {t('pickFile')}
              </button>
              <button onClick={pasteFromClipboard} className="ui-btn-soft px-5 py-3 flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4" />
                {t('pasteButton')}
              </button>
            </div>
            <p className="text-xs text-faint">{t('local')}</p>
            {noticeLine}
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Canvas (first on mobile) */}
          <div className="lg:col-span-2 lg:order-last space-y-3">
            <div className="ui-card p-3 sm:p-4 space-y-3" onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={() => setDragOver(false)}>
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1" role="group" aria-label={t('tool')}>
                  {tools.map(({ id, label, Icon }) => (
                    <button key={id} onClick={() => setTool(id)} className={seg(tool === id)} aria-pressed={tool === id} title={label}>
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 ml-auto">
                  <button onClick={undo} disabled={!pastRef.current.length} className={iconBtn} title={`${t('undo')} (Ctrl+Z)`} aria-label={t('undo')}>
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button onClick={redo} disabled={!futureRef.current.length} className={iconBtn} title={`${t('redo')} (Ctrl+Shift+Z)`} aria-label={t('redo')}>
                    <Redo2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => zoomTo(zoom / 1.25)} className={iconBtn} title={t('zoomOut')} aria-label={t('zoomOut')}>
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button onClick={() => zoomTo(1)} className="px-2 py-2 rounded-xl bg-soft hover:bg-subtle text-body text-xs font-medium tabular-nums min-w-[3.5rem]" title="100%">
                    {Math.round(zoom * 100)}%
                  </button>
                  <button onClick={() => zoomTo(zoom * 1.25)} className={iconBtn} title={t('zoomIn')} aria-label={t('zoomIn')}>
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button onClick={() => setZoomSet(null)} className={iconBtn} title={t('zoomFit')} aria-label={t('zoomFit')}>
                    <Maximize className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted">{t(`hint.${tool}`)}</p>

              {/* Viewport */}
              <div
                ref={viewportRef}
                className={`overflow-auto rounded-xl bg-subtle ${dragOver ? 'ring-2 ring-primary' : ''}`}
                style={{ maxHeight: '70vh' }}
              >
                <div
                  ref={stageRef}
                  className="relative select-none"
                  style={{ width: src.w * zoom, height: src.h * zoom, margin: '0 auto', cursor, touchAction: 'none' }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onPointerLeave={() => setHover(null)}
                >
                  <canvas
                    ref={canvasRef}
                    className="block w-full h-full"
                    style={{ imageRendering: zoom >= 2 ? 'pixelated' : 'auto' }}
                  />
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox={`0 0 ${src.w} ${src.h}`}
                    preserveAspectRatio="none"
                  >
                    {regions.map((r) => {
                      const on = r.id === selectedId
                      const common = {
                        fill: 'none',
                        stroke: on ? 'var(--primary)' : '#fff',
                        strokeWidth: on ? 2 : 1,
                        strokeDasharray: on ? undefined : '4 3',
                        vectorEffect: 'non-scaling-stroke' as const,
                        style: on ? undefined : { mixBlendMode: 'difference' as const },
                      }
                      return r.shape === 'ellipse' ? (
                        <ellipse key={r.id} cx={r.x + r.w / 2} cy={r.y + r.h / 2} rx={r.w / 2} ry={r.h / 2} {...common} />
                      ) : (
                        <rect key={r.id} x={r.x} y={r.y} width={r.w} height={r.h} {...common} />
                      )
                    })}
                    {tool === 'select' && selected && selected.shape !== 'brush' &&
                      (Object.entries(handlePoints(selected)) as [Handle, Point][]).map(([h, p]) => (
                        <rect
                          key={h}
                          x={p.x - hs / 2}
                          y={p.y - hs / 2}
                          width={hs}
                          height={hs}
                          fill="#fff"
                          stroke="var(--primary)"
                          strokeWidth={1.5}
                          vectorEffect="non-scaling-stroke"
                        />
                      ))}
                    {tool === 'brush' && hover && (
                      <circle
                        cx={hover.x}
                        cy={hover.y}
                        r={brushSize / 2 / zoom}
                        fill="none"
                        stroke="#fff"
                        strokeWidth={1.5}
                        vectorEffect="non-scaling-stroke"
                        style={{ mixBlendMode: 'difference' }}
                      />
                    )}
                  </svg>
                </div>
              </div>
              {noticeLine}
            </div>
          </div>

          {/* Controls */}
          <div className="lg:col-span-1 space-y-4">
            <div className="ui-card p-5 space-y-5">
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm font-medium text-body">{t('effectType')}</span>
                  {selected && (
                    <span className="text-xs text-primary">
                      {t('editingRegion', { n: regions.indexOf(selected) + 1 })}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {effects.map((ef) => (
                    <button key={ef} onClick={() => chooseEffect(ef)} className={seg(curEffect === ef)} aria-pressed={curEffect === ef}>
                      {t(ef)}
                    </button>
                  ))}
                </div>
              </div>

              {(curEffect === 'mosaic' || curEffect === 'blur') && (
                <div>
                  <label htmlFor="mosaic-strength" className="flex justify-between text-sm font-medium text-body mb-2">
                    <span>{t(curEffect === 'mosaic' ? 'blockSize' : 'blurStrength')}</span>
                    <span className="tabular-nums text-sub">{curStrength}</span>
                  </label>
                  <input
                    id="mosaic-strength"
                    type="range"
                    min={curEffect === 'mosaic' ? 4 : 2}
                    max={curEffect === 'mosaic' ? 60 : 40}
                    value={curStrength}
                    onChange={(e) => chooseStrength(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              <p className={`text-xs rounded-xl px-3 py-2.5 ${curEffect === 'mosaic' || curEffect === 'blur' ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300' : 'bg-subtle text-sub'}`}>
                {t(curEffect === 'mosaic' || curEffect === 'blur' ? 'weakWarning' : 'solidNote')}
              </p>

              {tool === 'brush' && (
                <div>
                  <label htmlFor="mosaic-brush" className="flex justify-between text-sm font-medium text-body mb-2">
                    <span>{t('brushSize')}</span>
                    <span className="tabular-nums text-sub">{brushSize}px</span>
                  </label>
                  <input
                    id="mosaic-brush"
                    type="range"
                    min={8}
                    max={120}
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              {faceSupported && (
                <button onClick={detectFaces} className="ui-btn-soft w-full px-4 py-2.5 flex items-center justify-center gap-2">
                  <ScanFace className="w-4 h-4" />
                  {t('faceDetect')}
                </button>
              )}
            </div>

            {/* Regions */}
            <div className="ui-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-body">
                  {t('regions')} <span className="text-sub tabular-nums">{regions.length}</span>
                </span>
                {regions.length > 0 && (
                  <button onClick={clearAll} className="text-xs text-sub hover:text-fg">
                    {t('reset')}
                  </button>
                )}
              </div>
              {regions.length === 0 ? (
                <p className="text-xs text-muted">{t('noRegions')}</p>
              ) : (
                <ul className="space-y-1 max-h-56 overflow-auto">
                  {regions.map((r, i) => {
                    const on = r.id === selectedId
                    return (
                      <li key={r.id} className={`flex items-center rounded-xl border ${on ? 'bg-primary-soft text-primary border-primary' : 'border-transparent hover:bg-soft text-body'}`}>
                        <button onClick={() => setSelectedId(on ? null : r.id)} className="flex-1 text-left text-sm px-3 py-2" aria-pressed={on}>
                          {i + 1}. {shapeLabel(r.shape)} · {t(r.effect)}
                        </button>
                        <button onClick={() => deleteRegion(r.id)} className="p-2 text-sub hover:text-fg" aria-label={t('delete')} title={t('delete')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Export */}
            <div className="ui-card p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setFormat('png')} className={seg(format === 'png')} aria-pressed={format === 'png'}>{t('png')}</button>
                <button onClick={() => setFormat('jpeg')} className={seg(format === 'jpeg')} aria-pressed={format === 'jpeg'}>{t('jpeg')}</button>
              </div>
              {format === 'jpeg' && (
                <div>
                  <label htmlFor="mosaic-quality" className="flex justify-between text-sm font-medium text-body mb-2">
                    <span>{t('quality')}</span>
                    <span className="tabular-nums text-sub">{Math.round(quality * 100)}%</span>
                  </label>
                  <input
                    id="mosaic-quality"
                    type="range"
                    min={0.5}
                    max={1}
                    step={0.01}
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
              <button onClick={handleDownload} className="ui-btn w-full flex items-center justify-center gap-2 px-4 py-3">
                <Download className="w-4 h-4" />
                {t('download')}
              </button>
              <button onClick={handleCopy} className="ui-btn-soft w-full flex items-center justify-center gap-2 px-4 py-2.5">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t('copied') : t('copy')}
              </button>
              <p className="text-xs text-muted">{t('exifNote')}</p>
              {src.orig && (
                <p className="text-xs text-muted">{t('downscaled', { w: src.w, h: src.h, ow: src.orig.w, oh: src.orig.h })}</p>
              )}
              <div className="flex gap-2 pt-1 border-t border-line">
                <button onClick={() => fileInputRef.current?.click()} className="flex-1 text-sm text-sub hover:text-fg py-2 flex items-center justify-center gap-1.5">
                  <ImagePlus className="w-4 h-4" />
                  {t('changeImage')}
                </button>
                <button onClick={pasteFromClipboard} className="flex-1 text-sm text-sub hover:text-fg py-2 flex items-center justify-center gap-1.5">
                  <ClipboardPaste className="w-4 h-4" />
                  {t('pasteButton')}
                </button>
              </div>
              <p className="text-xs text-faint">{t('local')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Guide */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="space-y-6">
          {(['howToUse', 'safety', 'tips'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="text-lg font-medium text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="space-y-2 text-sub list-disc pl-5">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="text-lg font-medium text-fg mb-3">{t('guide.faq.title')}</h3>
            <div className="space-y-4">
              {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
                <div key={i}>
                  <p className="font-medium text-fg">{f.q}</p>
                  <p className="text-sub mt-1">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
