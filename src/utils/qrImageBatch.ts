export const QR_IMAGE_LIMITS = { count: 10, fileBytes: 8 * 1024 * 1024, totalBytes: 40 * 1024 * 1024, sourcePixels: 16_777_216, edge: 2048, fileMs: 20_000, nativeMs: 3000, workerMs: 10_000 } as const
export type QrImageFailure = 'fileSize' | 'format' | 'dimensions' | 'read' | 'worker' | 'timeout' | 'canceled'
export class QrImageError extends Error {
  code: QrImageFailure
  constructor(code: QrImageFailure) { super(code); this.code = code; this.name = 'QrImageError' }
}
export type QrImageStatus = 'waiting' | 'processing' | 'success' | 'notDetected' | 'readFailed' | 'outOfRange' | 'timedOut' | 'canceled'
export interface QrImageRow { id: string; index: number; name: string; status: QrImageStatus; text?: string; error?: QrImageFailure; scaled?: boolean; multiple?: boolean }
export function checkQrImageSelection(files: readonly { size: number }[]): 'count' | 'total' | null {
  if (!files.length || files.length > QR_IMAGE_LIMITS.count) return 'count'
  if (files.reduce((sum, file) => sum + (Number.isFinite(file.size) && file.size >= 0 ? file.size : Infinity), 0) > QR_IMAGE_LIMITS.totalBytes) return 'total'
  return null
}
export function checkQrImageSize(bytes: number) {
  if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > QR_IMAGE_LIMITS.fileBytes) throw new QrImageError('fileSize')
}
export function checkQrImageDimensions(width: number, height: number) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 || width * height > QR_IMAGE_LIMITS.sourcePixels) throw new QrImageError('dimensions')
}
/** Read bounded image headers before asking the browser to decode a raster image. */
export function qrImageDimensions(buffer: ArrayBuffer): { width: number; height: number; format: 'png' | 'jpeg' | 'webp' | 'gif' } {
  checkQrImageSize(buffer.byteLength)
  const b = new Uint8Array(buffer), view = new DataView(buffer)
  const ascii = (at: number, value: string) => at + value.length <= b.length && [...value].every((char, offset) => b[at + offset] === char.charCodeAt(0))
  const finish = (width: number, height: number, format: 'png' | 'jpeg' | 'webp' | 'gif') => { checkQrImageDimensions(width, height); return { width, height, format } }
  if (b.length >= 33 && b[0] === 137 && ascii(1, 'PNG\r\n\x1a\n') && view.getUint32(8) === 13 && ascii(12, 'IHDR')) return finish(view.getUint32(16), view.getUint32(20), 'png')
  if (b.length >= 13 && (ascii(0, 'GIF87a') || ascii(0, 'GIF89a'))) return finish(view.getUint16(6, true), view.getUint16(8, true), 'gif')
  if (b.length >= 12 && ascii(0, 'RIFF') && ascii(8, 'WEBP')) {
    const end = view.getUint32(4, true) + 8
    if (end > b.length || end < 12) throw new QrImageError('read')
    for (let at = 12; at + 8 <= end;) {
      const size = view.getUint32(at + 4, true), start = at + 8
      if (start + size > end) throw new QrImageError('read')
      if (ascii(at, 'VP8X') && size >= 10) return finish(1 + b[start + 4] + b[start + 5] * 256 + b[start + 6] * 65536, 1 + b[start + 7] + b[start + 8] * 256 + b[start + 9] * 65536, 'webp')
      if (ascii(at, 'VP8 ') && size >= 10 && ascii(start + 3, '\x9d\x01\x2a')) return finish(view.getUint16(start + 6, true) & 0x3fff, view.getUint16(start + 8, true) & 0x3fff, 'webp')
      if (ascii(at, 'VP8L') && size >= 5 && b[start] === 0x2f) {
        const bits = view.getUint32(start + 1, true)
        return finish(1 + (bits & 0x3fff), 1 + ((bits >>> 14) & 0x3fff), 'webp')
      }
      at = start + size + (size & 1)
    }
    throw new QrImageError('read')
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let at = 2
    while (at < b.length) {
      if (b[at++] !== 0xff) throw new QrImageError('read')
      while (b[at] === 0xff) at++
      const marker = b[at++]
      if (marker === 0xda || marker === 0xd9) break
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
      if (at + 2 > b.length) throw new QrImageError('read')
      const length = view.getUint16(at)
      if (length < 2 || at + length > b.length) throw new QrImageError('read')
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (length < 8) throw new QrImageError('read')
        return finish(view.getUint16(at + 5), view.getUint16(at + 3), 'jpeg')
      }
      at += length
    }
    throw new QrImageError('read')
  }
  throw new QrImageError('format')
}
export function qrImageCanvasSize(width: number, height: number) {
  checkQrImageDimensions(width, height)
  const ratio = Math.min(1, QR_IMAGE_LIMITS.edge / Math.max(width, height))
  return { width: Math.max(1, Math.floor(width * ratio)), height: Math.max(1, Math.floor(height * ratio)), scaled: ratio < 1 }
}
export function qrImageFailureStatus(code: QrImageFailure): QrImageStatus {
  return code === 'canceled' ? 'canceled' : code === 'timeout' ? 'timedOut' : code === 'fileSize' || code === 'dimensions' ? 'outOfRange' : 'readFailed'
}
export function canRetryQrImage(row: QrImageRow) {
  return ['notDetected', 'readFailed', 'timedOut', 'canceled'].includes(row.status) && row.error !== 'format'
}
export function qrImageHttpLink(text: string): string | null {
  try { const url = new URL(text); return /^(https?:)$/.test(url.protocol) ? url.href : null } catch { return null }
}
export function qrImagesText(rows: readonly QrImageRow[], selected: ReadonlySet<string>): string {
  return rows.filter(row => row.status === 'success' && typeof row.text === 'string' && selected.has(row.id)).map(row => `${row.index + 1}. ${row.name.replace(/[\u0000-\u001f\u007f]/g, ' ')}\n${row.text}`).join('\n\n')
}
