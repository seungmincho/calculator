export const BASE64_BYTE_LIMIT = 4 * 1024 * 1024
export const BASE64_TEXT_LIMIT = 6 * 1024 * 1024
export type Base64Format = 'standard' | 'url'
export type Base64ErrorCode = 'byteLimit' | 'textLimit' | 'invalidUnicode' | 'alphabet' | 'padding' | 'canonicalBits' | 'dataUrl' | 'fileType' | 'fileRead' | 'fileUtf8'
export class Base64CodecError extends Error {
  readonly code: Base64ErrorCode
  constructor(code: Base64ErrorCode) { super(code); this.name = 'Base64CodecError'; this.code = code }
}
const STANDARD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const ASCII_SPACE = /[\t\n\f\r ]/g
const MIME = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i
export type Base64RasterMime = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'

/** Bound allocation before TextEncoder; preserve paired UTF-16 and reject lossy lone surrogates for text encoding. */
function checkTextSize(text: string, limit: number, error: 'byteLimit' | 'textLimit', strictUnicode = false): void {
  if (text.length > limit) throw new Base64CodecError(error)
  let size = 0
  for (const char of text) {
    const value = char.codePointAt(0)!
    if (strictUnicode && value >= 0xd800 && value <= 0xdfff) throw new Base64CodecError('invalidUnicode')
    size += value <= 0x7f ? 1 : value <= 0x7ff ? 2 : value <= 0xffff ? 3 : 4
    if (size > limit) throw new Base64CodecError(error)
  }
}

export function encodeBase64Bytes(bytes: Uint8Array, format: Base64Format = 'standard', padding = format === 'standard'): string {
  if (bytes.byteLength > BASE64_BYTE_LIMIT) throw new Base64CodecError('byteLimit')
  const chunks: string[] = []
  for (let i = 0; i < bytes.length; i += 0x8000) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 0x8000)))
  let value = btoa(chunks.join(''))
  if (format === 'url') value = value.replace(/\+/g, '-').replace(/\//g, '_')
  // Standard output always includes padding; only Base64URL exposes omission.
  if (format === 'url' && !padding) value = value.replace(/=+$/, '')
  if (value.length > BASE64_TEXT_LIMIT) throw new Base64CodecError('textLimit')
  return value
}

export function encodeBase64Text(text: string, format: Base64Format = 'standard', padding = format === 'standard'): { bytes: Uint8Array; value: string } {
  checkTextSize(text, BASE64_BYTE_LIMIT, 'byteLimit', true)
  const bytes = new TextEncoder().encode(text)
  return { bytes, value: encodeBase64Bytes(bytes, format, padding) }
}

/** Keep a UTF-8 BOM as content here so decoding and re-encoding retain the exact bytes. */
export function base64Utf8Text(bytes: Uint8Array): string | null {
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes) } catch { return null }
}

export function base64ImageCandidate(bytes: Uint8Array): Base64RasterMime | null {
  const starts = (signature: number[]) => signature.every((value, index) => bytes[index] === value)
  if (bytes.length >= 8 && starts([137, 80, 78, 71, 13, 10, 26, 10])) return 'image/png'
  if (bytes.length >= 3 && starts([255, 216, 255])) return 'image/jpeg'
  if (bytes.length >= 6 && (starts([71, 73, 70, 56, 55, 97]) || starts([71, 73, 70, 56, 57, 97]))) return 'image/gif'
  if (bytes.length >= 12 && starts([82, 73, 70, 70]) && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) return 'image/webp'
  return null
}

export interface Base64Decoded {
  bytes: Uint8Array
  text: string | null
  declaredMime: string | null
  isDataUrl: boolean
  imageCandidate: Base64RasterMime | null
}

/** ASCII whitespace and omitted final padding are explicit tool allowances for both formats. */
export function decodeBase64(source: string, format: Base64Format = 'standard'): Base64Decoded {
  checkTextSize(source, BASE64_TEXT_LIMIT, 'textLimit')
  let payload = source.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '')
  let declaredMime: string | null = null, isDataUrl = false
  if (/^data:/i.test(payload)) {
    const comma = payload.indexOf(',')
    if (comma < 0 || comma > 1024) throw new Base64CodecError('dataUrl')
    const pieces = payload.slice(5, comma).split(';')
    if (pieces.length < 2) throw new Base64CodecError('dataUrl')
    if (pieces.pop()?.toLowerCase() !== 'base64') throw new Base64CodecError('dataUrl')
    const type = pieces.shift() ?? ''
    if ((type && !MIME.test(type)) || pieces.some(parameter => !/^[a-z0-9!#$&^_.+-]+=[^\s;,"<>]+$/i.test(parameter) || [...parameter].some(char => char.charCodeAt(0) < 33 || char.charCodeAt(0) > 126))) throw new Base64CodecError('dataUrl')
    declaredMime = type.toLowerCase() || 'text/plain'
    isDataUrl = true; format = 'standard'; payload = payload.slice(comma + 1)
  }
  const compact = payload.replace(ASCII_SPACE, '')
  if ((format === 'standard' ? /[^A-Za-z0-9+/=]/ : /[^A-Za-z0-9_=-]/).test(compact)) throw new Base64CodecError('alphabet')
  const equal = compact.indexOf('=')
  const body = equal < 0 ? compact : compact.slice(0, equal)
  const remainder = body.length % 4
  if (remainder === 1) throw new Base64CodecError('padding')
  if (equal >= 0) {
    const expected = remainder === 2 ? 2 : remainder === 3 ? 1 : 0
    if (!expected || compact.length - equal !== expected || !/^=+$/.test(compact.slice(equal))) throw new Base64CodecError('padding')
  }
  const canonicalBody = body.replace(/-/g, '+').replace(/_/g, '/')
  const last = canonicalBody ? STANDARD.indexOf(canonicalBody.at(-1)!) : 0
  if ((remainder === 2 && (last & 15) !== 0) || (remainder === 3 && (last & 3) !== 0)) throw new Base64CodecError('canonicalBits')
  const size = Math.floor(body.length * 6 / 8)
  if (size > BASE64_BYTE_LIMIT) throw new Base64CodecError('byteLimit')
  const binary = atob(canonicalBody + '='.repeat((4 - remainder) % 4))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return { bytes, text: base64Utf8Text(bytes), declaredMime, isDataUrl, imageCandidate: base64ImageCandidate(bytes) }
}

/** A data URL always uses standard Base64, regardless of the separate raw output format. */
export function base64DataUrl(bytes: Uint8Array, mime = 'application/octet-stream'): string {
  const type = MIME.test(mime) && mime.length <= 127 ? mime.toLowerCase() : 'application/octet-stream'
  const result = `data:${type};base64,${encodeBase64Bytes(bytes)}`
  if (result.length > BASE64_TEXT_LIMIT) throw new Base64CodecError('textLimit')
  return result
}

export function safeBase64Filename(name: string, extension: 'txt' | 'bin' | 'png' | 'jpg' | 'gif' | 'webp'): string {
  const leaf = name.split(/[\\/]/).at(-1) ?? ''
  let stem = [...leaf.replace(/\.[^.]*$/, '')].filter(char => {
    const code = char.codePointAt(0)!
    return code >= 32 && code !== 127 && !(code >= 0x202a && code <= 0x202e) && !(code >= 0x2066 && code <= 0x2069) && !'<>:"|?*'.includes(char)
  }).slice(0, 100).join('').trim().replace(/[. ]+$/, '')
  if (!stem || /^\.+$/.test(stem)) stem = 'converted'
  if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem)) stem = `file-${stem}`
  return `${stem}.${extension}`
}
