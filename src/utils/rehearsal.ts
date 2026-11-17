import type { Segment } from './presentationTimer'
export const REHEARSAL_KEY = 'toolhub-rehearsals-v1'
export const MAX_REHEARSALS = 20
export interface RehearsalRecord { id: string; title: string; createdAt: number; segments: Segment[]; actualMs: (number | null)[]; totalMs: number }

/** A boundary is measured by the user. Unvisited segments stay null, never invented from the plan. */
export function measuredSegments(count: number, boundaries: number[], elapsedMs: number): (number | null)[] {
  if (!Number.isInteger(count) || count < 1 || count > 20 || !Number.isFinite(elapsedMs) || elapsedMs < 0 || boundaries.length >= count || boundaries.some((n, i) => !Number.isFinite(n) || n < 0 || n > elapsedMs || (i > 0 && n < boundaries[i - 1]))) throw new Error('invalidTiming')
  const ends = [...boundaries, elapsedMs].map(Math.round)
  return Array.from({ length: count }, (_, i) => i < ends.length ? ends[i] - (ends[i - 1] ?? 0) : null)
}

export function isRehearsal(value: unknown): value is RehearsalRecord {
  if (!value || typeof value !== 'object') return false
  const r = value as RehearsalRecord
  if (typeof r.id !== 'string' || !r.id || typeof r.title !== 'string' || !r.title.trim() || r.title.length > 60 || !Number.isFinite(r.createdAt) || r.createdAt <= 0 || r.createdAt > 8640000000000000) return false
  if (!Array.isArray(r.segments) || !r.segments.length || r.segments.length > 20 || !r.segments.every(s => s && typeof s.name === 'string' && s.name.length <= 30 && Number.isInteger(s.sec) && s.sec >= 30 && s.sec <= 21600) || r.segments.reduce((sum, s) => sum + s.sec, 0) > 21600) return false
  if (!Array.isArray(r.actualMs) || r.actualMs.length !== r.segments.length || !Number.isInteger(r.totalMs) || r.totalMs < 1000 || r.totalMs > 86400000) return false
  let ended = false, sum = 0
  for (const duration of r.actualMs) { if (duration === null) ended = true; else { if (ended || !Number.isInteger(duration) || duration < 0) return false; sum += duration } }
  return sum === r.totalMs
}

export function parseRehearsals(raw: string | null): RehearsalRecord[] {
  if (raw === null) return []
  const records: unknown = JSON.parse(raw)
  if (!Array.isArray(records) || records.length > MAX_REHEARSALS || !records.every(isRehearsal) || new Set(records.map(r => r.id)).size !== records.length) throw new Error('invalidHistory')
  return records
}
export const sameRehearsalPlan = (first: Segment[], second: Segment[]) => JSON.stringify(first) === JSON.stringify(second)
