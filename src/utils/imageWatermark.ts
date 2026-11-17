import { reserveUniqueImageNames } from './imageUniqueNames.ts'
import type { ImageZipSnapshot } from './imageZipSnapshot.ts'

export const WATERMARK_LIMITS = { files: 10, fileBytes: 8 * 1024 * 1024, totalBytes: 40 * 1024 * 1024, pixels: 16_777_216, logoBytes: 4 * 1024 * 1024, logoPixels: 4_194_304, outputBytes: 80 * 1024 * 1024, textPoints: 200, draws: 10_000 } as const
export const WATERMARK_POSITIONS = ['topLeft', 'topCenter', 'topRight', 'middleLeft', 'center', 'middleRight', 'bottomLeft', 'bottomCenter', 'bottomRight'] as const
export type WatermarkPosition = typeof WATERMARK_POSITIONS[number]
export type WatermarkFont = 'sans-serif' | 'serif' | 'monospace'
export interface WatermarkDraft {
  watermarkType: 'text' | 'image'; text: string; fontSize: number; fontFamily: WatermarkFont; fontColor: string; bold: boolean
  watermarkSize: number; position: WatermarkPosition; opacity: number; rotation: number; tileMode: boolean; margin: number
}
export const DEFAULT_WATERMARK_DRAFT: Readonly<WatermarkDraft> = Object.freeze({ watermarkType: 'text', text: 'Sample Watermark', fontSize: 48, fontFamily: 'sans-serif', fontColor: '#ffffff', bold: false, watermarkSize: 20, position: 'bottomRight', opacity: 50, rotation: 0, tileMode: false, margin: 20 })
type CommonSettings = { readonly position: WatermarkPosition; readonly opacity: number; readonly rotation: number; readonly tileMode: boolean; readonly margin: number }
export type WatermarkSettings = CommonSettings & (
  { readonly watermarkType: 'text'; readonly text: string; readonly fontSize: number; readonly fontFamily: WatermarkFont; readonly fontColor: string; readonly bold: boolean }
  | { readonly watermarkType: 'image'; readonly watermarkSize: number }
)
export interface WatermarkLogo { readonly id: string; readonly file: File; readonly width: number; readonly height: number }
export interface WatermarkSnapshot { readonly settings: WatermarkSettings; readonly logo: WatermarkLogo | null; readonly key: string }
export type WatermarkErrorCode = 'count' | 'totalBytes' | 'fileSize' | 'logoSize' | 'dimensions' | 'logoDimensions' | 'format' | 'read' | 'decode' | 'canvas' | 'output' | 'outputLimit' | 'text' | 'color' | 'options' | 'logoRequired' | 'tileSpacing' | 'tileLimit' | 'canceled' | 'busy'
export class WatermarkError extends Error {
  readonly code: WatermarkErrorCode
  constructor(code: WatermarkErrorCode) { super(code); this.name = 'WatermarkError'; this.code = code }
}
const integer = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
export function normalizeWatermarkText(value: string): string { return value.replace(/\r\n|\r|\n/g, ' ') }

/** Validate only the active mode. Inactive raw draft fields remain the UI's property, not this snapshot's. */
export function validateWatermarkSettings(value: unknown): WatermarkSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WatermarkError('options')
  const raw = value as Record<string, unknown>
  if (!WATERMARK_POSITIONS.includes(raw.position as WatermarkPosition) || !integer(raw.opacity, 1, 100) || !integer(raw.rotation, -180, 180) || !integer(raw.margin, 0, 100) || typeof raw.tileMode !== 'boolean') throw new WatermarkError('options')
  const common = { position: raw.position as WatermarkPosition, opacity: raw.opacity, rotation: raw.rotation, tileMode: raw.tileMode, margin: raw.margin }
  if (raw.watermarkType === 'text') {
    if (typeof raw.text !== 'string' || raw.text.length > WATERMARK_LIMITS.textPoints * 4) throw new WatermarkError('text')
    const text = normalizeWatermarkText(raw.text)
    if (!text.trim() || Array.from(text).length > WATERMARK_LIMITS.textPoints) throw new WatermarkError('text')
    if (typeof raw.fontColor !== 'string' || !/^#[\da-f]{6}$/i.test(raw.fontColor)) throw new WatermarkError('color')
    if (!integer(raw.fontSize, 10, 200) || !['sans-serif', 'serif', 'monospace'].includes(raw.fontFamily as string) || typeof raw.bold !== 'boolean') throw new WatermarkError('options')
    return Object.freeze({ ...common, watermarkType: 'text', text, fontSize: raw.fontSize, fontFamily: raw.fontFamily as WatermarkFont, fontColor: raw.fontColor.toUpperCase(), bold: raw.bold })
  }
  if (raw.watermarkType === 'image' && integer(raw.watermarkSize, 5, 80)) return Object.freeze({ ...common, watermarkType: 'image', watermarkSize: raw.watermarkSize })
  throw new WatermarkError('options')
}
export function checkWatermarkSize(size: number, logo = false): void {
  if (!Number.isSafeInteger(size) || size < 1 || size > (logo ? WATERMARK_LIMITS.logoBytes : WATERMARK_LIMITS.fileBytes)) throw new WatermarkError(logo ? 'logoSize' : 'fileSize')
}
export function checkWatermarkDimensions(width: number, height: number, logo = false): void {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width * height > (logo ? WATERMARK_LIMITS.logoPixels : WATERMARK_LIMITS.pixels)) throw new WatermarkError(logo ? 'logoDimensions' : 'dimensions')
}
/** Aggregate rejection leaves the current list unchanged; individual bad files can remain visible error rows. */
export function checkWatermarkAddition(current: readonly { size: number }[], incoming: readonly { size: number }[]): void {
  if (!incoming.length || current.length + incoming.length > WATERMARK_LIMITS.files) throw new WatermarkError('count')
  const bytes = [...current, ...incoming].reduce((sum, file) => sum + (Number.isSafeInteger(file.size) && file.size >= 0 ? file.size : Infinity), 0)
  if (bytes > WATERMARK_LIMITS.totalBytes) throw new WatermarkError('totalBytes')
}
export function createWatermarkSnapshot(draft: unknown, logo: WatermarkLogo | null = null): WatermarkSnapshot {
  const settings = validateWatermarkSettings(draft)
  let asset: WatermarkLogo | null = null
  if (settings.watermarkType === 'image') {
    if (!logo || typeof logo.id !== 'string' || !logo.id || logo.id.length > 128 || !logo.file) throw new WatermarkError('logoRequired')
    checkWatermarkSize(logo.file.size, true); checkWatermarkDimensions(logo.width, logo.height, true)
    asset = Object.freeze({ id: logo.id, file: logo.file, width: logo.width, height: logo.height })
  }
  return Object.freeze({ settings, logo: asset, key: JSON.stringify([settings, asset ? [asset.id, asset.width, asset.height] : null]) })
}

export interface WatermarkLayout {
  readonly width: number; readonly height: number; readonly rotationRadians: number; readonly alpha: number
  readonly center: { x: number; y: number }
  readonly tile: null | { origin: number; stepX: number; stepY: number; columns: number; rows: number; draws: number }
}
/** All positions are logical original-image pixels; preview applies one x/y transform around this plan. */
export function watermarkLayout(width: number, height: number, snapshot: WatermarkSnapshot, measuredTextWidth = 0): WatermarkLayout {
  checkWatermarkDimensions(width, height)
  const s = snapshot.settings
  const wmWidth = s.watermarkType === 'text' ? measuredTextWidth : width * s.watermarkSize / 100
  const wmHeight = s.watermarkType === 'text' ? s.fontSize : wmWidth * snapshot.logo!.height / snapshot.logo!.width
  if (!Number.isFinite(wmWidth) || !Number.isFinite(wmHeight) || wmWidth < 0 || wmHeight <= 0) throw new WatermarkError('options')
  const index = WATERMARK_POSITIONS.indexOf(s.position), column = index % 3, row = Math.floor(index / 3)
  const center = { x: column === 0 ? s.margin + wmWidth / 2 : column === 1 ? width / 2 : width - s.margin - wmWidth / 2, y: row === 0 ? s.margin + wmHeight / 2 : row === 1 ? height / 2 : height - s.margin - wmHeight / 2 }
  let tile: WatermarkLayout['tile'] = null
  if (s.tileMode) {
    const diagonal = Math.hypot(width, height), stepX = wmWidth + 2 * s.margin, stepY = wmHeight + 2 * s.margin
    if (!Number.isFinite(stepX) || !Number.isFinite(stepY) || stepX <= 0 || stepY <= 0) throw new WatermarkError('tileSpacing')
    const columns = Math.ceil(2 * diagonal / stepX), rows = Math.ceil(2 * diagonal / stepY), draws = columns * rows
    if (!Number.isSafeInteger(draws) || draws > WATERMARK_LIMITS.draws) throw new WatermarkError('tileLimit')
    tile = { origin: -diagonal, stepX, stepY, columns, rows, draws }
  }
  return { width: wmWidth, height: wmHeight, rotationRadians: s.rotation * Math.PI / 180, alpha: s.opacity / 100, center, tile }
}
export function watermarkPreviewSize(width: number, height: number, maxWidth = 960, maxHeight = 600) {
  checkWatermarkDimensions(width, height)
  if (!integer(maxWidth, 1, 2048) || !integer(maxHeight, 1, 2048)) throw new WatermarkError('options')
  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  const w = Math.max(1, Math.floor(width * scale)), h = Math.max(1, Math.floor(height * scale))
  return { width: w, height: h, scaleX: w / width, scaleY: h / height }
}
export function watermarkOutputName(original: string): string {
  const tail = original.split(/[/\\]/).pop() ?? ''
  const base = tail.replace(/\.[^.]*$/, '').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_').replace(/^[. ]+|[. ]+$/g, '')
  return `${Array.from(base || 'image').slice(0, 120).join('')}_watermarked.png`
}
export interface WatermarkOutput { readonly blob: Blob; readonly width: number; readonly height: number; readonly url: string }
export interface WatermarkCaptureRow { readonly id: string; readonly file: { name: string }; readonly status: string; readonly key?: string; readonly out?: WatermarkOutput }
export function captureWatermarkZip(rows: readonly WatermarkCaptureRow[], selected: ReadonlySet<string>, key: string) {
  const completed = rows.filter(row => selected.has(row.id) && row.status === 'done' && row.key === key && row.out)
  const names = reserveUniqueImageNames(completed.map(row => watermarkOutputName(row.file.name)))
  const snapshot: ImageZipSnapshot = Object.freeze({ key, entries: Object.freeze(completed.map((row, index) => Object.freeze({ id: row.id, name: names[index], blob: row.out!.blob }))) })
  return { snapshot, selectedCount: selected.size, successCount: completed.length, unavailableCount: selected.size - completed.length }
}
