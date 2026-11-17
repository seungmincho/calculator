export const POMODORO_GOAL_KEY = 'pomodoro-daily-goal.v1'
export const POMODORO_STATS_KEY = 'pomodoro-daily-stats'
export const DEFAULT_POMODORO_GOAL = 4
export const POMODORO_GOAL_MIN = 1
export const POMODORO_GOAL_MAX = 20

export interface PomodoroDailyStat { date: string; count: number; minutes: number }
export type PomodoroStorage = Pick<Storage, 'getItem' | 'setItem'>
export type PomodoroStoreError = 'corrupt' | 'unavailable' | 'conflict' | 'invalid'
export type PomodoroRead<T> = { ok: true; raw: string | null; value: T } | { ok: false; error: PomodoroStoreError }
export type PomodoroWrite = { ok: true; raw: string } | { ok: false; error: PomodoroStoreError }

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const unsignedInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

export function pomodoroLocalDay(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function isPomodoroDate(date: unknown): date is string {
  if (typeof date !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(date)) return false
  const parsed = new Date(`${date}T12:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
}

export function isPomodoroGoal(value: unknown): value is number {
  return unsignedInteger(value) && value >= POMODORO_GOAL_MIN && value <= POMODORO_GOAL_MAX
}

export function parsePomodoroGoal(raw: string | null): number {
  if (raw === null) return DEFAULT_POMODORO_GOAL
  const parsed: unknown = JSON.parse(raw)
  if (!object(parsed) || parsed.version !== 1 || !isPomodoroGoal(parsed.target)) throw new Error('corrupt')
  return parsed.target
}

/** Duplicate days represent accumulated completed sessions; sum them exactly once when reading. */
export function normalizePomodoroStats(value: unknown, today: string): PomodoroDailyStat[] {
  if (!isPomodoroDate(today) || !Array.isArray(value) || value.length > 10_000) throw new Error('corrupt')
  const days = new Map<string, PomodoroDailyStat>()
  for (const row of value) {
    if (!object(row) || !isPomodoroDate(row.date) || row.date > today || !unsignedInteger(row.count) || !unsignedInteger(row.minutes)) throw new Error('corrupt')
    const previous = days.get(row.date)
    const count = (previous?.count ?? 0) + row.count
    const minutes = (previous?.minutes ?? 0) + row.minutes
    if (!Number.isSafeInteger(count) || !Number.isSafeInteger(minutes)) throw new Error('corrupt')
    days.set(row.date, { date: row.date, count, minutes })
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function parsePomodoroStats(raw: string | null, today: string): PomodoroDailyStat[] {
  return normalizePomodoroStats(raw === null ? [] : JSON.parse(raw), today)
}

export function readPomodoroValue<T>(storage: PomodoroStorage, key: string, parse: (raw: string | null) => T): PomodoroRead<T> {
  let raw: string | null
  try { raw = storage.getItem(key) } catch { return { ok: false, error: 'unavailable' } }
  try { return { ok: true, raw, value: parse(raw) } } catch { return { ok: false, error: 'corrupt' } }
}

function writeValue(storage: PomodoroStorage, key: string, expectedRaw: string | null, raw: string, validate: (raw: string | null) => unknown): PomodoroWrite {
  try {
    if (storage.getItem(key) !== expectedRaw) return { ok: false, error: 'conflict' }
    try { validate(expectedRaw); validate(raw) } catch { return { ok: false, error: 'corrupt' } }
    storage.setItem(key, raw)
    if (storage.getItem(key) !== raw) return { ok: false, error: 'conflict' }
    return { ok: true, raw }
  } catch { return { ok: false, error: 'unavailable' } }
}

export function savePomodoroGoal(storage: PomodoroStorage, expectedRaw: string | null, target: number): PomodoroWrite {
  if (!isPomodoroGoal(target)) return { ok: false, error: 'invalid' }
  return writeValue(storage, POMODORO_GOAL_KEY, expectedRaw, JSON.stringify({ version: 1, target }), parsePomodoroGoal)
}

export function savePomodoroStats(storage: PomodoroStorage, expectedRaw: string | null, stats: PomodoroDailyStat[], today: string): PomodoroWrite {
  let normalized: PomodoroDailyStat[]
  try { normalized = normalizePomodoroStats(stats, today) } catch { return { ok: false, error: 'invalid' } }
  return writeValue(storage, POMODORO_STATS_KEY, expectedRaw, JSON.stringify(normalized), raw => parsePomodoroStats(raw, today))
}

export async function withPomodoroLock<T>(key: string, action: () => T | Promise<T>, locks: Pick<LockManager, 'request'> | undefined = globalThis.navigator?.locks): Promise<T> {
  return locks?.request ? locks.request(key, action) : action()
}

/** Seven local calendar days ending today, including zero-activity days. No task text is accepted. */
export function recentPomodoroDays(stats: PomodoroDailyStat[], today: string): PomodoroDailyStat[] {
  const normalized = normalizePomodoroStats(stats, today)
  const days = new Map(normalized.map(row => [row.date, row]))
  const [year, month, day] = today.split('-').map(Number)
  return Array.from({ length: 7 }, (_, index) => {
    const date = pomodoroLocalDay(new Date(year, month - 1, day - 6 + index, 12))
    return days.get(date) ?? { date, count: 0, minutes: 0 }
  })
}

export function pomodoroStatsCsv(stats: PomodoroDailyStat[], today: string, headers: [string, string, string]): string {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
  const rows = [headers, ...recentPomodoroDays(stats, today).map(row => [row.date, row.count, row.minutes])]
  return '\uFEFF' + rows.map(row => row.map(escape).join(',')).join('\r\n') + '\r\n'
}
