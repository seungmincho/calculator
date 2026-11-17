import { calculateRunning, parseClock, parseDistance, type RunningResult } from './runningPace.ts'

export const RUNNING_GOAL_LIMIT = 3
export const RUNNING_CLOCK_MAX = 359_999
export interface RunningGoalDraft { id: string; hours: string; minutes: string; seconds: string }
export type RunningGoalPatch = Partial<Pick<RunningGoalDraft, 'hours' | 'minutes' | 'seconds'>>
export interface RunningGoalRow { id: string; number: number; draft: Readonly<RunningGoalDraft>; finishSeconds: number | null; result: RunningResult | null; deltaSeconds: number | null; shortest: boolean }
export interface RunningComparison { rows: RunningGoalRow[]; validCount: number; distanceValid: boolean; allValid: boolean; splitRows: { distanceKm: number; elapsedSeconds: (number | null)[] }[] }
export interface RunningComparisonSnapshot {
  readonly distanceKm: number; readonly splitKm: 1 | 5
  readonly goals: readonly { readonly number: number; readonly finishSeconds: number; readonly secondsPerKm: number; readonly speedKmh: number }[]
  readonly splits: readonly { readonly distanceKm: number; readonly elapsedSeconds: readonly number[] }[]
}

export function copyRunningGoals(value: unknown): RunningGoalDraft[] {
  if (!Array.isArray(value) || value.length > RUNNING_GOAL_LIMIT) throw new Error('invalidGoals')
  const ids = new Set<string>()
  return value.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.id !== 'string' || !item.id || item.id.length > 100 || ids.has(item.id)
      || !['hours', 'minutes', 'seconds'].every(key => typeof item[key] === 'string')) throw new Error('invalidGoals')
    ids.add(item.id)
    return { id: item.id, hours: item.hours, minutes: item.minutes, seconds: item.seconds }
  })
}
export function runningClockFields(seconds: number): Pick<RunningGoalDraft, 'hours' | 'minutes' | 'seconds'> {
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > RUNNING_CLOCK_MAX) throw new Error('invalidTime')
  return { hours: String(Math.floor(seconds / 3600)), minutes: String(Math.floor(seconds % 3600 / 60)), seconds: String(seconds % 60) }
}
export function currentRunningGoal(result: RunningResult | null): { kind: 'ready'; fields: ReturnType<typeof runningClockFields>; seconds: number } | { kind: 'unavailable' | 'belowOneSecond' | 'aboveClockRange' } {
  if (!result || !Number.isFinite(result.finishSeconds) || result.finishSeconds <= 0) return { kind: 'unavailable' }
  const seconds = Math.round(result.finishSeconds)
  if (seconds < 1) return { kind: 'belowOneSecond' }
  if (seconds > RUNNING_CLOCK_MAX) return { kind: 'aboveClockRange' }
  return { kind: 'ready', fields: runningClockFields(seconds), seconds }
}
export function updateRunningGoal(goals: readonly RunningGoalDraft[], id: string, patch: RunningGoalPatch): RunningGoalDraft[] {
  const fields: RunningGoalPatch = {}
  for (const key of ['hours', 'minutes', 'seconds'] as const) if (patch[key] !== undefined) {
    if (typeof patch[key] !== 'string') throw new Error('invalidTime')
    fields[key] = patch[key]
  }
  return goals.map(goal => goal.id === id ? { ...goal, ...fields } : { ...goal })
}
export function parseRunningGoalTime(goal: RunningGoalDraft): number | null {
  return parseClock(goal.hours, goal.minutes, goal.seconds)
}
export function evaluateRunningGoals(distanceKm: number | null, goals: readonly RunningGoalDraft[], splitKm: 1 | 5): RunningComparison {
  const copied = copyRunningGoals(goals)
  const distanceValid = distanceKm !== null && parseDistance(String(distanceKm)) === distanceKm && (splitKm === 1 || splitKm === 5)
  const rows: RunningGoalRow[] = copied.map((draft, index) => {
    const finishSeconds = parseRunningGoalTime(draft)
    return { id: draft.id, number: index + 1, draft: Object.freeze(draft), finishSeconds, result: distanceValid && finishSeconds !== null ? calculateRunning(distanceKm!, 'time', finishSeconds, splitKm) : null, deltaSeconds: null, shortest: false }
  })
  const valid = rows.filter(row => row.result !== null), shortest = valid.length ? Math.min(...valid.map(row => row.finishSeconds!)) : null
  for (const row of valid) { row.shortest = row.finishSeconds === shortest; row.deltaSeconds = valid.length > 1 ? row.finishSeconds! - shortest! : null }
  const basis = valid[0]?.result
  const splitRows = basis?.splits.map((split, index) => ({ distanceKm: split.distanceKm, elapsedSeconds: rows.map(row => row.result?.splits[index]?.elapsedSeconds ?? null) })) ?? []
  return { rows, validCount: valid.length, distanceValid, allValid: rows.length > 0 && valid.length === rows.length, splitRows }
}
export function captureRunningComparison(distanceKm: number | null, goals: readonly RunningGoalDraft[], splitKm: 1 | 5): RunningComparisonSnapshot | null {
  const comparison = evaluateRunningGoals(distanceKm, goals, splitKm)
  if (!comparison.allValid || distanceKm === null) return null
  return Object.freeze({ distanceKm, splitKm,
    goals: Object.freeze(comparison.rows.map(row => Object.freeze({ number: row.number, finishSeconds: row.finishSeconds!, secondsPerKm: row.result!.secondsPerKm, speedKmh: row.result!.speedKmh }))),
    splits: Object.freeze(comparison.splitRows.map(row => Object.freeze({ distanceKm: row.distanceKm, elapsedSeconds: Object.freeze(row.elapsedSeconds.map(value => value!)) }))),
  })
}
