// Pure geometry + pixel helpers for the image-mosaic tool (no DOM). Checked by scripts/check-image-mosaic.ts

export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

export type Shape = 'rect' | 'ellipse' | 'brush'
export type Effect = 'mosaic' | 'blur' | 'black' | 'white'
export type Handle = 'nw' | 'ne' | 'sw' | 'se'

export interface Region extends Rect {
  id: number
  shape: Shape
  effect: Effect
  /** slider value; actual px = strength * strengthScale(image) */
  strength: number
  /** brush only: stroke centre line + radius, image px */
  points?: Point[]
  radius?: number
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/** Two drag corners → positive-size rect */
export function normalizeRect(a: Point, b: Point): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }
}

/** Integer pixel box covering `r`, clipped to the image; null if nothing left */
export function pixelBounds(r: Rect, W: number, H: number): Rect | null {
  const x1 = clamp(Math.floor(r.x), 0, W)
  const y1 = clamp(Math.floor(r.y), 0, H)
  const x2 = clamp(Math.ceil(r.x + r.w), 0, W)
  const y2 = clamp(Math.ceil(r.y + r.h), 0, H)
  return x2 > x1 && y2 > y1 ? { x: x1, y: y1, w: x2 - x1, h: y2 - y1 } : null
}

/** Client (viewport) coords → image px, for a canvas whose on-screen box is `box` (any zoom/scroll) */
export function clientToImage(cx: number, cy: number, box: { left: number; top: number; width: number; height: number }, W: number, H: number): Point {
  return { x: ((cx - box.left) * W) / box.width, y: ((cy - box.top) * H) / box.height }
}

export const ZOOM_MIN = 0.05
export const ZOOM_MAX = 8

/** Zoom (display px per image px) that fits the image in the viewport, never upscaling */
export function fitZoom(W: number, H: number, viewW: number, viewH: number) {
  if (W <= 0 || H <= 0 || viewW <= 0 || viewH <= 0) return 1
  return clamp(Math.min(viewW / W, viewH / H, 1), ZOOM_MIN, ZOOM_MAX)
}

/** Effect sliders are tuned for ~1000px images; scale up for big photos so 20 still hides a face */
export const strengthScale = (W: number, H: number) => Math.max(1, Math.max(W, H) / 1000)

export function brushBounds(points: Point[], r: number): Rect {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  for (const p of points) {
    x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y); x2 = Math.max(x2, p.x); y2 = Math.max(y2, p.y)
  }
  return { x: x1 - r, y: y1 - r, w: x2 - x1 + 2 * r, h: y2 - y1 + 2 * r }
}

function distToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  const t = len2 ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1) : 0
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

export function hitTest(r: Region, p: Point, tol = 0): boolean {
  if (r.shape === 'ellipse') {
    const rx = r.w / 2 + tol, ry = r.h / 2 + tol
    if (rx <= 0 || ry <= 0) return false
    const nx = (p.x - (r.x + r.w / 2)) / rx, ny = (p.y - (r.y + r.h / 2)) / ry
    return nx * nx + ny * ny <= 1
  }
  if (r.shape === 'brush' && r.points?.length) {
    const pts = r.points, rad = (r.radius ?? 0) + tol
    if (pts.length === 1) return Math.hypot(p.x - pts[0].x, p.y - pts[0].y) <= rad
    for (let i = 1; i < pts.length; i++) if (distToSegment(p, pts[i - 1], pts[i]) <= rad) return true
    return false
  }
  return p.x >= r.x - tol && p.x <= r.x + r.w + tol && p.y >= r.y - tol && p.y <= r.y + r.h + tol
}

/** Topmost region under `p` (last drawn wins) */
export function topRegionAt(regions: Region[], p: Point, tol = 0): Region | undefined {
  for (let i = regions.length - 1; i >= 0; i--) if (hitTest(regions[i], p, tol)) return regions[i]
  return undefined
}

export function moveRegion(r: Region, dx: number, dy: number): Region {
  return {
    ...r,
    x: r.x + dx,
    y: r.y + dy,
    points: r.points?.map((q) => ({ x: q.x + dx, y: q.y + dy })),
  }
}

export function handlePoints(r: Rect): Record<Handle, Point> {
  return {
    nw: { x: r.x, y: r.y },
    ne: { x: r.x + r.w, y: r.y },
    sw: { x: r.x, y: r.y + r.h },
    se: { x: r.x + r.w, y: r.y + r.h },
  }
}

/** Corner opposite `h` — stays fixed while `h` is dragged */
export function oppositeCorner(r: Rect, h: Handle): Point {
  const opp: Record<Handle, Handle> = { nw: 'se', ne: 'sw', sw: 'ne', se: 'nw' }
  return handlePoints(r)[opp[h]]
}

export function handleAt(r: Rect, p: Point, tol: number): Handle | null {
  const hp = handlePoints(r)
  for (const h of ['nw', 'ne', 'sw', 'se'] as Handle[]) {
    if (Math.abs(p.x - hp[h].x) <= tol && Math.abs(p.y - hp[h].y) <= tol) return h
  }
  return null
}

/**
 * In-place mosaic on RGBA data: every block×block cell becomes its average colour.
 * Blocks are aligned to the data's own origin.
 */
export function pixelate(data: Uint8ClampedArray, w: number, h: number, block: number) {
  const b = Math.max(1, Math.round(block))
  if (b === 1) return
  for (let by = 0; by < h; by += b) {
    const ey = Math.min(by + b, h)
    for (let bx = 0; bx < w; bx += b) {
      const ex = Math.min(bx + b, w)
      let r = 0, g = 0, bl = 0, a = 0
      for (let y = by; y < ey; y++) {
        for (let x = bx, i = (y * w + bx) * 4; x < ex; x++, i += 4) {
          r += data[i]; g += data[i + 1]; bl += data[i + 2]; a += data[i + 3]
        }
      }
      const n = (ey - by) * (ex - bx)
      r = Math.round(r / n); g = Math.round(g / n); bl = Math.round(bl / n); a = Math.round(a / n)
      for (let y = by; y < ey; y++) {
        for (let x = bx, i = (y * w + bx) * 4; x < ex; x++, i += 4) {
          data[i] = r; data[i + 1] = g; data[i + 2] = bl; data[i + 3] = a
        }
      }
    }
  }
}

// One sliding-window box pass along rows (stride 4) or columns (stride 4*w), edges clamped
function boxPass(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, r: number, horizontal: boolean) {
  const len = horizontal ? w : h
  const lines = horizontal ? h : w
  const step = horizontal ? 4 : 4 * w
  const div = 2 * r + 1
  for (let line = 0; line < lines; line++) {
    const base = horizontal ? line * w * 4 : line * 4
    for (let c = 0; c < 4; c++) {
      const at = (k: number) => src[base + clamp(k, 0, len - 1) * step + c]
      let sum = 0
      for (let k = -r; k <= r; k++) sum += at(k)
      for (let k = 0; k < len; k++) {
        dst[base + k * step + c] = Math.round(sum / div)
        sum += at(k + r + 1) - at(k - r)
      }
    }
  }
}

/** In-place blur: 3 box passes each way ≈ gaussian with sigma ≈ radius. Edges are clamped, so nothing fades to transparent. */
export function boxBlur(data: Uint8ClampedArray, w: number, h: number, radius: number) {
  const r = Math.max(0, Math.round(radius))
  if (!r || !w || !h) return
  const tmp = new Uint8ClampedArray(data.length)
  for (let i = 0; i < 3; i++) {
    boxPass(data, tmp, w, h, r, true)
    boxPass(tmp, data, w, h, r, false)
  }
}
