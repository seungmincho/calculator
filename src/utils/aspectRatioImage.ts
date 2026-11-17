import { ASPECT_CALC_MAX_SIDE, parseRatio, type Rect } from './aspectRatio.ts'

export const ASPECT_IMAGE_LIMITS = { calculationSide: ASPECT_CALC_MAX_SIDE, inputBytes: 8 * 1024 * 1024, pixels: 16_000_000, outputSide: 8192, ratioText: 64, previewSide: 320 } as const
export type AspectImageFailure = 'fileSize' | 'format' | 'dimensions' | 'read' | 'decode' | 'canvas' | 'output' | 'tooThin' | 'canceled'
export class AspectImageError extends Error {
  readonly code: AspectImageFailure
  constructor(code: AspectImageFailure) { super(code); this.name = 'AspectImageError'; this.code = code }
}
export type AspectFit = 'crop' | 'pad'
export type AspectPadColor = '#000000' | '#ffffff'
export interface AspectImageSettings { readonly width: number; readonly height: number; readonly fit: AspectFit; readonly padColor: AspectPadColor; readonly x: number; readonly y: number }
export interface AspectGeometry { readonly crop: Rect; readonly pad: Rect; readonly cutPct: number; readonly canMoveX: boolean; readonly canMoveY: boolean }
export const ASPECT_CROP_POSITIONS = [
  { id: 'topLeft', x: 0, y: 0 }, { id: 'top', x: 50, y: 0 }, { id: 'topRight', x: 100, y: 0 },
  { id: 'left', x: 0, y: 50 }, { id: 'center', x: 50, y: 50 }, { id: 'right', x: 100, y: 50 },
  { id: 'bottomLeft', x: 0, y: 100 }, { id: 'bottom', x: 50, y: 100 }, { id: 'bottomRight', x: 100, y: 100 },
] as const

export function isAspectDimension(value: number): boolean { return Number.isSafeInteger(value) && value >= 1 && value <= ASPECT_IMAGE_LIMITS.calculationSide }
/** Preserve the existing pixel rounding convention; reject partial parses and nonfinite input. */
export function parseAspectPixels(raw: string | null): number | null {
  if (raw === null || raw.length > 64 || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw.trim())) return null
  const value = Number(raw.trim()), rounded = Math.round(value)
  return Number.isFinite(value) && value > 0 && value <= ASPECT_IMAGE_LIMITS.calculationSide && isAspectDimension(rounded) ? rounded : null
}
/** Reuse the existing grammar without sending unbounded numeric strings to it. */
export function parseAspectCustomRatio(raw: string): number | null {
  if (raw.length > ASPECT_IMAGE_LIMITS.ratioText) return null
  const ratio = parseRatio(raw)
  return ratio !== null && Number.isFinite(ratio) && ratio >= 1 / ASPECT_IMAGE_LIMITS.calculationSide && ratio <= ASPECT_IMAGE_LIMITS.calculationSide ? ratio : null
}
export function readAspectQuery(params: URLSearchParams): { width: string; height: string; lockedRatio: number | null; zone: 'none' | 'shorts' | 'reels' } {
  const width = params.get('w') ?? '1920', height = params.get('h') ?? '1080'
  const w = parseAspectPixels(width), h = parseAspectPixels(height), zone = params.get('zone')
  return { width, height, lockedRatio: params.get('lock') === '1' && w !== null && h !== null ? w / h : null, zone: zone === 'shorts' || zone === 'reels' ? zone : 'none' }
}
export function checkAspectImageBytes(bytes: number): void { if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > ASPECT_IMAGE_LIMITS.inputBytes) throw new AspectImageError('fileSize') }
export function checkAspectImageDimensions(width: number, height: number): void {
  if (!isAspectDimension(width) || !isAspectDimension(height) || width * height > ASPECT_IMAGE_LIMITS.pixels) throw new AspectImageError('dimensions')
}
export type AspectOutputSize = { ok: true; width: number; height: number; scaled: boolean } | { ok: false; reason: 'dimensions' | 'tooThin' }
export function aspectOutputSize(width: number, height: number): AspectOutputSize {
  if (!isAspectDimension(width) || !isAspectDimension(height)) return { ok: false, reason: 'dimensions' }
  const scale = Math.min(1, ASPECT_IMAGE_LIMITS.outputSide / Math.max(width, height), Math.sqrt(ASPECT_IMAGE_LIMITS.pixels / (width * height)))
  let w = Math.round(width * scale), h = Math.round(height * scale)
  if (w > ASPECT_IMAGE_LIMITS.outputSide || h > ASPECT_IMAGE_LIMITS.outputSide || w * h > ASPECT_IMAGE_LIMITS.pixels) { w = Math.floor(width * scale); h = Math.floor(height * scale) }
  if (w < 1 || h < 1) return { ok: false, reason: 'tooThin' }
  if (!isAspectDimension(w) || !isAspectDimension(h) || Math.max(w, h) > ASPECT_IMAGE_LIMITS.outputSide || w * h > ASPECT_IMAGE_LIMITS.pixels) return { ok: false, reason: 'dimensions' }
  return { ok: true, width: w, height: h, scaled: w !== width || h !== height }
}
export function createAspectImageSettings(value: AspectImageSettings): Readonly<AspectImageSettings> {
  if (!isAspectDimension(value.width) || !isAspectDimension(value.height) || !['crop', 'pad'].includes(value.fit) || !['#000000', '#ffffff'].includes(value.padColor)
    || !Number.isFinite(value.x) || value.x < 0 || value.x > 100 || !Number.isFinite(value.y) || value.y < 0 || value.y > 100) throw new AspectImageError('dimensions')
  return Object.freeze({ width: value.width, height: value.height, fit: value.fit, padColor: value.padColor, x: value.x, y: value.y })
}
/** Source coordinates are calculated against the final rounded output, never a second preview ratio. */
export function aspectImageGeometry(sw: number, sh: number, tw: number, th: number, x = 50, y = 50): AspectGeometry {
  checkAspectImageDimensions(sw, sh)
  if (!isAspectDimension(tw) || !isAspectDimension(th) || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) throw new AspectImageError('dimensions')
  const targetRatio = tw / th, sourceRatio = sw / sh
  const cw = sourceRatio > targetRatio ? sh * targetRatio : sw, ch = sourceRatio > targetRatio ? sh : sw / targetRatio
  const extraX = Math.max(0, sw - cw), extraY = Math.max(0, sh - ch), scale = Math.min(tw / sw, th / sh)
  const pw = sw * scale, ph = sh * scale
  return { crop: { x: extraX * x / 100, y: extraY * y / 100, w: cw, h: ch }, pad: { x: (tw - pw) / 2, y: (th - ph) / 2, w: pw, h: ph },
    cutPct: Math.max(0, Math.min(100, (1 - cw * ch / (sw * sh)) * 100)), canMoveX: extraX > 1e-7, canMoveY: extraY > 1e-7 }
}
export function aspectPreviewSize(width: number, height: number) {
  if (!isAspectDimension(width) || !isAspectDimension(height)) throw new AspectImageError('dimensions')
  const scale = Math.min(1, ASPECT_IMAGE_LIMITS.previewSide / Math.max(width, height))
  // A display raster may need one device pixel; output-size validation never uses this clamp.
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), aspectRatio: width / height }
}
export function aspectImageFilename(name: string, width: number, height: number, fit: AspectFit, mime: 'image/png' | 'image/jpeg'): string {
  const stem = name.replace(/\.[^.]*$/, '').replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_').replace(/[. ]+$/g, '').slice(0, 80) || 'image'
  return `${stem}-${width}x${height}-${fit}.${mime === 'image/png' ? 'png' : 'jpg'}`
}
