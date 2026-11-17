import type { Basis } from './charCount'

export const WRITING_VERSIONS_KEY = 'characterCounter.writingVersions.v1'
export const WRITING_DRAFT_KEY = 'characterCounter.v2'
export const WRITING_VERSION_LIMIT = 20
export const WRITING_TITLE_LIMIT = 40
export const WRITING_TEXT_LIMIT = 50_000
export const WRITING_TOTAL_LIMIT = 300_000

export interface WritingDraft { title: string; text: string; target: number; basis: Basis }
export interface WritingVersion extends WritingDraft {
  id: string
  name: string
  sourceTab: number
  createdAt: string
}
export type WritingStorage = Pick<Storage, 'getItem' | 'setItem'>
export type WritingError = 'corrupt' | 'unavailable' | 'conflict' | 'full' | 'empty' | 'title' | 'textLimit' | 'totalLimit'
export type WritingRead = { ok: true; raw: string | null; versions: WritingVersion[] } | { ok: false; error: WritingError }
export type WritingWrite = { ok: true; raw: string; versions: WritingVersion[] } | { ok: false; error: WritingError }

/** Web Locks serialize writes across tabs. Older browsers retain compare/write/read-back protection. */
export async function withWritingStorageLock<T>(key: string, action: () => T | Promise<T>, locks: Pick<LockManager, 'request'> | undefined = globalThis.navigator?.locks): Promise<T> {
  if (!locks?.request) return action()
  return locks.request(key, action)
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const basis = (value: unknown): value is Basis => ['chars', 'charsNoSpace', 'bytesKr', 'x'].includes(value as string)

export function isWritingDraft(value: unknown): value is WritingDraft {
  return record(value) && typeof value.title === 'string' && value.title.length <= WRITING_TITLE_LIMIT
    && typeof value.text === 'string' && typeof value.target === 'number'
    && Number.isSafeInteger(value.target) && value.target >= 0 && basis(value.basis)
}

/** Keep the original draft key and never turn malformed data into an empty, saveable draft. */
export function parseWritingDraft(raw: string | null): { tabs: WritingDraft[]; active: number } | null {
  if (raw === null) return null
  const value: unknown = JSON.parse(raw)
  if (!record(value) || !Array.isArray(value.tabs) || value.tabs.length !== 5 || !value.tabs.every(isWritingDraft)
    || typeof value.active !== 'number' || !Number.isInteger(value.active) || value.active < 0 || value.active > 4) {
    throw new Error('corrupt')
  }
  return { tabs: value.tabs.map(({ title, text, target, basis }) => ({ title, text, target, basis })), active: value.active }
}

function isWritingVersion(value: unknown): value is WritingVersion {
  return isWritingDraft(value) && record(value) && typeof value.id === 'string' && value.id.length > 0 && value.id.length <= 100
    && typeof value.name === 'string' && value.name.trim().length > 0 && value.name.length <= WRITING_TITLE_LIMIT
    && value.text.trim().length > 0 && value.text.length <= WRITING_TEXT_LIMIT
    && typeof value.sourceTab === 'number' && Number.isInteger(value.sourceTab) && value.sourceTab >= 1 && value.sourceTab <= 5
    && typeof value.createdAt === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value.createdAt)
    && Number.isFinite(Date.parse(value.createdAt)) && new Date(value.createdAt).toISOString() === value.createdAt
}

export function parseWritingVersions(raw: string | null): WritingVersion[] {
  if (raw === null) return []
  const value: unknown = JSON.parse(raw)
  if (!record(value) || value.version !== 1 || !Array.isArray(value.versions) || value.versions.length > WRITING_VERSION_LIMIT
    || !value.versions.every(isWritingVersion) || new Set(value.versions.map(item => item.id)).size !== value.versions.length
    || value.versions.reduce((sum, item) => sum + item.text.length, 0) > WRITING_TOTAL_LIMIT) throw new Error('corrupt')
  return value.versions.map(({ id, name, sourceTab, createdAt, title, text, target, basis }) => ({ id, name, sourceTab, createdAt, title, text, target, basis }))
}

export function readWritingVersions(storage: WritingStorage): WritingRead {
  let raw: string | null
  try { raw = storage.getItem(WRITING_VERSIONS_KEY) } catch { return { ok: false, error: 'unavailable' } }
  try { return { ok: true, raw, versions: parseWritingVersions(raw) } } catch { return { ok: false, error: 'corrupt' } }
}

/** Compare the exact value read by this tab immediately before writing. Errors leave storage unchanged. */
export function writeWritingVersions(storage: WritingStorage, expectedRaw: string | null, versions: WritingVersion[]): WritingWrite {
  try {
    if (storage.getItem(WRITING_VERSIONS_KEY) !== expectedRaw) return { ok: false, error: 'conflict' }
    try { parseWritingVersions(expectedRaw) } catch { return { ok: false, error: 'corrupt' } }
    const raw = JSON.stringify({ version: 1, versions })
    try { parseWritingVersions(raw) } catch { return { ok: false, error: 'corrupt' } }
    storage.setItem(WRITING_VERSIONS_KEY, raw)
    if (storage.getItem(WRITING_VERSIONS_KEY) !== raw) return { ok: false, error: 'conflict' }
    return { ok: true, raw, versions }
  } catch { return { ok: false, error: 'unavailable' } }
}

export function addWritingVersion(storage: WritingStorage, expectedRaw: string | null, versions: WritingVersion[], candidate: WritingVersion): WritingWrite {
  if (!candidate.text.trim()) return { ok: false, error: 'empty' }
  if (!candidate.name.trim() || candidate.name.length > WRITING_TITLE_LIMIT) return { ok: false, error: 'title' }
  if (candidate.text.length > WRITING_TEXT_LIMIT) return { ok: false, error: 'textLimit' }
  if (versions.length >= WRITING_VERSION_LIMIT) return { ok: false, error: 'full' }
  if (versions.reduce((sum, item) => sum + item.text.length, 0) + candidate.text.length > WRITING_TOTAL_LIMIT) return { ok: false, error: 'totalLimit' }
  return writeWritingVersions(storage, expectedRaw, [{ ...candidate, name: candidate.name.trim() }, ...versions])
}

export function draftFromWritingVersion(version: WritingVersion): WritingDraft {
  return { title: version.title, text: version.text, target: version.target, basis: version.basis }
}
