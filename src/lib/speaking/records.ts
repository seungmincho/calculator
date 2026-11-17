import { isSpeakingSession, type SpeakingMode, type SpeakingSession } from './core.ts'

export const MAX_SPEAKING_TITLE = 40

/** Optional fields extend the existing v1 document without rewriting old records. */
export type SpeakingRecord = SpeakingSession & { title?: string; revision?: string }
export type SpeakingStoredBasis =
  | { kind: 'absent' }
  | { kind: 'legacy'; updatedAt: number }
  | { kind: 'revision'; revision: string; updatedAt: number }
export type SpeakingStoredRecord = { session: SpeakingRecord; basis: SpeakingStoredBasis }
export type SpeakingRecordList = {
  records: SpeakingStoredRecord[]
  unreadableCount: number
  unsupportedCount: number
  totalCount: number
}
export type SpeakingRecordFilter = 'all' | SpeakingMode

const validDate = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 8640000000000000
const hasControl = (value: string) => [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
const validRevision = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 128 && value.trim() === value && !hasControl(value)

export function isSpeakingTitle(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_SPEAKING_TITLE && !hasControl(value)
}

export function isSpeakingRecord(value: unknown): value is SpeakingRecord {
  if (!isSpeakingSession(value)) return false
  const record = value as SpeakingRecord
  return (record.title === undefined || isSpeakingTitle(record.title)) &&
    (record.revision === undefined || validRevision(record.revision))
}

export function isSpeakingStoredBasis(value: unknown): value is SpeakingStoredBasis {
  if (!value || typeof value !== 'object') return false
  const basis = value as Record<string, unknown>
  return basis.kind === 'absent' || (validDate(basis.updatedAt) &&
    (basis.kind === 'legacy' || (basis.kind === 'revision' && validRevision(basis.revision))))
}

export function captureSpeakingBasis(record: SpeakingRecord): SpeakingStoredBasis {
  return record.revision === undefined
    ? { kind: 'legacy', updatedAt: record.updatedAt }
    : { kind: 'revision', revision: record.revision, updatedAt: record.updatedAt }
}

/** Compare the stored value, never the draft's edited updatedAt. */
export function matchesSpeakingBasis(current: unknown, expected: SpeakingStoredBasis): boolean {
  if (expected.kind === 'absent') return current === undefined
  if (!isSpeakingRecord(current) || current.updatedAt !== expected.updatedAt) return false
  return expected.kind === 'legacy'
    ? current.revision === undefined
    : current.revision === expected.revision
}

export function speakingRecordStatus(value: unknown): 'valid' | 'unreadable' | 'unsupported' {
  if (value && typeof value === 'object') {
    const version = (value as { version?: unknown }).version
    if (typeof version === 'number' && Number.isInteger(version) && version > 1) return 'unsupported'
  }
  return isSpeakingRecord(value) ? 'valid' : 'unreadable'
}

/** Reading is deliberately non-mutating: no title/revision migration here. */
export function inspectSpeakingRecords(values: readonly unknown[]): SpeakingRecordList {
  const result: SpeakingRecordList = { records: [], unreadableCount: 0, unsupportedCount: 0, totalCount: values.length }
  for (const value of values) {
    const status = speakingRecordStatus(value)
    if (status === 'valid') {
      const session = value as SpeakingRecord
      result.records.push({ session, basis: captureSpeakingBasis(session) })
    } else if (status === 'unsupported') result.unsupportedCount++
    else result.unreadableCount++
  }
  result.records.sort((a, b) => b.session.updatedAt - a.session.updatedAt)
  return result
}

const searchText = (value: string) => value.normalize('NFKC').toLowerCase().trim().replace(/\s+/gu, ' ')

export function filterSpeakingRecords(records: readonly SpeakingStoredRecord[], query: string, mode: SpeakingRecordFilter): SpeakingStoredRecord[] {
  const needle = searchText(query)
  return records.filter(({ session }) => (mode === 'all' || session.mode === mode) &&
    (!needle || [session.title ?? '', ...session.takes.map(take => take.transcript)].some(text => searchText(text).includes(needle))))
}

/** Snapshot before opening IDB so later draft edits cannot change a pending save. */
export function prepareSpeakingRecord(session: SpeakingRecord, revision: string, now: number): SpeakingRecord {
  if (!isSpeakingRecord(session) || !validRevision(revision) || revision === session.revision || !validDate(now)) throw new Error('storageFailed')
  const snapshot = structuredClone(session)
  const title = snapshot.title?.trim()
  if (title) snapshot.title = title
  else delete snapshot.title
  snapshot.revision = revision
  snapshot.updatedAt = Math.max(now, session.updatedAt, session.createdAt)
  return snapshot
}
