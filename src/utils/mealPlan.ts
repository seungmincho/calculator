import { dateNumber, type MealRecord } from './mealHistory.ts'
import { shuffle } from './password.ts'

export const MEAL_PLAN_KEY = 'toolhub:meal-plan'
export const MEAL_PLAN_LIMIT = 90
export const MEAL_PLAN_MENU_LIMIT = 80
export interface MealPlanDay { date: string; menu: string }
type ReadError = 'invalidData' | 'unsupportedVersion' | 'unavailable'
export type MealPlanSnapshot = { status: 'ready'; raw: string | null; entries: MealPlanDay[] } | { status: ReadError }
export type MealPlanError = ReadError | 'conflict' | 'invalidWeek' | 'invalidMenu' | 'invalidChanges' | 'full'
export type MealPlanWriteResult = { ok: true; snapshot: Extract<MealPlanSnapshot, { status: 'ready' }> } | { ok: false; error: MealPlanError }
type PlanStorage = Pick<Storage, 'getItem' | 'setItem'>

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const exactKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
const validMenu = (value: unknown): value is string => typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= MEAL_PLAN_MENU_LIMIT && !/[\u0000-\u001f\u007f]/.test(value)
const menuKey = (value: string) => value.trim().normalize('NFKC').toLowerCase()

/** Use the same explicit 2000–2200 calendar domain as meal history; calendar arithmetic is UTC/DST-safe. */
export function mealPlanWeekDates(start: string): string[] | null {
  const day = dateNumber(start)
  if (day === null) return null
  const dates = Array.from({ length: 7 }, (_, index) => new Date((day + index) * 86400000).toISOString().slice(0, 10))
  return dates.every((date) => dateNumber(date) !== null) ? dates : null
}

export function mealPlanWeek(start: string, entries: MealPlanDay[], draft: Record<string, string> = {}): MealPlanDay[] | null {
  const dates = mealPlanWeekDates(start)
  return dates?.map((date) => ({ date, menu: Object.hasOwn(draft, date) ? draft[date] : entries.find((entry) => entry.date === date)?.menu ?? '' })) ?? null
}

export function fillMealPlanBlanks(week: MealPlanDay[], candidates: string[], randomize: (items: string[]) => string[] = shuffle):
  | { ok: true; changes: MealPlanDay[]; filled: number; remaining: number; skippedCandidates: number }
  | { ok: false; error: 'invalidWeek' | 'invalidMenu' } {
  const dates = mealPlanWeekDates(week[0]?.date ?? '')
  if (week.length !== 7 || !dates || dates.some((date, index) => week[index].date !== date)) return { ok: false, error: 'invalidWeek' }
  if (week.some((entry) => entry.menu.trim() && !validMenu(entry.menu.trim()))) return { ok: false, error: 'invalidMenu' }
  const used = new Set(week.filter((entry) => entry.menu.trim()).map((entry) => menuKey(entry.menu)))
  const available: string[] = []
  let skippedCandidates = 0
  for (const candidate of candidates) {
    const clean = candidate.trim()
    if (!validMenu(clean)) { skippedCandidates++; continue }
    const key = menuKey(clean)
    if (used.has(key)) continue
    used.add(key)
    available.push(clean)
  }
  const choices = randomize(available)
  const blanks = week.filter((entry) => !entry.menu.trim())
  const changes = blanks.slice(0, choices.length).map((entry, index) => ({ date: entry.date, menu: choices[index] }))
  return { ok: true, changes, filled: changes.length, remaining: blanks.length - changes.length, skippedCandidates }
}

export function mealPlanText(week: MealPlanDay[], emptyLabel: string): string {
  return week.map((entry) => `${entry.date}\t${entry.menu.trim() || emptyLabel}`).join('\n')
}

export function mealPlanHistoryState(day: MealPlanDay, today: string, history: Pick<MealRecord, 'name' | 'date'>[]): 'ready' | 'future' | 'duplicate' | 'invalid' {
  if (dateNumber(day.date) === null || dateNumber(today) === null || !validMenu(day.menu.trim())) return 'invalid'
  if (day.date > today) return 'future'
  return history.some((record) => record.date === day.date && record.name === day.menu.trim()) ? 'duplicate' : 'ready'
}

export function parseMealPlan(raw: string | null): MealPlanSnapshot {
  if (raw === null) return { status: 'ready', raw, entries: [] }
  if (raw.length > 100000) return { status: 'invalidData' }
  try {
    const data: unknown = JSON.parse(raw)
    if (!record(data) || !Number.isInteger(data.version)) return { status: 'invalidData' }
    if (data.version !== 1) return { status: 'unsupportedVersion' }
    if (!exactKeys(data, ['version', 'entries']) || !Array.isArray(data.entries) || data.entries.length > MEAL_PLAN_LIMIT) return { status: 'invalidData' }
    const dates = new Set<string>()
    for (const entry of data.entries) {
      if (!record(entry) || !exactKeys(entry, ['date', 'menu']) || typeof entry.date !== 'string' || dateNumber(entry.date) === null || !validMenu(entry.menu) || dates.has(entry.date)) return { status: 'invalidData' }
      dates.add(entry.date)
    }
    return { status: 'ready', raw, entries: data.entries as MealPlanDay[] }
  } catch { return { status: 'invalidData' } }
}

export function readMealPlan(storage?: PlanStorage): MealPlanSnapshot {
  try { return parseMealPlan((storage ?? window.localStorage).getItem(MEAL_PLAN_KEY)) }
  catch { return { status: 'unavailable' } }
}

/** Save only explicitly changed dates; an empty menu removes that date without disturbing other weeks. */
export function writeMealPlanChanges(snapshot: MealPlanSnapshot, changes: MealPlanDay[], storage?: PlanStorage): MealPlanWriteResult {
  if (snapshot.status !== 'ready') return { ok: false, error: snapshot.status }
  try {
    const target = storage ?? window.localStorage
    const current = readMealPlan(target)
    if (current.status !== 'ready') return { ok: false, error: current.status }
    if (current.raw !== snapshot.raw) return { ok: false, error: 'conflict' }
    if (!Array.isArray(changes) || changes.length > MEAL_PLAN_LIMIT || new Set(changes.map((change) => change?.date)).size !== changes.length) return { ok: false, error: 'invalidChanges' }
    const entries = new Map(current.entries.map((entry) => [entry.date, entry.menu]))
    for (const change of changes) {
      if (!record(change) || !exactKeys(change, ['date', 'menu']) || typeof change.date !== 'string' || dateNumber(change.date) === null || typeof change.menu !== 'string') return { ok: false, error: 'invalidChanges' }
      const menu = change.menu.trim()
      if (menu && !validMenu(menu)) return { ok: false, error: 'invalidMenu' }
      if (menu) entries.set(change.date, menu)
      else entries.delete(change.date)
    }
    if (entries.size > MEAL_PLAN_LIMIT) return { ok: false, error: 'full' }
    const next = [...entries].map(([date, menu]) => ({ date, menu })).sort((a, b) => a.date.localeCompare(b.date))
    const raw = JSON.stringify({ version: 1, entries: next })
    target.setItem(MEAL_PLAN_KEY, raw)
    if (target.getItem(MEAL_PLAN_KEY) !== raw) return { ok: false, error: 'conflict' }
    return { ok: true, snapshot: { status: 'ready', raw, entries: next } }
  } catch { return { ok: false, error: 'unavailable' } }
}
