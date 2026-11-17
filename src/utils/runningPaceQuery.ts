import { parseClock, parseDistance, parsePace, type RunningMode } from './runningPace.ts'
import { copyRunningGoals, parseRunningGoalTime, runningClockFields, type RunningGoalDraft } from './runningPaceComparison.ts'

export const RUNNING_QUERY_KEYS = ['rpV', 'rp'] as const
export const RUNNING_QUERY_LIMIT = 4096
export const RUNNING_URL_LIMIT = 16_384
const PRESETS = [5, 10, 21.0975, 42.195]
export interface RunningDraft {
  preset: number | 'custom'; customDistance: string; mode: RunningMode
  hours: string; minutes: string; seconds: string; paceMinutes: string; paceSeconds: string
  splitKm: 1 | 5; goals: RunningGoalDraft[]
}
export interface RunningNumericSnapshot { distanceKm: number; custom: boolean; mode: RunningMode; valueSeconds: number; splitKm: 1 | 5; goals: number[] }
export function createRunningDraft(): RunningDraft { return { preset: 10, customDistance: '', mode: 'time', hours: '0', minutes: '50', seconds: '0', paceMinutes: '5', paceSeconds: '0', splitKm: 5, goals: [] } }
export function copyRunningDraft(draft: RunningDraft): RunningDraft { return { ...draft, goals: copyRunningGoals(draft.goals) } }
function parseNumeric(value: unknown): RunningNumericSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const item = value as Record<string, unknown>
  if (Object.keys(item).length !== 6 || !['distanceKm', 'custom', 'mode', 'valueSeconds', 'splitKm', 'goals'].every(key => Object.hasOwn(item, key))) return null
  if (typeof item.distanceKm !== 'number' || parseDistance(String(item.distanceKm)) !== item.distanceKm || typeof item.custom !== 'boolean' || (!item.custom && !PRESETS.includes(item.distanceKm))
    || (item.mode !== 'time' && item.mode !== 'pace') || typeof item.valueSeconds !== 'number' || !Number.isInteger(item.valueSeconds) || item.valueSeconds < 1 || item.valueSeconds > (item.mode === 'time' ? 359_999 : 5999)
    || (item.splitKm !== 1 && item.splitKm !== 5) || !Array.isArray(item.goals) || item.goals.length > 3 || !item.goals.every(goal => typeof goal === 'number' && Number.isInteger(goal) && goal > 0 && goal <= 359_999)) return null
  return { distanceKm: item.distanceKm, custom: item.custom, mode: item.mode, valueSeconds: item.valueSeconds, splitKm: item.splitKm, goals: [...item.goals] }
}
export function captureRunningQuery(draft: RunningDraft): RunningNumericSnapshot | null {
  try {
    const goals = copyRunningGoals(draft.goals)
    if ([draft.customDistance, draft.hours, draft.minutes, draft.seconds, draft.paceMinutes, draft.paceSeconds].some(value => typeof value !== 'string')) return null
    const distanceKm = parseDistance(draft.preset === 'custom' ? draft.customDistance : String(draft.preset))
    const valueSeconds = draft.mode === 'time' ? parseClock(draft.hours, draft.minutes, draft.seconds) : draft.mode === 'pace' ? parsePace(draft.paceMinutes, draft.paceSeconds) : null
    return parseNumeric({ distanceKm, custom: draft.preset === 'custom', mode: draft.mode, valueSeconds, splitKm: draft.splitKm, goals: goals.map(parseRunningGoalTime) })
  } catch { return null }
}
function numericToDraft(snapshot: RunningNumericSnapshot): RunningDraft {
  const draft = createRunningDraft()
  draft.preset = snapshot.custom ? 'custom' : snapshot.distanceKm; draft.customDistance = snapshot.custom ? String(snapshot.distanceKm) : ''
  draft.mode = snapshot.mode; draft.splitKm = snapshot.splitKm
  if (snapshot.mode === 'time') Object.assign(draft, runningClockFields(snapshot.valueSeconds))
  else { draft.paceMinutes = String(Math.floor(snapshot.valueSeconds / 60)); draft.paceSeconds = String(snapshot.valueSeconds % 60) }
  draft.goals = snapshot.goals.map((seconds, index) => ({ id: `url-goal-${index + 1}`, ...runningClockFields(seconds) }))
  return draft
}
export type RunningQueryRestore = { kind: 'absent' } | { kind: 'ready'; draft: RunningDraft } | { kind: 'invalid' | 'unsupported' | 'tooLong' }
export function restoreRunningQuery(params: URLSearchParams): RunningQueryRestore {
  if (!params.has('rpV') && !params.has('rp')) return { kind: 'absent' }
  if (params.getAll('rpV').length !== 1 || params.getAll('rp').length !== 1) return { kind: 'invalid' }
  if (params.get('rpV') !== '1') return { kind: 'unsupported' }
  const raw = params.get('rp') ?? ''
  if (raw.length > RUNNING_QUERY_LIMIT || new TextEncoder().encode(raw).byteLength > RUNNING_QUERY_LIMIT) return { kind: 'tooLong' }
  try { const parsed = parseNumeric(JSON.parse(raw)); return parsed ? { kind: 'ready', draft: numericToDraft(parsed) } : { kind: 'invalid' } } catch { return { kind: 'invalid' } }
}
export function updateRunningQuery(href: string, draft: RunningDraft): { kind: 'ready'; href: string; shareUrl: string } | { kind: 'invalid' | 'tooLong'; href: string; shareUrl: null } {
  const clean = new URL(href); for (const key of RUNNING_QUERY_KEYS) clean.searchParams.delete(key)
  const snapshot = captureRunningQuery(draft)
  if (!snapshot) return { kind: 'invalid', href: clean.href, shareUrl: null }
  const url = new URL(clean.href); url.searchParams.set('rpV', '1'); url.searchParams.set('rp', JSON.stringify(snapshot))
  return url.href.length <= RUNNING_URL_LIMIT ? { kind: 'ready', href: url.href, shareUrl: url.href } : { kind: 'tooLong', href: clean.href, shareUrl: null }
}
/** Queue partial user edits until initial query parsing finishes; never write a default URL first. */
export function createRunningInitialOwner() {
  let patch: Partial<RunningDraft> = {}, finished = false
  return {
    edit(value: Partial<RunningDraft>) { if (finished) return false; patch = { ...patch, ...value, ...(value.goals ? { goals: copyRunningGoals(value.goals) } : {}) }; return true },
    finish(restored: RunningQueryRestore): { draft: RunningDraft; edited: boolean; blocked: boolean } | null {
      if (finished) return null; finished = true
      const edited = Object.keys(patch).length > 0, blocked = !edited && restored.kind !== 'absent' && restored.kind !== 'ready'
      return { draft: copyRunningDraft({ ...(restored.kind === 'ready' ? restored.draft : createRunningDraft()), ...patch }), edited, blocked }
    },
  }
}
