export const JSONPATH_PRESETS_KEY = 'toolhub-jsonpath-presets-v1'
export const JSONPATH_PRESET_LIMITS = { count: 12, name: 40, expression: 1000 } as const
export interface JsonPathPreset { id: string; name: string; expression: string; updatedAt: string }
export interface JsonPathPresetStore { version: 1; revision: string; presets: JsonPathPreset[] }
export type JsonPathPresetError = 'corrupt' | 'unsupported' | 'unavailable' | 'quota' | 'conflict' | 'invalid' | 'limit' | 'duplicate'
export type JsonPathPresetRead = { ok: true; raw: string | null; store: JsonPathPresetStore } | { ok: false; error: JsonPathPresetError }
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const onlyKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every(key => keys.includes(key))
const label = (value: unknown, max: number): value is string => typeof value === 'string' && !!value.trim() && value === value.trim() && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value)
export const isSavedJsonPathExpression = (value: unknown): boolean => typeof value === 'string' && value.length <= JSONPATH_PRESET_LIMITS.expression && !!value.trim()

export function parseJsonPathPresets(raw: string | null): JsonPathPresetRead {
  if (raw === null) return { ok: true, raw, store: { version: 1, revision: 'empty', presets: [] } }
  try {
    if (raw.length > 100000) return { ok: false, error: 'corrupt' }
    const store: unknown = JSON.parse(raw)
    if (!record(store)) return { ok: false, error: 'corrupt' }
    if (store.version !== 1) return { ok: false, error: store.version === undefined ? 'corrupt' : 'unsupported' }
    if (!onlyKeys(store, ['version', 'revision', 'presets']) || !label(store.revision, 128) || !Array.isArray(store.presets) || store.presets.length > JSONPATH_PRESET_LIMITS.count) return { ok: false, error: 'corrupt' }
    const ids = new Set<string>(), names = new Set<string>()
    for (const preset of store.presets) {
      if (!record(preset) || !onlyKeys(preset, ['id', 'name', 'expression', 'updatedAt']) || !label(preset.id, 128) || !label(preset.name, JSONPATH_PRESET_LIMITS.name) || !isSavedJsonPathExpression(preset.expression)) return { ok: false, error: 'corrupt' }
      if (typeof preset.updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(preset.updatedAt) || !Number.isFinite(Date.parse(preset.updatedAt)) || new Date(preset.updatedAt).toISOString() !== preset.updatedAt) return { ok: false, error: 'corrupt' }
      const name = preset.name.toLocaleLowerCase()
      if (ids.has(preset.id) || names.has(name)) return { ok: false, error: 'corrupt' }
      ids.add(preset.id); names.add(name)
    }
    return { ok: true, raw, store: store as unknown as JsonPathPresetStore }
  } catch { return { ok: false, error: 'corrupt' } }
}

export const jsonPathPresetStorageError = (error: unknown): JsonPathPresetError => error instanceof Error && error.name === 'QuotaExceededError' ? 'quota' : 'unavailable'
export function readJsonPathPresets(storage: Pick<Storage, 'getItem'>): JsonPathPresetRead {
  try { return parseJsonPathPresets(storage.getItem(JSONPATH_PRESETS_KEY)) }
  catch (error) { return { ok: false, error: jsonPathPresetStorageError(error) } }
}

export function addJsonPathPreset(store: JsonPathPresetStore, name: string, expression: string, id: string, updatedAt: string): JsonPathPresetStore {
  const trimmed = name.trim()
  if (!label(trimmed, JSONPATH_PRESET_LIMITS.name) || !isSavedJsonPathExpression(expression)) throw new Error('invalid')
  if (store.presets.length >= JSONPATH_PRESET_LIMITS.count) throw new Error('limit')
  if (store.presets.some(preset => preset.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) throw new Error('duplicate')
  const next: JsonPathPresetStore = { version: 1, revision: id, presets: [...store.presets, { id, name: trimmed, expression, updatedAt }] }
  if (!parseJsonPathPresets(JSON.stringify(next)).ok) throw new Error('invalid')
  return next
}

export function renameJsonPathPreset(store: JsonPathPresetStore, id: string, name: string, revision: string, updatedAt: string): JsonPathPresetStore {
  const trimmed = name.trim()
  if (!label(trimmed, JSONPATH_PRESET_LIMITS.name) || !store.presets.some(preset => preset.id === id)) throw new Error('invalid')
  if (store.presets.some(preset => preset.id !== id && preset.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) throw new Error('duplicate')
  const next: JsonPathPresetStore = { ...store, revision, presets: store.presets.map(preset => preset.id === id ? { ...preset, name: trimmed, updatedAt } : { ...preset }) }
  if (!parseJsonPathPresets(JSON.stringify(next)).ok) throw new Error('invalid')
  return next
}

export function writeJsonPathPresets(storage: StoragePort, expectedRaw: string | null, next: JsonPathPresetStore): { ok: true; raw: string } | { ok: false; error: JsonPathPresetError } {
  const expected = parseJsonPathPresets(expectedRaw)
  if (!expected.ok) return { ok: false, error: expected.error }
  const raw = JSON.stringify(next)
  if (!parseJsonPathPresets(raw).ok) return { ok: false, error: 'invalid' }
  try {
    if (storage.getItem(JSONPATH_PRESETS_KEY) !== expectedRaw) return { ok: false, error: 'conflict' }
    storage.setItem(JSONPATH_PRESETS_KEY, raw)
    if (storage.getItem(JSONPATH_PRESETS_KEY) !== raw) return { ok: false, error: 'conflict' }
    return { ok: true, raw }
  } catch (error) { return { ok: false, error: jsonPathPresetStorageError(error) } }
}

/** Fallback compares raw values and reads writes back; only Web Locks makes cooperating tabs atomic. */
export async function withJsonPathPresetLock<T>(action: () => T): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) return action()
  return navigator.locks.request(JSONPATH_PRESETS_KEY, { mode: 'exclusive' }, action)
}

/** jsonpath-plus 10.3 treats falsy roots as missing; only the exact root selector is supplemented. */
export type JsonPathRoot = null | boolean | number | string | object
export function evaluateSavedJsonPath(value: unknown, expression: string, evaluate: (options: { path: string; json: JsonPathRoot }) => unknown): unknown {
  if (value !== null && typeof value !== 'boolean' && typeof value !== 'number' && typeof value !== 'string' && typeof value !== 'object') throw new Error('unsupportedRoot')
  if (expression.trim() === '$') return [value]
  const result = evaluate({ path: expression, json: value })
  if (result === undefined) throw new Error('unsupportedRoot')
  return result
}
