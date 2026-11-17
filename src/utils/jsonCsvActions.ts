import { JSON_CSV_LIMITS, jsonCsvUtf8Size } from './jsonCsv.ts'

type JsonCsvActionToken = { revision: number; channel: 'read' | 'copy'; request: number }
export function createJsonCsvActionGuard() {
  let revision = 0, read = 0, copy = 0
  return {
    invalidate() { revision++; read++; copy++ },
    cancelRead() { read++ },
    beginRead(): JsonCsvActionToken { return { revision, channel: 'read', request: ++read } },
    beginCopy(): JsonCsvActionToken { return { revision, channel: 'copy', request: ++copy } },
    isCurrent(token: JsonCsvActionToken) { return token.revision === revision && token.request === (token.channel === 'read' ? read : copy) },
  }
}
export type JsonCsvFileEncoding = 'utf-8' | 'euc-kr'
export type JsonCsvReadResult = { status: 'ready'; text: string } | { status: 'failed'; error: 'fileLimit' | 'decodedLimit' | 'encoding' | 'read' } | { status: 'stale' }
/** Decoder owns BOM handling: UTF-8 strips its first BOM once, with no second trim/removal. */
export async function readJsonCsvFile(file: { size: number }, encoding: JsonCsvFileEncoding, read: () => Promise<ArrayBuffer>, current: () => boolean = () => true): Promise<JsonCsvReadResult> {
  if (!current()) return { status: 'stale' }
  if (!Number.isInteger(file.size) || file.size < 0 || file.size > JSON_CSV_LIMITS.inputBytes) return { status: 'failed', error: 'fileLimit' }
  if (!['utf-8', 'euc-kr'].includes(encoding)) return { status: 'failed', error: 'encoding' }
  let bytes: ArrayBuffer
  try { bytes = await read() } catch { return current() ? { status: 'failed', error: 'read' } : { status: 'stale' } }
  if (!current()) return { status: 'stale' }
  if (bytes.byteLength > JSON_CSV_LIMITS.inputBytes) return { status: 'failed', error: 'fileLimit' }
  try {
    const text = new TextDecoder(encoding, { fatal: true, ignoreBOM: false }).decode(bytes)
    if (jsonCsvUtf8Size(text) > JSON_CSV_LIMITS.inputBytes) return { status: 'failed', error: 'decodedLimit' }
    return current() ? { status: 'ready', text } : { status: 'stale' }
  } catch { return current() ? { status: 'failed', error: 'encoding' } : { status: 'stale' } }
}
export async function copyJsonCsvText(text: string, ports: { write?: (text: string) => Promise<void>; fallback: (text: string) => boolean }, current: () => boolean = () => true): Promise<'copied' | 'failed' | 'stale'> {
  if (!current()) return 'stale'
  try { if (ports.write) { await ports.write(text); return current() ? 'copied' : 'stale' } } catch { /* Only a current request may try legacy copy. */ }
  if (!current()) return 'stale'
  try { const copied = ports.fallback(text); return current() ? copied === true ? 'copied' : 'failed' : 'stale' } catch { return current() ? 'failed' : 'stale' }
}
