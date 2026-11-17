export const TEXT_HANDOFF_KEY = 'toolhub-ocr-tts-v1'
export const TEXT_HANDOFF_LIMIT = 30000
export const TEXT_HANDOFF_TTL = 10 * 60 * 1000
export type TextHandoffSource = 'ocr' | 'notepad'
export interface TextHandoff { source: TextHandoffSource; text: string; createdAt: number }
export interface TextSelectionSnapshot { noteId: string; text: string; start: number; end: number }
type HandoffStorage = Pick<Storage, 'getItem' | 'setItem'>
export interface TextHandoffWindow {
  opener: unknown
  sessionStorage: HandoffStorage
  location: { replace: (url: string) => void }
  close: () => void
}
export const isTextHandoffSource = (value: unknown): value is TextHandoffSource => value === 'ocr' || value === 'notepad'

export function parseTextHandoff(raw: string | null, now = Date.now()): TextHandoff | null {
  if (!raw || raw.length > TEXT_HANDOFF_LIMIT * 6 + 256 || !Number.isFinite(now) || now < 0) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const item = value as Record<string, unknown>
    if (!isTextHandoffSource(item.source) || typeof item.text !== 'string' || !item.text.trim() || item.text.length > TEXT_HANDOFF_LIMIT || typeof item.createdAt !== 'number' || !Number.isSafeInteger(item.createdAt) || item.createdAt < 0 || now < item.createdAt || now - item.createdAt > TEXT_HANDOFF_TTL) return null
    return { source: item.source, text: item.text, createdAt: item.createdAt }
  } catch { return null }
}

export function createTextHandoff(text: string, source: TextHandoffSource, now = Date.now()): TextHandoff {
  if (!isTextHandoffSource(source)) throw new Error('invalidSource')
  if (typeof text !== 'string' || !text.trim()) throw new Error('emptyText')
  if (text.length > TEXT_HANDOFF_LIMIT) throw new Error('textTooLong')
  const payload = { source, text, createdAt: now }
  if (!parseTextHandoff(JSON.stringify(payload), now)) throw new Error('handoffFailed')
  return payload
}

export function parseTextHandoffFrom(raw: string | null, source: TextHandoffSource, now = Date.now()): TextHandoff | null {
  const handoff = parseTextHandoff(raw, now)
  return handoff?.source === source ? handoff : null
}

/** Preserve the OCR caller's same-tab API and its existing invalid-text error contract. */
export function saveTextHandoff(text: string, storage: HandoffStorage = sessionStorage): void {
  if (typeof text !== 'string' || !text.trim() || text.length > TEXT_HANDOFF_LIMIT) throw new Error('textTooLong')
  const raw = JSON.stringify(createTextHandoff(text, 'ocr'))
  storage.setItem(TEXT_HANDOFF_KEY, raw)
  if (storage.getItem(TEXT_HANDOFF_KEY) !== raw) throw new Error('handoffFailed')
}

/** Open only inside a user gesture; never navigate or write into the source/existing TTS tabs. */
export function openTextHandoff(text: string, source: TextHandoffSource = 'notepad', openWindow: () => TextHandoffWindow | null = () => window.open('about:blank', '_blank')): void {
  const raw = JSON.stringify(createTextHandoff(text, source))
  let target: TextHandoffWindow | null
  try { target = openWindow() } catch { throw new Error('popupBlocked') }
  if (!target) throw new Error('popupBlocked')
  try {
    target.opener = null
    target.sessionStorage.setItem(TEXT_HANDOFF_KEY, raw)
    if (target.sessionStorage.getItem(TEXT_HANDOFF_KEY) !== raw) throw new Error('handoffFailed')
    target.location.replace(`/text-to-speech/?from=${source}`)
  } catch {
    try { target.close() } catch { /* Keep the original tab intact even when the failed popup cannot close. */ }
    throw new Error('handoffFailed')
  }
}

/** Consume only the value that this page actually read, without deleting a newer payload. */
export function clearTextHandoff(storage: Pick<Storage, 'getItem' | 'removeItem'>, expectedRaw: string): boolean {
  if (storage.getItem(TEXT_HANDOFF_KEY) !== expectedRaw) return false
  storage.removeItem(TEXT_HANDOFF_KEY)
  return storage.getItem(TEXT_HANDOFF_KEY) !== expectedRaw
}

export function captureTextSelection(noteId: string, text: string, start: number, end: number): TextSelectionSnapshot | null {
  if (!noteId || typeof text !== 'string' || !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > text.length) return null
  return { noteId, text, start, end }
}

/** Check the entire content, not just offsets, so edits or note switches cannot reuse stale selection. */
export function selectedHandoffText(selection: TextSelectionSnapshot | null, noteId: string, text: string): string | null {
  if (!selection || selection.noteId !== noteId || selection.text !== text || !captureTextSelection(noteId, text, selection.start, selection.end)) return null
  const selected = text.slice(selection.start, selection.end)
  return selected.trim() ? selected : null
}
