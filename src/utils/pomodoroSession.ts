export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak'
export interface PomodoroSettings {
  workDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  longBreakInterval: number
  autoStart: boolean
  notificationsEnabled: boolean
  soundEnabled: boolean
  soundVolume: number
}
export interface PomodoroTask {
  id: string
  text: string
  completed: boolean
  estimatedPomodoros: number
  completedPomodoros: number
}
export interface PomodoroClock { wallMs: number; monotonicMs: number }
export interface PomodoroTimerValue {
  phase: PomodoroPhase
  remainingMs: number
  isRunning: boolean
  currentRound: number
  completedRounds: number
  totalWorkSeconds: number
  settings: PomodoroSettings
}
export interface PomodoroSavedTimer extends PomodoroTimerValue {
  format: 'legacy' | 'v1'
  revision: number
  phaseId: string | null
  checkpointAt: number
}
export type PomodoroNotice = 'restoredExpired' | 'clockGapExpired' | 'clockChanged' | 'conflict' | 'unconfirmed' | 'counterLimit' | null
export interface PomodoroRestoredTimer { value: PomodoroTimerValue; notice: PomodoroNotice }

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workDuration: 25, shortBreakDuration: 5, longBreakDuration: 15, longBreakInterval: 4,
  autoStart: false, notificationsEnabled: false, soundEnabled: true, soundVolume: 70,
}
export const POMODORO_SETTING_FIELDS = Object.keys(DEFAULT_POMODORO_SETTINGS)
export const pomodoroObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
export const pomodoroExactFields = (value: Record<string, unknown>, fields: readonly string[]) => Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field))
export const pomodoroInteger = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
export const isPomodoroWallTime = (value: unknown): value is number => pomodoroInteger(value, 0, 8_640_000_000_000_000)
export const isPomodoroPhase = (value: unknown): value is PomodoroPhase => value === 'work' || value === 'shortBreak' || value === 'longBreak'
export const isPomodoroPhaseId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value)

export function isPomodoroSettings(value: unknown): value is PomodoroSettings {
  return pomodoroObject(value) && pomodoroExactFields(value, POMODORO_SETTING_FIELDS)
    && pomodoroInteger(value.workDuration, 1, 120) && pomodoroInteger(value.shortBreakDuration, 1, 30)
    && pomodoroInteger(value.longBreakDuration, 1, 60) && pomodoroInteger(value.longBreakInterval, 2, 10)
    && pomodoroInteger(value.soundVolume, 0, 100) && typeof value.autoStart === 'boolean'
    && typeof value.notificationsEnabled === 'boolean' && typeof value.soundEnabled === 'boolean'
}

export function pomodoroPhaseMs(phase: PomodoroPhase, settings: PomodoroSettings): number {
  return 60_000 * (phase === 'work' ? settings.workDuration : phase === 'shortBreak' ? settings.shortBreakDuration : settings.longBreakDuration)
}

export function clonePomodoroTimer<T extends PomodoroTimerValue>(value: T): T {
  return { ...value, settings: { ...value.settings } }
}

export function initialPomodoroTimer(settings: PomodoroSettings = DEFAULT_POMODORO_SETTINGS): PomodoroTimerValue {
  if (!isPomodoroSettings(settings)) throw new Error('invalidSettings')
  return { phase: 'work', remainingMs: settings.workDuration * 60_000, isRunning: false,
    currentRound: 1, completedRounds: 0, totalWorkSeconds: 0, settings: { ...settings } }
}

export function isPomodoroTimerValue(value: unknown): value is PomodoroTimerValue {
  return pomodoroObject(value) && isPomodoroPhase(value.phase) && isPomodoroSettings(value.settings)
    && typeof value.remainingMs === 'number' && Number.isFinite(value.remainingMs)
    && value.remainingMs >= 0 && value.remainingMs <= pomodoroPhaseMs(value.phase, value.settings)
    && typeof value.isRunning === 'boolean' && pomodoroInteger(value.currentRound, 1)
    && pomodoroInteger(value.completedRounds) && pomodoroInteger(value.totalWorkSeconds)
}

export function validatePomodoroClock(clock: PomodoroClock): void {
  if (!isPomodoroWallTime(clock.wallMs) || !Number.isFinite(clock.monotonicMs) || clock.monotonicMs < 0 || clock.monotonicMs > Number.MAX_SAFE_INTEGER) throw new Error('invalidClock')
}

/** The baseline is fixed while running; tick rounding never becomes an input. */
export function pomodoroRemainingMs(baselineMs: number, startedAt: number, now: number): number {
  if (![baselineMs, startedAt, now].every(Number.isFinite) || baselineMs < 0 || startedAt < 0 || now < startedAt) throw new Error('invalidClock')
  return Math.max(0, baselineMs - (now - startedAt))
}

export const POMODORO_CLOCK_GAP_MS = 2000
/** Disagreement is a safety stop, not a diagnosis of sleep or a changed system clock. */
export function inspectPomodoroProgress(baselineMs: number, startedAt: PomodoroClock, current: PomodoroClock,
  lastRemaining = baselineMs, lastMonotonic = startedAt.monotonicMs): { remainingMs: number; uncertain: boolean } {
  validatePomodoroClock(startedAt)
  const wallElapsed = isPomodoroWallTime(current.wallMs) ? current.wallMs - startedAt.wallMs : null
  const monoElapsed = Number.isFinite(current.monotonicMs) && current.monotonicMs >= lastMonotonic
    ? current.monotonicMs - startedAt.monotonicMs : null
  const uncertain = wallElapsed === null || monoElapsed === null || Math.abs(wallElapsed - monoElapsed) > POMODORO_CLOCK_GAP_MS
  const candidates = [baselineMs, lastRemaining]
  if (monoElapsed !== null) candidates.push(Math.max(0, baselineMs - Math.max(0, monoElapsed)))
  if (uncertain && wallElapsed !== null) candidates.push(Math.max(0, baselineMs - Math.max(0, wallElapsed)))
  return { remainingMs: Math.min(...candidates), uncertain }
}

export const pomodoroDisplaySeconds = (remainingMs: number): number => Math.ceil(Math.max(0, remainingMs) / 1000)

/** New-visit expiry never emits completion. A backwards wall clock pauses without extending time. */
export function restorePomodoroTimer(saved: PomodoroSavedTimer, nowWallMs: number): PomodoroRestoredTimer {
  if (!isPomodoroTimerValue(saved) || !isPomodoroWallTime(saved.checkpointAt) || !isPomodoroWallTime(nowWallMs)) throw new Error('invalidTimer')
  const value: PomodoroTimerValue = {
    phase: saved.phase, remainingMs: saved.remainingMs, isRunning: saved.isRunning,
    currentRound: saved.currentRound, completedRounds: saved.completedRounds,
    totalWorkSeconds: saved.totalWorkSeconds, settings: { ...saved.settings },
  }
  if (value.remainingMs === 0) return { value: { ...value, isRunning: false }, notice: 'restoredExpired' }
  if (!value.isRunning) return { value, notice: null }
  if (nowWallMs < saved.checkpointAt) return { value: { ...value, isRunning: false }, notice: 'clockChanged' }
  value.remainingMs = Math.max(0, value.remainingMs - (nowWallMs - saved.checkpointAt))
  if (value.remainingMs === 0) return { value: { ...value, isRunning: false }, notice: 'restoredExpired' }
  return { value, notice: null }
}

/** Preserves the existing short/long break and round rules; no loop over missed phases. */
export function nextPomodoroPhase(current: PomodoroTimerValue, completed: boolean): PomodoroTimerValue {
  const value = clonePomodoroTimer(current)
  if (value.phase === 'work') {
    if (completed) { value.completedRounds++; value.totalWorkSeconds += value.settings.workDuration * 60 }
    value.phase = completed && value.completedRounds % value.settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak'
  } else {
    value.currentRound = value.phase === 'longBreak' ? 1 : value.currentRound + 1
    value.phase = 'work'
  }
  value.remainingMs = pomodoroPhaseMs(value.phase, value.settings)
  value.isRunning = value.settings.autoStart
  if (!isPomodoroTimerValue(value)) throw new Error('counterLimit')
  return value
}
