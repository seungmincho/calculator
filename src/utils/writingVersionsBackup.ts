import {
  parseWritingVersions, WRITING_TOTAL_LIMIT, WRITING_VERSION_LIMIT,
  type WritingVersion,
} from './writingVersions.ts'

export const WRITING_BACKUP_FORMAT = 'toolhub-writing-versions'
export const WRITING_BACKUP_MAX_BYTES = 2 * 1024 * 1024
export type WritingBackupError = 'size' | 'format' | 'version' | 'corrupt' | 'emptySelection' | 'full' | 'totalLimit' | 'id'
export type WritingBackupRead =
  | { ok: true; exportedAt: string; versions: WritingVersion[] }
  | { ok: false; error: WritingBackupError }
export interface WritingImportRow { version: WritingVersion; status: 'new' | 'duplicate' | 'conflict'; selected: boolean }

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const validTimestamp = (value: unknown): value is string => typeof value === 'string'
  && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value

/** Compact JSON lets even 300,000 control characters (six-byte JSON escapes) round-trip below 2 MiB. */
export function createWritingBackup(versions: WritingVersion[], exportedAt = new Date().toISOString()): string {
  if (!validTimestamp(exportedAt)) throw new Error('corrupt')
  const clean = parseWritingVersions(JSON.stringify({ version: 1, versions }))
  const json = JSON.stringify({ format: WRITING_BACKUP_FORMAT, version: 1, exportedAt, versions: clean })
  if (new TextEncoder().encode(json).length > WRITING_BACKUP_MAX_BYTES) throw new Error('size')
  return json
}

export function readWritingBackup(text: string): WritingBackupRead {
  if (text.length > WRITING_BACKUP_MAX_BYTES || new TextEncoder().encode(text).length > WRITING_BACKUP_MAX_BYTES) return { ok: false, error: 'size' }
  try {
    const value: unknown = JSON.parse(text.replace(/^\uFEFF/, ''))
    if (!object(value) || value.format !== WRITING_BACKUP_FORMAT) return { ok: false, error: 'format' }
    if (value.version !== 1) return { ok: false, error: 'version' }
    if (!validTimestamp(value.exportedAt)) return { ok: false, error: 'corrupt' }
    const versions = parseWritingVersions(JSON.stringify({ version: 1, versions: value.versions }))
    return { ok: true, exportedAt: value.exportedAt, versions }
  } catch { return { ok: false, error: 'corrupt' } }
}

/** A conflict copy changes only its ID, so re-importing the same backup still finds its content. */
export function writingVersionContent(version: WritingVersion): string {
  return JSON.stringify([
    version.name, version.title, version.text, version.target, version.basis, version.sourceTab, version.createdAt,
  ])
}

export function previewWritingImport(existing: WritingVersion[], incoming: WritingVersion[]): WritingImportRow[] {
  const ids = new Set(existing.map(version => version.id))
  const contents = new Set(existing.map(writingVersionContent))
  return incoming.map(version => {
    const content = writingVersionContent(version)
    const status = contents.has(content) ? 'duplicate' : ids.has(version.id) ? 'conflict' : 'new'
    contents.add(content)
    return { version, status, selected: status === 'new' }
  })
}

export function prepareWritingImport(
  existing: WritingVersion[], incoming: WritingVersion[], selectedIds: readonly string[], createId: () => string,
): { ok: true; versions: WritingVersion[]; added: number } | { ok: false; error: WritingBackupError } {
  let cleanExisting: WritingVersion[], cleanIncoming: WritingVersion[]
  try {
    cleanExisting = parseWritingVersions(JSON.stringify({ version: 1, versions: existing }))
    cleanIncoming = parseWritingVersions(JSON.stringify({ version: 1, versions: incoming }))
  } catch { return { ok: false, error: 'corrupt' } }
  const selected = new Set(selectedIds)
  const rows = previewWritingImport(cleanExisting, cleanIncoming).filter(row => row.status !== 'duplicate' && selected.has(row.version.id))
  if (!rows.length) return { ok: false, error: 'emptySelection' }
  if (cleanExisting.length + rows.length > WRITING_VERSION_LIMIT) return { ok: false, error: 'full' }
  if ([...cleanExisting, ...rows.map(row => row.version)].reduce((sum, version) => sum + version.text.length, 0) > WRITING_TOTAL_LIMIT) return { ok: false, error: 'totalLimit' }
  const usedIds = new Set([...cleanExisting, ...cleanIncoming].map(version => version.id))
  const additions: WritingVersion[] = []
  for (const row of rows) {
    const version = row.version
    let id = version.id
    if (row.status === 'conflict') {
      let found = false
      for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = createId()
        if (typeof candidate === 'string' && candidate.length > 0 && candidate.length <= 100 && !usedIds.has(candidate)) {
          id = candidate
          found = true
          break
        }
      }
      if (!found) return { ok: false, error: 'id' }
    }
    usedIds.add(id)
    additions.push({ id, name: version.name, title: version.title, text: version.text, target: version.target, basis: version.basis, sourceTab: version.sourceTab, createdAt: version.createdAt })
  }
  return { ok: true, versions: [...additions, ...cleanExisting], added: additions.length }
}
