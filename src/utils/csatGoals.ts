import { CUTS, cutsFor, INQ_SOC, INQ_SCI, gradeOf, type CutKey } from './csatGrade.ts'
import { evaluateCsatGradeAreas } from './csatGradeGoalEvaluation.ts'
import { csatScoreSubject, isCsatRawScore, csatScoreStorageError, type CsatScoreField, type CsatScoreSnapshot, type CsatScoreError } from './csatScoreRecords.ts'

export const CSAT_GOALS_KEY = 'toolhub-csat-goals-v1'
export const CSAT_GOAL_LIMIT = 6
export const CSAT_GOAL_NAME_LIMIT = 40
export const CSAT_GOAL_MAX_BYTES = 32 * 1024
export interface CsatGoalCondition { areas: 2 | 3 | 4; maxSum: number }
export interface CsatGoal extends CsatGoalCondition { id: string; name: string; createdAt: string; updatedAt: string }
export interface CsatGoalStore { version: 1; revision: string; goals: CsatGoal[] }
export type CsatGoalRead = { ok: true; raw: string | null; store: CsatGoalStore } | { ok: false; error: CsatScoreError }
export interface CsatGoalArea { id: 'kor' | 'math' | 'eng' | 'inq'; field: CsatScoreField; subject: CutKey; grade: number }
export interface CsatGoalEvaluation {
  status: 'needsInput' | 'within' | 'over' | 'invalidCondition'
  areas: number
  maxSum: number
  sum: number | null
  over: number | null
  available: CsatGoalArea[]
  used: CsatGoalArea[]
  invalidFields: CsatScoreField[]
  inquiryConflict: boolean
  duplicateInquiry: boolean
  singleInquiry: CsatGoalArea | null
}

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const inquirySubjects = new Set<string>([...INQ_SOC, ...INQ_SCI])
const exact = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
const idValid = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value)
const nameValid = (value: unknown): value is string => typeof value === 'string' && value === value.trim() && value.length >= 1 && value.length <= CSAT_GOAL_NAME_LIMIT && !/[\u0000-\u001f\u007f]/.test(value)
const dateValid = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value

export function isCsatGoalCondition(value: unknown): value is CsatGoalCondition {
  return object(value) && [2, 3, 4].includes(value.areas as number) && typeof value.maxSum === 'number' && Number.isInteger(value.maxSum) && value.maxSum >= Number(value.areas) && value.maxSum <= Number(value.areas) * 9
}

/** Same grade engine, with explicit missing/invalid input handling before counting areas. */
export function evaluateCsatGoal(snapshot: CsatScoreSnapshot, condition: { areas: number; maxSum: number }): CsatGoalEvaluation {
  const available: CsatGoalArea[] = [], invalidFields: CsatScoreField[] = []
  const candidate = (field: CsatScoreField, id: CsatGoalArea['id']): CsatGoalArea | null => {
    const raw = snapshot.scores[field]
    if (raw === '') return null
    const subject = csatScoreSubject(field, snapshot)
    const invalidElective = field === 'kor' && !['lm', 'hj'].includes(snapshot.selection.kor)
      || field === 'math' && !['prob', 'calc', 'geo'].includes(snapshot.selection.math)
      || (field === 'inq1' || field === 'inq2') && !inquirySubjects.has(snapshot.selection[field])
    if (invalidElective || !isCsatRawScore(raw, field) || !Object.hasOwn(CUTS, subject)) { invalidFields.push(field); return null }
    return { id, field, subject: subject as CutKey, grade: gradeOf(subject as CutKey, Number(raw), cutsFor(snapshot.referenceYear)) }
  }
  for (const field of ['kor', 'math', 'eng'] as const) { const area = candidate(field, field); if (area) available.push(area) }
  const inquiry = (['inq1', 'inq2'] as const).map(field => candidate(field, 'inq')).filter((value): value is CsatGoalArea => value !== null)
  const duplicateInquiry = inquiry.length > 0 && snapshot.selection.inq1 === snapshot.selection.inq2
  const inquiryConflict = duplicateInquiry && inquiry.length === 2 && Number(snapshot.scores.inq1) !== Number(snapshot.scores.inq2)
  const bestInquiry = inquiryConflict ? null : [...inquiry].sort((a, b) => a.grade - b.grade)[0] ?? null
  if (bestInquiry) available.push(bestInquiry)
  const singleInquiry = bestInquiry && (inquiry.length === 1 || duplicateInquiry) ? bestInquiry : null
  return {
    ...evaluateCsatGradeAreas(available, condition),
    available, invalidFields, inquiryConflict, duplicateInquiry, singleInquiry,
  }
}

export function parseCsatGoals(raw: string | null): CsatGoalRead {
  if (raw === null) return { ok: true, raw, store: { version: 1, revision: 'empty', goals: [] } }
  if (raw.length > CSAT_GOAL_MAX_BYTES || new TextEncoder().encode(raw).length > CSAT_GOAL_MAX_BYTES) return { ok: false, error: 'oversized' }
  try {
    const value: unknown = JSON.parse(raw)
    if (!object(value)) return { ok: false, error: 'corrupt' }
    if (value.version !== 1) return { ok: false, error: value.version === undefined ? 'corrupt' : 'unsupported' }
    if (!exact(value, ['version', 'revision', 'goals']) || !idValid(value.revision) || !Array.isArray(value.goals) || value.goals.length > CSAT_GOAL_LIMIT) return { ok: false, error: 'corrupt' }
    const ids = new Set<string>()
    for (const goal of value.goals) {
      if (!object(goal) || !exact(goal, ['id', 'name', 'areas', 'maxSum', 'createdAt', 'updatedAt']) || !idValid(goal.id) || ids.has(goal.id) || !nameValid(goal.name) || !dateValid(goal.createdAt) || !dateValid(goal.updatedAt) || !isCsatGoalCondition(goal)) return { ok: false, error: 'corrupt' }
      ids.add(goal.id)
    }
    return { ok: true, raw, store: value as unknown as CsatGoalStore }
  } catch { return { ok: false, error: 'corrupt' } }
}

export function readCsatGoals(storage: Pick<Storage, 'getItem'>): CsatGoalRead {
  try { return parseCsatGoals(storage.getItem(CSAT_GOALS_KEY)) }
  catch { return { ok: false, error: 'unavailable' } }
}

export function saveCsatGoal(store: CsatGoalStore, input: { name: string; areas: number; maxSum: number }, id: string, revision: string, now: string, editing = false): CsatGoalStore {
  if (!nameValid(input.name.trim())) throw new Error('name')
  if (!isCsatGoalCondition(input)) throw new Error('invalid')
  const previous = store.goals.find(goal => goal.id === id)
  if (editing && !previous) throw new Error('missing')
  if (!editing && previous) throw new Error('invalid')
  if (!editing && store.goals.length >= CSAT_GOAL_LIMIT) throw new Error('limit')
  const goal: CsatGoal = { id, name: input.name.trim(), areas: input.areas, maxSum: input.maxSum, createdAt: previous?.createdAt ?? now, updatedAt: now }
  const next: CsatGoalStore = { version: 1, revision, goals: editing ? store.goals.map(item => item.id === id ? goal : item) : [...store.goals, goal] }
  if (!parseCsatGoals(JSON.stringify(next)).ok) throw new Error('invalid')
  return next
}

export function deleteCsatGoal(store: CsatGoalStore, id: string, revision: string): CsatGoalStore {
  if (!store.goals.some(goal => goal.id === id)) throw new Error('missing')
  const next: CsatGoalStore = { ...store, revision, goals: store.goals.filter(goal => goal.id !== id) }
  if (!parseCsatGoals(JSON.stringify(next)).ok) throw new Error('invalid')
  return next
}

export function writeCsatGoals(storage: Pick<Storage, 'getItem' | 'setItem'>, expectedRaw: string | null, next: CsatGoalStore): { ok: true; raw: string } | { ok: false; error: CsatScoreError } {
  const previous = parseCsatGoals(expectedRaw)
  if (!previous.ok) return previous
  const raw = JSON.stringify(next)
  if (!parseCsatGoals(raw).ok) return { ok: false, error: 'invalid' }
  try { if (storage.getItem(CSAT_GOALS_KEY) !== expectedRaw) return { ok: false, error: 'conflict' } }
  catch { return { ok: false, error: 'unavailable' } }
  try { storage.setItem(CSAT_GOALS_KEY, raw) }
  catch (cause) { return { ok: false, error: csatScoreStorageError(cause) } }
  try { if (storage.getItem(CSAT_GOALS_KEY) !== raw) return { ok: false, error: 'unverified' } }
  catch { return { ok: false, error: 'unverified' } }
  return { ok: true, raw }
}

export async function withCsatGoalsLock<T>(action: () => T): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) return action()
  return navigator.locks.request(CSAT_GOALS_KEY, { mode: 'exclusive' }, action)
}
