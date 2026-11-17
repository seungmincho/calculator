import { parseWritingVersions, WRITING_VERSIONS_KEY, type WritingDraft } from './writingVersions.ts'

export const WRITING_DIFF_HANDOFF_KEY = 'toolhub-writing-diff-v1'
export const WRITING_DIFF_HANDOFF_SOURCE = 'writing-versions'
export const WRITING_DIFF_HANDOFF_PATH = '/diff-viewer/?from=writing-versions'
export const WRITING_DIFF_HANDOFF_TTL = 10 * 60 * 1000
export const WRITING_DIFF_TEXT_LIMIT = 50_000
export const WRITING_DIFF_LABEL_LIMIT = 40
// Two maximally escaped documents, three labels, and bounded structural fields.
export const WRITING_DIFF_RAW_LIMIT = 2 * WRITING_DIFF_TEXT_LIMIT * 6 + 3 * WRITING_DIFF_LABEL_LIMIT * 6 + 1024

export interface WritingDiffDocument { title: string; sourceTab: number; text: string }
export interface WritingDiffSavedDocument extends WritingDiffDocument { name: string }
export interface WritingDiffHandoff {
  version: 1
  source: typeof WRITING_DIFF_HANDOFF_SOURCE
  createdAt: number
  left: WritingDiffSavedDocument & { role: 'saved' }
  right: WritingDiffDocument & { role: 'current' }
}
export type WritingDiffParseError = 'missing' | 'invalid' | 'unsupported' | 'expired' | 'future' | 'textTooLong'
export type WritingDiffParseResult = { ok: true; payload: WritingDiffHandoff } | { ok: false; error: WritingDiffParseError }
export type WritingDiffSendError = WritingDiffParseError | 'conflict' | 'corrupt' | 'unavailable' | 'popupBlocked' | 'handoffFailed'
export class WritingDiffHandoffError extends Error {
  readonly code: WritingDiffSendError
  constructor(code: WritingDiffSendError) { super(code); this.name = 'WritingDiffHandoffError'; this.code = code }
}
export interface WritingDiffWindow {
  opener: unknown
  sessionStorage: Pick<Storage, 'getItem' | 'setItem'>
  location: { replace: (url: string) => void }
  close: () => void
}
export type WritingDiffConsumeResult = 'cleared' | 'replaced' | 'unavailable'
type ReceiveStorage = Pick<Storage, 'getItem' | 'removeItem'>
export type WritingDiffReceiveResult =
  | { ok: true; payload: WritingDiffHandoff; cleanup: WritingDiffConsumeResult }
  | { ok: false; error: WritingDiffParseError | 'unavailable' | 'changed' | 'edited' | 'stale' | 'applyFailed' }

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const exactKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
const label = (value: unknown): value is string => typeof value === 'string' && value.length <= WRITING_DIFF_LABEL_LIMIT
const clock = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const document = (value: unknown, role: 'saved' | 'current'): value is WritingDiffHandoff['left'] | WritingDiffHandoff['right'] =>
  record(value) && exactKeys(value, role === 'saved' ? ['role', 'name', 'title', 'sourceTab', 'text'] : ['role', 'title', 'sourceTab', 'text'])
  && value.role === role && label(value.title) && typeof value.text === 'string'
  && typeof value.sourceTab === 'number' && Number.isInteger(value.sourceTab) && value.sourceTab >= 1 && value.sourceTab <= 5
  && (role !== 'saved' || (label(value.name) && value.name.trim().length > 0))

/** Text stays exact, including empty documents, CRLF, whitespace and unpaired surrogates. */
export function parseWritingDiffHandoff(raw: string | null, now = Date.now()): WritingDiffParseResult {
  if (raw === null) return { ok: false, error: 'missing' }
  if (typeof raw !== 'string' || raw.length > WRITING_DIFF_RAW_LIMIT || !clock(now)) return { ok: false, error: 'invalid' }
  let value: unknown
  try { value = JSON.parse(raw) } catch { return { ok: false, error: 'invalid' } }
  if (!record(value)) return { ok: false, error: 'invalid' }
  if (value.version !== 1 || value.source !== WRITING_DIFF_HANDOFF_SOURCE) return { ok: false, error: 'unsupported' }
  if (!exactKeys(value, ['version', 'source', 'createdAt', 'left', 'right']) || !clock(value.createdAt)
    || !document(value.left, 'saved') || !document(value.right, 'current')) return { ok: false, error: 'invalid' }
  if (value.left.text.length > WRITING_DIFF_TEXT_LIMIT || value.right.text.length > WRITING_DIFF_TEXT_LIMIT) return { ok: false, error: 'textTooLong' }
  if (value.createdAt > now) return { ok: false, error: 'future' }
  if (now - value.createdAt > WRITING_DIFF_HANDOFF_TTL) return { ok: false, error: 'expired' }
  const left = value.left as WritingDiffHandoff['left']
  const right = value.right as WritingDiffHandoff['right']
  return { ok: true, payload: {
    version: 1, source: WRITING_DIFF_HANDOFF_SOURCE, createdAt: value.createdAt,
    left: { role: 'saved', name: left.name, title: left.title, sourceTab: left.sourceTab, text: left.text },
    right: { role: 'current', title: right.title, sourceTab: right.sourceTab, text: right.text },
  } }
}

export function createWritingDiffHandoff(saved: WritingDiffSavedDocument, current: WritingDiffDocument, now = Date.now()): WritingDiffHandoff {
  if (!record(saved) || !record(current) || typeof saved.text !== 'string' || typeof current.text !== 'string') throw new WritingDiffHandoffError('invalid')
  if (saved.text.length > WRITING_DIFF_TEXT_LIMIT || current.text.length > WRITING_DIFF_TEXT_LIMIT) throw new WritingDiffHandoffError('textTooLong')
  const raw = JSON.stringify({ version: 1, source: WRITING_DIFF_HANDOFF_SOURCE, createdAt: now,
    left: { role: 'saved', name: saved.name, title: saved.title, sourceTab: saved.sourceTab, text: saved.text },
    right: { role: 'current', title: current.title, sourceTab: current.sourceTab, text: current.text } })
  const result = parseWritingDiffHandoff(raw, now)
  if (!result.ok) throw new WritingDiffHandoffError(result.error)
  return result.payload
}

/** Read-only source preparation; call synchronously in the click before opening a window. */
export function prepareWritingDiffHandoff(
  storage: Pick<Storage, 'getItem'>, expectedRaw: string | null, selectedId: string,
  current: Pick<WritingDraft, 'title' | 'text'>, activeTab: number, now = Date.now(),
): WritingDiffHandoff {
  let raw: string | null
  try { raw = storage.getItem(WRITING_VERSIONS_KEY) } catch { throw new WritingDiffHandoffError('unavailable') }
  if (raw !== expectedRaw) throw new WritingDiffHandoffError('conflict')
  let versions
  try { versions = parseWritingVersions(raw) } catch { throw new WritingDiffHandoffError('corrupt') }
  const saved = versions.find(item => item.id === selectedId)
  if (!saved) throw new WritingDiffHandoffError('conflict')
  const payload = createWritingDiffHandoff(saved, { title: current.title, text: current.text, sourceTab: activeTab + 1 }, now)
  // A second read also protects ports/storage adapters that change during preparation.
  try { if (storage.getItem(WRITING_VERSIONS_KEY) !== raw) throw new WritingDiffHandoffError('conflict') }
  catch (cause) { throw cause instanceof WritingDiffHandoffError ? cause : new WritingDiffHandoffError('unavailable') }
  return payload
}

/** Only the newly opened blank tab is touched. Never await before calling this helper. */
export function openWritingDiffHandoff(
  payload: WritingDiffHandoff,
  openWindow: () => WritingDiffWindow | null = () => window.open('about:blank', '_blank'),
  now = Date.now(),
): void {
  const raw = JSON.stringify(payload)
  const valid = parseWritingDiffHandoff(raw, now)
  if (!valid.ok) throw new WritingDiffHandoffError(valid.error)
  let target: WritingDiffWindow | null
  try { target = openWindow() } catch { throw new WritingDiffHandoffError('popupBlocked') }
  if (!target) throw new WritingDiffHandoffError('popupBlocked')
  try {
    target.sessionStorage.setItem(WRITING_DIFF_HANDOFF_KEY, raw)
    if (target.sessionStorage.getItem(WRITING_DIFF_HANDOFF_KEY) !== raw) throw new Error('readback')
    target.opener = null
    if (target.opener !== null) throw new Error('opener')
    target.location.replace(WRITING_DIFF_HANDOFF_PATH)
  } catch {
    try { target.close() } catch { /* Preserve the source even if the failed new tab cannot close. */ }
    throw new WritingDiffHandoffError('handoffFailed')
  }
}

/** Only remove the exact applied payload. A different raw always belongs to a different delivery. */
export function clearWritingDiffHandoff(storage: ReceiveStorage, expectedRaw: string): WritingDiffConsumeResult {
  try {
    if (storage.getItem(WRITING_DIFF_HANDOFF_KEY) !== expectedRaw) return 'replaced'
    storage.removeItem(WRITING_DIFF_HANDOFF_KEY)
    const after = storage.getItem(WRITING_DIFF_HANDOFF_KEY)
    return after === null ? 'cleared' : after === expectedRaw ? 'unavailable' : 'replaced'
  } catch { return 'unavailable' }
}

/**
 * One receive attempt per mounted visit. begin/cancel support deferred hydration work and
 * StrictMode cleanup; edit is permanent for this visit, including edits made before begin.
 * Call cancel(ticket) on cleanup, and ignore stale outcomes instead of setting React state.
 */
export function createWritingDiffReceiver() {
  let generation = 0
  let attempted = false
  let edited = false
  return {
    begin(source: string | null): number | null {
      if (source !== WRITING_DIFF_HANDOFF_SOURCE || attempted) return null
      return ++generation
    },
    cancel(ticket: number) { if (ticket === generation) generation++ },
    edit() { edited = true; generation++ },
    receive(ticket: number, storage: ReceiveStorage, apply: (payload: WritingDiffHandoff) => void, now = Date.now()): WritingDiffReceiveResult {
      if (attempted || ticket !== generation) return { ok: false, error: 'stale' }
      attempted = true
      if (edited) return { ok: false, error: 'edited' }
      let raw: string | null
      try { raw = storage.getItem(WRITING_DIFF_HANDOFF_KEY) } catch { return { ok: false, error: 'unavailable' } }
      const parsed = parseWritingDiffHandoff(raw, now)
      if (ticket !== generation) return { ok: false, error: 'stale' }
      if (!parsed.ok) return parsed
      try {
        if (storage.getItem(WRITING_DIFF_HANDOFF_KEY) !== raw) return { ok: false, error: 'changed' }
      } catch { return { ok: false, error: 'unavailable' } }
      if (ticket !== generation) return { ok: false, error: 'stale' }
      try { apply(parsed.payload) } catch { return { ok: false, error: 'applyFailed' } }
      return { ok: true, payload: parsed.payload, cleanup: clearWritingDiffHandoff(storage, raw!) }
    },
  }
}
