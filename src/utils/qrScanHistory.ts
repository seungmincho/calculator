export const QR_SCAN_HISTORY_KEY = 'qrScanHistory'
export interface QrScanHistoryItem { content: string; type: string; timestamp: number }
export type QrHistoryError = 'corrupt' | 'unavailable' | 'conflict' | 'quota' | 'unverified'
export type QrHistoryRead = { ok: true; raw: string | null; items: QrScanHistoryItem[] } | { ok: false; error: QrHistoryError }
const types = new Set(['url', 'email', 'phone', 'wifi', 'vcard', 'text'])
export function parseQrScanHistory(raw: string | null): QrHistoryRead {
  if (raw === null) return { ok: true, raw, items: [] }
  if (raw.length > 2_000_000) return { ok: false, error: 'corrupt' }
  try {
    const items: unknown = JSON.parse(raw)
    if (!Array.isArray(items) || items.length > 20 || !items.every(item => item && typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length === 3 && typeof item.content === 'string' && item.content.length <= 65_536 && types.has(item.type) && typeof item.timestamp === 'number' && Number.isFinite(item.timestamp) && item.timestamp > 0 && item.timestamp <= 8_640_000_000_000_000)) return { ok: false, error: 'corrupt' }
    return { ok: true, raw, items }
  } catch { return { ok: false, error: 'corrupt' } }
}
export function readQrScanHistory(storage: Pick<Storage, 'getItem'>): QrHistoryRead {
  try { return parseQrScanHistory(storage.getItem(QR_SCAN_HISTORY_KEY)) } catch { return { ok: false, error: 'unavailable' } }
}
export function writeQrScanHistory(previous: QrHistoryRead, items: QrScanHistoryItem[], storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): QrHistoryRead {
  if (!previous.ok) return previous
  const raw = items.length ? JSON.stringify(items) : null
  const parsed = parseQrScanHistory(raw)
  if (!parsed.ok) return parsed
  try { if (storage.getItem(QR_SCAN_HISTORY_KEY) !== previous.raw) return { ok: false, error: 'conflict' } } catch { return { ok: false, error: 'unavailable' } }
  try { if (raw === null) storage.removeItem(QR_SCAN_HISTORY_KEY); else storage.setItem(QR_SCAN_HISTORY_KEY, raw) }
  catch (error) { return { ok: false, error: error && typeof error === 'object' && 'name' in error && error.name === 'QuotaExceededError' ? 'quota' : 'unavailable' } }
  try { if (storage.getItem(QR_SCAN_HISTORY_KEY) !== raw) return { ok: false, error: 'unverified' } } catch { return { ok: false, error: 'unverified' } }
  return parsed
}
export async function withQrHistoryLock<T>(action: () => T): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request(QR_SCAN_HISTORY_KEY, { mode: 'exclusive' }, action)
  return action()
}
