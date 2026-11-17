import { DEFAULT_SETTINGS, FONT_SIZES, SETTINGS_KEY, STORAGE_KEY, type Note, type Settings } from './notepad.ts'

export type NotepadError = 'unavailable' | 'corrupt' | 'unsupported' | 'quota' | 'conflict' | 'unconfirmed' | 'cancelled'
export type NotepadRead<T> = { ok: true; raw: string | null; value: T } | { ok: false; raw?: string | null; error: NotepadError }
export type NotepadWrite<T> = { ok: true; raw: string; value: T } | { ok: false; error: NotepadError }
export type NotepadStorage = Pick<Storage, 'getItem' | 'setItem'>
export type NotepadLock = <T>(key: string, action: () => T, signal?: AbortSignal) => Promise<T>
export interface NotepadWritePorts<T> {
  storage: NotepadStorage; lock?: NotepadLock; signal?: AbortSignal; current?: () => boolean
  onConfirmed?: (result: { ok: true; raw: string; value: T }) => void
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const keys = (value: Record<string, unknown>, allowed: readonly string[]) => Object.keys(value).every(key => allowed.includes(key))
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
export const cloneNotepadNotes = (notes: readonly Note[]): Note[] => notes.map(note => ({ ...note }))

/** No new length/count limit: older writers and self-backups had none. Never repair a stored value. */
export function inspectNotepadList(value: unknown): Note[] | null {
  if (!Array.isArray(value)) return null
  const seen = new Set<string>(), notes: Note[] = []
  for (const note of value) {
    if (!object(note) || !keys(note, ['id', 'title', 'content', 'createdAt', 'updatedAt', 'pinned']) || typeof note.id !== 'string' || !note.id || seen.has(note.id)
      || typeof note.title !== 'string' || typeof note.content !== 'string' || !finite(note.createdAt) || !finite(note.updatedAt)
      || ('pinned' in note && typeof note.pinned !== 'boolean')) return null
    seen.add(note.id)
    notes.push({ id: note.id, title: note.title, content: note.content, createdAt: note.createdAt, updatedAt: note.updatedAt, ...('pinned' in note ? { pinned: note.pinned as boolean } : {}) })
  }
  return notes
}
export function inspectStoredNotes(raw: string | null): NotepadRead<Note[]> {
  if (raw === null) return { ok: true, raw, value: [] }
  try {
    const decoded: unknown = JSON.parse(raw), value = inspectNotepadList(decoded)
    return value ? { ok: true, raw, value } : { ok: false, raw, error: object(decoded) ? 'unsupported' : 'corrupt' }
  } catch { return { ok: false, raw, error: 'corrupt' } }
}
export function inspectNotepadSettings(raw: string | null): NotepadRead<Settings> {
  if (raw === null) return { ok: true, raw, value: { ...DEFAULT_SETTINGS } }
  try {
    const value: unknown = JSON.parse(raw)
    if (!object(value) || !keys(value, ['fontSize', 'mono', 'wrap']) || !FONT_SIZES.includes(value.fontSize as number) || typeof value.mono !== 'boolean' || typeof value.wrap !== 'boolean') return { ok: false, raw, error: 'corrupt' }
    return { ok: true, raw, value: { fontSize: value.fontSize as number, mono: value.mono, wrap: value.wrap } }
  } catch { return { ok: false, raw, error: 'corrupt' } }
}
export function notepadStorageError(error: unknown): NotepadError {
  const name = object(error) ? error.name : undefined
  return name === 'QuotaExceededError' ? 'quota' : name === 'AbortError' ? 'cancelled' : 'unavailable'
}
function read<T>(key: string, parser: (raw: string | null) => NotepadRead<T>, storage: Pick<Storage, 'getItem'>): NotepadRead<T> {
  try { return parser(storage.getItem(key)) } catch (error) { return { ok: false, error: notepadStorageError(error) } }
}
export const readNotepad = (storage: Pick<Storage, 'getItem'>) => read(STORAGE_KEY, inspectStoredNotes, storage)
export const readNotepadSettings = (storage: Pick<Storage, 'getItem'>) => read(SETTINGS_KEY, inspectNotepadSettings, storage)
export const withNotepadLock: NotepadLock = async (key, action, signal) => {
  signal?.throwIfAborted()
  if (typeof navigator === 'undefined' || !navigator.locks) return action()
  return navigator.locks.request(key, { mode: 'exclusive', ...(signal ? { signal } : {}) }, action)
}

function checkedWrite<T>(key: string, expectedRaw: string | null, nextRaw: string, parser: (raw: string | null) => NotepadRead<T>, ports: NotepadWritePorts<T>): NotepadWrite<T> {
  const expected = parser(expectedRaw), next = parser(nextRaw)
  if (!expected.ok) return { ok: false, error: expected.error }
  if (!next.ok) return { ok: false, error: next.error }
  const current = () => !ports.signal?.aborted && (ports.current?.() ?? true)
  if (!current()) return { ok: false, error: 'cancelled' }
  try {
    if (ports.storage.getItem(key) !== expectedRaw) return { ok: false, error: 'conflict' }
    if (!current()) return { ok: false, error: 'cancelled' }
    if (nextRaw !== expectedRaw) ports.storage.setItem(key, nextRaw)
  } catch (error) { return { ok: false, error: notepadStorageError(error) } }
  try { if (ports.storage.getItem(key) !== nextRaw) return { ok: false, error: 'unconfirmed' } }
  catch { return { ok: false, error: 'unconfirmed' } }
  const result = { ok: true as const, raw: nextRaw, value: next.value }
  // Advance the owner's basis inside the lock, before its Promise continuation can race another edit.
  ports.onConfirmed?.(result)
  return result
}
/** Call only while owning the notes key lock. There is no await between CAS, write and readback. */
export function writeNotepad(expectedRaw: string | null, notes: readonly Note[], ports: NotepadWritePorts<Note[]>): NotepadWrite<Note[]> {
  const value = inspectNotepadList(notes)
  if (!value) return { ok: false, error: 'corrupt' }
  return checkedWrite(STORAGE_KEY, expectedRaw, JSON.stringify(value), inspectStoredNotes, ports)
}
export async function commitNotepad(expectedRaw: string | null, notes: readonly Note[], ports: NotepadWritePorts<Note[]>): Promise<NotepadWrite<Note[]>> {
  const value = inspectNotepadList(notes)
  if (!value) return { ok: false, error: 'corrupt' }
  try { return await (ports.lock ?? withNotepadLock)(STORAGE_KEY, () => writeNotepad(expectedRaw, value, ports), ports.signal) }
  catch (error) { return { ok: false, error: notepadStorageError(error) } }
}
export async function commitNotepadSettings(expectedRaw: string | null, settings: Settings, ports: NotepadWritePorts<Settings>): Promise<NotepadWrite<Settings>> {
  const raw = JSON.stringify(settings), parsed = inspectNotepadSettings(raw)
  if (!parsed.ok) return { ok: false, error: parsed.error }
  try { return await (ports.lock ?? withNotepadLock)(SETTINGS_KEY, () => checkedWrite(SETTINGS_KEY, expectedRaw, raw, inspectNotepadSettings, ports), ports.signal) }
  catch (error) { return { ok: false, error: notepadStorageError(error) } }
}
