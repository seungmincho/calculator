import { BASE64_BYTE_LIMIT, BASE64_TEXT_LIMIT, Base64CodecError, base64ImageCandidate, base64Utf8Text, type Base64ErrorCode, type Base64RasterMime } from './base64Codec.ts'
import { checkQrImageDimensions, qrImageDimensions } from './qrImageBatch.ts'

export function createBase64ActionGuard() {
  let revision = 0, read = 0, copy = 0
  type Token = { revision: number; channel: 'read' | 'copy'; request: number }
  return {
    beginRead(): Token { return { revision, channel: 'read', request: ++read } },
    beginCopy(): Token { return { revision, channel: 'copy', request: ++copy } },
    isCurrent(token: Token): boolean { return token.revision === revision && token.request === (token.channel === 'read' ? read : copy) },
    invalidate(): void { revision++ },
  }
}

export interface Base64File { name: string; size: number; type: string; arrayBuffer: () => Promise<ArrayBuffer> }
export type Base64FileResult =
  | { status: 'ready'; kind: 'file'; bytes: Uint8Array; name: string; mime: string }
  | { status: 'ready'; kind: 'base64Text'; text: string; name: string }
  | { status: 'failed'; error: Base64ErrorCode }
  | { status: 'stale' }

/** Encoding reads bytes; decoding uploads read UTF-8 Base64 source. Neither path commits UI state. */
export async function readBase64File(file: Base64File, purpose: 'encode' | 'decode', current: () => boolean): Promise<Base64FileResult> {
  if (!current()) return { status: 'stale' }
  const limit = purpose === 'encode' ? BASE64_BYTE_LIMIT : BASE64_TEXT_LIMIT
  if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > limit) return { status: 'failed', error: purpose === 'encode' ? 'byteLimit' : 'textLimit' }
  try {
    const buffer = await file.arrayBuffer()
    if (!current()) return { status: 'stale' }
    if (buffer.byteLength !== file.size) return { status: 'failed', error: 'fileRead' }
    const bytes = new Uint8Array(buffer).slice()
    if (purpose === 'encode') return { status: 'ready', kind: 'file', bytes, name: file.name, mime: file.type }
    const decoded = base64Utf8Text(bytes)
    if (decoded === null) return { status: 'failed', error: 'fileUtf8' }
    // A UTF-8 BOM on an uploaded text file is a file marker, not part of its Base64 payload.
    return { status: 'ready', kind: 'base64Text', text: decoded.startsWith('\uFEFF') ? decoded.slice(1) : decoded, name: file.name }
  } catch (error) {
    return current() ? { status: 'failed', error: error instanceof Base64CodecError ? error.code : 'fileRead' } : { status: 'stale' }
  }
}

export interface Base64PreviewPorts {
  createUrl: (blob: Blob) => string
  revokeUrl: (url: string) => void
  load: (url: string, signal: AbortSignal) => Promise<boolean>
}
export type Base64Preview = { status: 'ready'; url: string; mime: Base64RasterMime; release: () => void } | { status: 'none' | 'failed' | 'stale' }

function loadImage(url: string, signal: AbortSignal): Promise<boolean> {
  return new Promise(resolve => {
    if (signal.aborted) { resolve(false); return }
    const image = new Image()
    let settled = false
    const finish = (loaded: boolean) => {
      if (settled) return
      settled = true; clearTimeout(timeout); signal.removeEventListener('abort', abort)
      image.onload = null; image.onerror = null
      if (!loaded) { try { image.src = '' } catch { /* A rejected source must still finish and release its URL. */ } }
      resolve(loaded)
    }
    const abort = () => finish(false)
    const timeout = setTimeout(() => finish(false), 10000)
    signal.addEventListener('abort', abort, { once: true })
    image.onload = () => {
      try { checkQrImageDimensions(image.naturalWidth, image.naturalHeight); finish(true) }
      catch { finish(false) }
    }
    image.onerror = () => finish(false)
    if (signal.aborted) { finish(false); return }
    try { image.src = url } catch { finish(false) }
  })
}

/** MIME metadata cannot enable a preview. A raster signature and actual browser image load must both succeed. */
export async function createBase64ImagePreview(bytes: Uint8Array, signal: AbortSignal, ports?: Base64PreviewPorts): Promise<Base64Preview> {
  if (signal.aborted) return { status: 'stale' }
  if (bytes.byteLength > BASE64_BYTE_LIMIT) return { status: 'failed' }
  const mime = base64ImageCandidate(bytes)
  if (!mime) return { status: 'none' }
  const buffer = new Uint8Array(bytes).buffer
  // Reuse bounded raster-header validation; a small compressed file can decode to a huge image.
  try { qrImageDimensions(buffer) } catch { return { status: 'failed' } }
  const io = ports ?? { createUrl: (blob: Blob) => URL.createObjectURL(blob), revokeUrl: (url: string) => URL.revokeObjectURL(url), load: loadImage }
  let url: string
  try { url = io.createUrl(new Blob([buffer], { type: mime })) } catch { return { status: 'failed' } }
  let released = false, retained = false
  const release = () => {
    if (released) return
    released = true; signal.removeEventListener('abort', release)
    try { io.revokeUrl(url) } catch { /* URL cleanup is best effort and must not revive a stale preview. */ }
  }
  signal.addEventListener('abort', release, { once: true })
  try {
    if (signal.aborted) return { status: 'stale' }
    const loaded = await io.load(url, signal)
    if (signal.aborted) return { status: 'stale' }
    if (!loaded) return { status: 'failed' }
    retained = true
    return { status: 'ready', url, mime, release }
  } catch { return { status: signal.aborted ? 'stale' : 'failed' } }
  finally { if (!retained) release() }
}

export interface Base64ClipboardPorts { writeText?: (text: string) => Promise<void>; fallback: (text: string) => boolean }
export type Base64CopyOutcome = 'copied' | 'failed' | 'stale'
function legacyCopy(text: string): boolean {
  const active = document.activeElement, field = document.createElement('textarea')
  field.value = text; field.readOnly = true; field.style.position = 'fixed'; field.style.left = '-9999px'
  try {
    document.body.appendChild(field); field.focus(); field.select(); field.setSelectionRange(0, text.length)
    return document.execCommand('copy') === true
  } finally {
    field.remove()
    try { if (active instanceof HTMLElement) active.focus({ preventScroll: true }) } catch { /* Copy success is separate from focus recovery. */ }
  }
}
export async function copyBase64Text(text: string, current: () => boolean, ports?: Base64ClipboardPorts): Promise<Base64CopyOutcome> {
  if (!current()) return 'stale'
  try {
    const write = ports ? ports.writeText : typeof navigator !== 'undefined' && navigator.clipboard?.writeText ? (value: string) => navigator.clipboard.writeText(value) : undefined
    if (write) { await write(text); return current() ? 'copied' : 'stale' }
  } catch { /* Only the current result may attempt a fallback. */ }
  if (!current()) return 'stale'
  try {
    const success = ports ? ports.fallback(text) : legacyCopy(text)
    return current() ? success === true ? 'copied' : 'failed' : 'stale'
  } catch { return current() ? 'failed' : 'stale' }
}
