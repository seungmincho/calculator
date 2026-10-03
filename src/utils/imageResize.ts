// 이미지 크기 조절 로직. 순수 함수(맨 위)는 scripts/check-image-resize.ts 로 회귀 체크.
// 디코드·목표 용량 탐색·파일명은 imageCompress.ts 것을 재사용한다.
import { decodeImage, fitDimensions, fitToSize, targetBytes, type Mime, type Source } from './imageCompress.ts'

export type SizeMode = 'px' | 'pct' | 'long'
export type Fit = 'stretch' | 'contain' | 'cover'
export type ResizeFormat = 'jpeg' | 'png' | 'webp'

export interface SizeOptions {
  mode: SizeMode
  width: number // px 모드. 0 = 비율로 자동
  height: number
  lock: boolean // px 모드: 켜면 W×H 상자 안에 비율 유지로 맞춤(이미지마다 크기 다름), 끄면 정확히 W×H + fit
  percent: number
  longSide: number
  fit: Fit
  cropX?: number // cover: 0 = left, 50 = center, 100 = right
  cropY?: number // cover: 0 = top, 50 = center, 100 = bottom
}

export const MAX_SIDE = 10000 // 브라우저 캔버스 한계(사파리 면적 제한 포함) 안쪽

/** cm → px (인쇄 해상도 dpi 기준, 1인치 = 2.54cm) */
export const cmToPx = (cm: number, dpi = 300) => Math.round((cm / 2.54) * dpi)

/** 정수 파싱 + 범위 고정. 빈 값/NaN이면 기본값 */
export function clampInt(v: string | number | null | undefined, lo: number, hi: number, d: number): number {
  if (v === null || v === undefined || v === '') return d
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d
}

export interface Preset { id: string; width: number; height: number; cm?: [number, number] }

// 증명사진은 cm 규격 × 300dpi로 계산 (반명함 3×4cm → 354×472, 여권 3.5×4.5cm → 413×531)
export const PRESETS: Preset[] = [
  { id: 'idPhoto', width: cmToPx(3), height: cmToPx(4), cm: [3, 4] },
  { id: 'passport', width: cmToPx(3.5), height: cmToPx(4.5), cm: [3.5, 4.5] },
  { id: 'instaSquare', width: 1080, height: 1080 },
  { id: 'instaPortrait', width: 1080, height: 1350 },
  { id: 'story', width: 1080, height: 1920 },
  { id: 'youtube', width: 1280, height: 720 },
  { id: 'kakao', width: 640, height: 640 },
  { id: 'fhd', width: 1920, height: 1080 },
]

export interface DrawPlan { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number }
export interface Resolved { width: number; height: number; plan: DrawPlan }

/** 원본 영역(sx..)을 출력 캔버스(dx..)의 어디에 그릴지. contain = 여백, cover = 가운데 자르기 */
export function drawPlan(srcW: number, srcH: number, outW: number, outH: number, fit: Fit, cropX = 50, cropY = 50): DrawPlan {
  if (fit === 'contain') {
    const s = Math.min(outW / srcW, outH / srcH)
    const dw = Math.max(1, Math.round(srcW * s)), dh = Math.max(1, Math.round(srcH * s))
    return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: Math.floor((outW - dw) / 2), dy: Math.floor((outH - dh) / 2), dw, dh }
  }
  if (fit === 'cover') {
    const s = Math.max(outW / srcW, outH / srcH)
    const sw = Math.min(srcW, outW / s), sh = Math.min(srcH, outH / s)
    const position = (value: number) => Math.min(1, Math.max(0, (Number.isFinite(value) ? value : 50) / 100))
    return { sx: (srcW - sw) * position(cropX), sy: (srcH - sh) * position(cropY), sw, sh, dx: 0, dy: 0, dw: outW, dh: outH }
  }
  return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: 0, dy: 0, dw: outW, dh: outH }
}

/** 출력 크기를 정확히 지정하는 경우(px + 비율 고정 끔) — 목표 용량 탐색에서 축소하면 안 됨 */
export const isFixedSize = (o: SizeOptions) => o.mode === 'px' && !o.lock && o.width > 0 && o.height > 0

/** 원본 크기 + 설정 → 출력 크기와 그리기 계획. scale(≤1)은 목표 용량 탐색용 추가 축소 */
export function resolveSize(srcW: number, srcH: number, o: SizeOptions, scale = 1): Resolved {
  let w: number, h: number
  let fit: Fit = 'stretch'
  if (o.mode === 'pct') {
    w = (srcW * o.percent) / 100; h = (srcH * o.percent) / 100
  } else if (o.mode === 'long') {
    ;({ width: w, height: h } = fitDimensions(srcW, srcH, o.longSide)) // 확대 안 함
  } else if (o.lock || !o.width || !o.height) {
    // 상자 안에 비율 유지. 한쪽만 입력하면 그쪽 기준
    const s = Math.min(o.width > 0 ? o.width / srcW : Infinity, o.height > 0 ? o.height / srcH : Infinity)
    const k = Number.isFinite(s) ? s : 1
    w = srcW * k; h = srcH * k
  } else {
    w = o.width; h = o.height; fit = o.fit
  }
  // 캔버스 한계 안으로
  const over = Math.max(w, h) / MAX_SIDE
  if (over > 1) { w /= over; h /= over }
  w = Math.max(1, Math.round(w * scale)); h = Math.max(1, Math.round(h * scale))
  return { width: w, height: h, plan: drawPlan(srcW, srcH, w, h, fit, o.cropX, o.cropY) }
}

/** 단계적 축소: 원본 → 목표가 2배 이상 차이 나면 절반씩 줄인 중간 크기들 (계단 현상·모아레 방지) */
export function downscaleSteps(sw: number, sh: number, dw: number, dh: number): { w: number; h: number }[] {
  const out: { w: number; h: number }[] = []
  let w = sw, h = sh
  while (w / 2 >= dw && h / 2 >= dh && out.length < 12) {
    w = Math.max(1, Math.round(w / 2)); h = Math.max(1, Math.round(h / 2))
    out.push({ w, h })
  }
  return out
}

// ───────────── 브라우저 전용 ─────────────

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  return { c, ctx }
}

/** 단계적 축소로 출력 캔버스를 만든다. bg: JPG(투명 불가)와 '맞춤' 여백을 채울 색 */
export function renderResized(src: Source, r: Resolved, bg: string | null): HTMLCanvasElement {
  const p = r.plan
  let cur: CanvasImageSource = src
  let sx = p.sx, sy = p.sy, sw = p.sw, sh = p.sh
  const temps: HTMLCanvasElement[] = []
  for (const s of downscaleSteps(sw, sh, p.dw, p.dh)) {
    const { c, ctx } = canvas(s.w, s.h)
    ctx.drawImage(cur, sx, sy, sw, sh, 0, 0, s.w, s.h)
    temps.push(c)
    cur = c; sx = 0; sy = 0; sw = s.w; sh = s.h
  }
  const { c, ctx } = canvas(r.width, r.height)
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, r.width, r.height) }
  ctx.drawImage(cur, sx, sy, sw, sh, p.dx, p.dy, p.dw, p.dh)
  temps.forEach((t) => { t.width = t.height = 0 })
  return c
}

export async function canvasToBlob(c: HTMLCanvasElement, mime: Mime, quality: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, mime, mime === 'image/png' ? undefined : quality))
  if (!blob) throw new Error('encode')
  if (blob.type !== mime) throw new Error('format') // 예: 구형 사파리 WebP
  return blob
}

export interface ResizeOptions extends SizeOptions { format: ResizeFormat; quality: number /* 0~100 */; targetKB: number /* 0 = 끔 */; bg: string }
export interface ResizeOutput { blob: Blob; mime: Mime; width: number; height: number; srcWidth: number; srcHeight: number; quality: number; ok: boolean }

export async function resizeFile(file: Blob, o: ResizeOptions): Promise<ResizeOutput> {
  const img = await decodeImage(file) // EXIF 회전 반영
  const mime = `image/${o.format}` as Mime
  const fill = mime === 'image/jpeg' || (isFixedSize(o) && o.fit === 'contain') ? o.bg : null
  let cache: { scale: number; c: HTMLCanvasElement; r: Resolved } | null = null
  const at = (scale: number) => {
    if (cache?.scale !== scale) {
      if (cache) cache.c.width = cache.c.height = 0
      const r = resolveSize(img.width, img.height, o, scale)
      cache = { scale, r, c: renderResized(img.src, r, fill) }
    }
    return cache
  }
  try {
    const encode = async (q: number, scale: number) => {
      const { c, r } = at(scale)
      const blob = await canvasToBlob(c, mime, q)
      return { blob, size: blob.size, width: r.width, height: r.height }
    }
    const base = { mime, srcWidth: img.width, srcHeight: img.height }
    if (o.targetKB > 0) {
      const maxQ = o.quality / 100
      const res = await fitToSize(encode, targetBytes(o.targetKB), {
        maxQ, minQ: Math.min(0.4, maxQ), minScale: isFixedSize(o) ? 1 : 0.05,
      })
      return { ...base, blob: res.out.blob, width: res.out.width, height: res.out.height, quality: res.quality, ok: res.ok }
    }
    const out = await encode(o.quality / 100, 1)
    return { ...base, blob: out.blob, width: out.width, height: out.height, quality: o.quality / 100, ok: true }
  } finally {
    const last = cache as { c: HTMLCanvasElement } | null
    if (last) last.c.width = last.c.height = 0
    img.close()
  }
}
