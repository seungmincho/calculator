import {
  FONT_PAIR_PROFILES_KEY, FONT_PAIR_PROFILE_LIMIT, FONT_PAIR_PROFILE_NAME_LIMIT,
  parseFontPairProfiles, readFontPairProfiles, withFontPairProfilesLock,
  type FontPairProfile, type FontPairProfilesSnapshot,
} from './fontPairProfiles.ts'

export const FONT_PAIR_BACKUP_APP = 'toolhub-font-pair-profiles'
export const FONT_PAIR_BACKUP_MAX_BYTES = 64 * 1024
type Ready = Extract<FontPairProfilesSnapshot, { status: 'ready' }>
type ProfileStorage = Pick<Storage, 'getItem' | 'setItem'>
export type FontPairBackupError = 'invalidData' | 'unsupportedVersion' | 'wrongApp' | 'tooLarge' | 'unreadable'
  | 'unavailable' | 'conflict' | 'quota' | 'unknownWrite' | 'emptySelection' | 'invalidSelection' | 'invalidName'
  | 'duplicateName' | 'limit' | 'cancelled'
export interface FontPairBackup {
  readonly app: typeof FONT_PAIR_BACKUP_APP
  readonly version: 1
  readonly exportedAt: string
  readonly profiles: readonly FontPairProfile[]
}
export interface FontPairImportSelection { readonly sourceId: string; readonly name: string }
export interface FontPairImportRowIssue { readonly sourceId: string; readonly error: 'invalidName' | 'duplicateName' }
type Parsed = { ok: true; backup: FontPairBackup } | { ok: false; error: FontPairBackupError }
type SelectionResult = { ok: true; profiles: FontPairProfile[] } | { ok: false; error: FontPairBackupError; rows: FontPairImportRowIssue[] }
export type FontPairImportResult = { ok: true; snapshot: Ready; added: number } | { ok: false; error: FontPairBackupError }

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const exact = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
const nameKey = (name: string) => name.normalize('NFKC').toLowerCase()
const validName = (name: string) => name.length > 0 && name.length <= FONT_PAIR_PROFILE_NAME_LIMIT && !/[\u0000-\u001f\u007f]/.test(name)
const validId = (id: unknown): id is string => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id)
const clone = (profile: FontPairProfile): FontPairProfile => ({ id: profile.id, name: profile.name, styles: { title: { ...profile.styles.title }, body: { ...profile.styles.body } } })

function inspect(value: unknown): Parsed {
  if (!record(value)) return { ok: false, error: 'invalidData' }
  if (value.app !== FONT_PAIR_BACKUP_APP) return { ok: false, error: 'wrongApp' }
  if (!Number.isInteger(value.version)) return { ok: false, error: 'invalidData' }
  if (value.version !== 1) return { ok: false, error: 'unsupportedVersion' }
  if (!exact(value, ['app', 'version', 'exportedAt', 'profiles']) || typeof value.exportedAt !== 'string'
    || !Number.isFinite(Date.parse(value.exportedAt)) || new Date(value.exportedAt).toISOString() !== value.exportedAt) return { ok: false, error: 'invalidData' }
  const parsed = parseFontPairProfiles(JSON.stringify({ version: 1, profiles: value.profiles }))
  if (parsed.status !== 'ready') return { ok: false, error: 'invalidData' }
  const profiles = parsed.profiles.map(profile => {
    const copy = clone(profile)
    Object.freeze(copy.styles.title); Object.freeze(copy.styles.body); Object.freeze(copy.styles)
    return Object.freeze(copy)
  })
  return { ok: true, backup: Object.freeze({ app: FONT_PAIR_BACKUP_APP, version: 1, exportedAt: value.exportedAt, profiles: Object.freeze(profiles) }) }
}

/** File bounds are UTF-8 bytes, independently of the existing local-storage string bound. */
export function parseFontPairBackup(text: string): Parsed {
  if (typeof text !== 'string') return { ok: false, error: 'invalidData' }
  if (text.length > FONT_PAIR_BACKUP_MAX_BYTES || new TextEncoder().encode(text).length > FONT_PAIR_BACKUP_MAX_BYTES) return { ok: false, error: 'tooLarge' }
  try { return inspect(JSON.parse(text.replace(/^\uFEFF/, ''))) }
  catch { return { ok: false, error: 'invalidData' } }
}

/** Serialize the validated storage raw, never a mutable view or current manuscript. */
export function createFontPairBackup(snapshot: FontPairProfilesSnapshot, exportedAt = new Date().toISOString()):
  { ok: true; text: string; count: number } | { ok: false; error: FontPairBackupError } {
  if (snapshot.status !== 'ready') return { ok: false, error: snapshot.status }
  const current = parseFontPairProfiles(snapshot.raw)
  if (current.status !== 'ready') return { ok: false, error: current.status }
  const parsed = inspect({ app: FONT_PAIR_BACKUP_APP, version: 1, exportedAt, profiles: current.profiles })
  if (!parsed.ok) return parsed
  const text = JSON.stringify(parsed.backup, null, 2)
  return new TextEncoder().encode(text).length <= FONT_PAIR_BACKUP_MAX_BYTES
    ? { ok: true, text, count: current.profiles.length } : { ok: false, error: 'tooLarge' }
}

/** Names are editable in the preview. Every selected row must be valid before any write. */
export function inspectFontPairImport(snapshot: FontPairProfilesSnapshot, backup: FontPairBackup, selection: readonly FontPairImportSelection[]): SelectionResult {
  const failure = (error: FontPairBackupError, rows: FontPairImportRowIssue[] = []): SelectionResult => ({ ok: false, error, rows })
  if (snapshot.status !== 'ready') return failure(snapshot.status)
  const current = parseFontPairProfiles(snapshot.raw)
  if (current.status !== 'ready') return failure(current.status)
  let source: Parsed
  try { source = inspect(backup) } catch { return failure('invalidData') }
  if (!source.ok) return failure(source.error)
  if (!Array.isArray(selection) || selection.length > FONT_PAIR_PROFILE_LIMIT) return failure('invalidSelection')
  if (selection.length === 0) return failure('emptySelection')
  const byId = new Map(source.backup.profiles.map(profile => [profile.id, profile]))
  const selectedIds = new Set<string>(), chosen: FontPairProfile[] = []
  for (const item of selection) {
    if (!record(item) || !exact(item, ['sourceId', 'name']) || typeof item.sourceId !== 'string' || typeof item.name !== 'string'
      || !byId.has(item.sourceId) || selectedIds.has(item.sourceId)) return failure('invalidSelection')
    selectedIds.add(item.sourceId)
    chosen.push({ ...clone(byId.get(item.sourceId)!), name: item.name.trim() })
  }
  const names = new Set(current.profiles.map(profile => nameKey(profile.name))), counts = new Map<string, number>()
  for (const profile of chosen) counts.set(nameKey(profile.name), (counts.get(nameKey(profile.name)) ?? 0) + 1)
  const rows: FontPairImportRowIssue[] = []
  for (const profile of chosen) {
    if (!validName(profile.name)) rows.push({ sourceId: profile.id, error: 'invalidName' })
    else if (names.has(nameKey(profile.name)) || counts.get(nameKey(profile.name))! > 1) rows.push({ sourceId: profile.id, error: 'duplicateName' })
  }
  if (rows.length) return failure(rows[0].error, rows)
  if (current.profiles.length + chosen.length > FONT_PAIR_PROFILE_LIMIT) return failure('limit')
  return { ok: true, profiles: chosen }
}

interface ImportPorts {
  storage?: ProfileStorage
  id?: () => string
  isCurrent?: () => boolean
  lock?: <T>(action: () => T) => Promise<T>
  /** Called inside the lock, so a following queued operation sees the confirmed basis. */
  onConfirmed?: (snapshot: Ready) => void
}

/** One atomic append; no replace mode, partial success, hidden deletion, or rollback. */
export async function importFontPairBackup(snapshot: FontPairProfilesSnapshot, backup: FontPairBackup, selection: readonly FontPairImportSelection[], ports: ImportPorts = {}): Promise<FontPairImportResult> {
  // Capture and validate before entering a potentially deferred browser lock.
  let source: Parsed
  try { source = inspect(backup) } catch { return { ok: false, error: 'invalidData' } }
  if (!source.ok) return source
  const capturedBackup = source.backup
  const checked = inspectFontPairImport(snapshot, capturedBackup, selection)
  if (!checked.ok) return { ok: false, error: checked.error }
  if (snapshot.status !== 'ready') return { ok: false, error: snapshot.status }
  const basis = snapshot.raw, captured = checked.profiles.map(clone), reservedSourceIds = capturedBackup.profiles.map(profile => profile.id)
  const active = () => ports.isCurrent?.() ?? true
  try {
    return await (ports.lock ?? withFontPairProfilesLock)((): FontPairImportResult => {
      if (!active()) return { ok: false, error: 'cancelled' }
      const storage = ports.storage ?? window.localStorage
      const current = readFontPairProfiles(storage)
      if (current.status !== 'ready') return { ok: false, error: current.status }
      if (current.raw !== basis) return { ok: false, error: 'conflict' }
      const validation = inspectFontPairImport(current, capturedBackup, captured.map(profile => ({ sourceId: profile.id, name: profile.name })))
      if (!validation.ok) return { ok: false, error: validation.error }
      const ids = new Set([...current.profiles.map(profile => profile.id), ...reservedSourceIds])
      let serial = 0
      const added = captured.map(profile => {
        const proposed = (ports.id ?? (() => crypto.randomUUID()))()
        const base = validId(proposed) ? proposed : 'imported-profile'
        let id = base
        while (ids.has(id)) id = `${base.slice(0, 65)}-${++serial}`
        ids.add(id)
        return { ...clone(profile), id }
      })
      const profiles = [...current.profiles.map(clone), ...added], raw = JSON.stringify({ version: 1, profiles })
      if (!active()) return { ok: false, error: 'cancelled' }
      storage.setItem(FONT_PAIR_PROFILES_KEY, raw)
      // A failing read cannot prove what was saved; never overwrite it with an older snapshot.
      try { if (storage.getItem(FONT_PAIR_PROFILES_KEY) !== raw) return { ok: false, error: 'unknownWrite' } }
      catch { return { ok: false, error: 'unknownWrite' } }
      const confirmed: Ready = { status: 'ready', raw, profiles }
      // A view observer cannot turn an already verified commit into a storage failure.
      try { if (active()) ports.onConfirmed?.(confirmed) } catch { /* The caller still receives the confirmed result. */ }
      return { ok: true, snapshot: confirmed, added: added.length }
    })
  } catch (error) { return { ok: false, error: error instanceof Error && error.name === 'QuotaExceededError' ? 'quota' : 'unavailable' } }
}

export interface FontPairBackupFile { readonly size: number; text(): Promise<string> }
/** A late file completion cannot replace a newer preview, cancelled import, or unmounted view. */
export function createFontPairBackupReader() {
  let generation = 0, alive = true
  return {
    cancel() { generation++ },
    activate() { alive = true },
    dispose() { alive = false; generation++ },
    async read(file: FontPairBackupFile, isCurrent: () => boolean = () => true): Promise<Parsed | null> {
      const request = ++generation, current = () => alive && request === generation && isCurrent()
      if (!current()) return null
      if (!Number.isFinite(file.size) || file.size < 0 || file.size > FONT_PAIR_BACKUP_MAX_BYTES) return { ok: false, error: 'tooLarge' }
      try {
        const text = await file.text()
        return current() ? parseFontPairBackup(text) : null
      } catch { return current() ? { ok: false, error: 'unreadable' } : null }
    },
  }
}
