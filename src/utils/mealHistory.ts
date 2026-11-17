export const MEAL_HISTORY_KEY = 'toolhub-meals-v1'
export const MAX_MEAL_RECORDS = 200
export interface MealRecord { id: string; name: string; date: string }
export interface MealHistory { records: MealRecord[]; excludeDays: 0 | 1 | 7 }
export function localDateKey(date = new Date()): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
export function dateNumber(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split('-').map(Number), parsed = new Date(Date.UTC(y, m - 1, d))
  return y >= 2000 && y <= 2200 && parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d ? parsed.getTime() / 86400000 : null
}
export function excludedMeals(records: MealRecord[], today: string, days: number): string[] {
  const now = dateNumber(today)
  if (now === null || days <= 0) return []
  return [...new Set(records.filter(record => { const day = dateNumber(record.date); return day !== null && day <= now && day > now - days }).map(record => record.name))]
}
export function parseMealHistory(raw: string | null): MealHistory {
  if (raw === null) return { records: [], excludeDays: 1 }
  const data = JSON.parse(raw) as MealHistory
  if (!data || ![0, 1, 7].includes(data.excludeDays) || !Array.isArray(data.records) || data.records.length > MAX_MEAL_RECORDS || !data.records.every(record => record && typeof record.id === 'string' && !!record.id && typeof record.name === 'string' && !!record.name.trim() && record.name.length <= 80 && typeof record.date === 'string' && dateNumber(record.date) !== null) || new Set(data.records.map(record => record.id)).size !== data.records.length || new Set(data.records.map(record => JSON.stringify([record.date, record.name]))).size !== data.records.length) throw new Error('invalidMeals')
  return data
}
