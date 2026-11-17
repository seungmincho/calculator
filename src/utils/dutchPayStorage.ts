import { decodeState, encodeState, settle, simpleSplit, UNITS, type State } from './dutchPay.ts'

export const DUTCH_PAY_RECENT_KEY = 'dutchPay.recent'
export const DUTCH_PAY_ACCOUNT_KEY = 'dutchPay.account'
export const DUTCH_PAY_STORAGE_LIMITS = { recent: 512 * 1024, encoded: 64 * 1024, decoded: 48 * 1024, account: 1024, records: 10 } as const
export interface DutchPayRecent { d: string; title: string; total: number; n: number; at: number }
export type DutchPayStorageError = 'unavailable' | 'corrupt' | 'tooLarge' | 'unsupported' | 'unsupportedState' | 'quota' | 'conflict' | 'unconfirmed' | 'cancelled'
export type DutchPayRead<T> = { ok: true; raw: string | null; value: T } | { ok: false; raw?: string | null; error: DutchPayStorageError }
export type DutchPayWrite<T> = { ok: true; raw: string; value: T } | { ok: false; error: DutchPayStorageError }
export type DutchPayStoragePort = Pick<Storage, 'getItem' | 'setItem'>
export type DutchPayLock = <T>(key: string, action: () => T, signal?: AbortSignal) => Promise<T>
export interface DutchPayWritePorts { storage: DutchPayStoragePort; lock?: DutchPayLock; current?: () => boolean; signal?: AbortSignal }

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const keys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).every(key => allowed.includes(key))
const integer = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
const string = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max
const withinBytes = (value: string, max: number) => value.length <= max && new TextEncoder().encode(value).length <= max
const failure = <T>(error: DutchPayStorageError, raw?: string | null): DutchPayRead<T> => ({ ok: false, error, ...(raw !== undefined ? { raw } : {}) })

/** All current writer values, including blank/duplicate names and escaped code units, are supported. */
function isState(value: unknown): value is State {
  if (!object(value) || !keys(value, ['mode', 'title', 'people', 'expenses', 'leader', 'unit', 'dir'])) return false
  if ((value.mode !== 's' && value.mode !== 't') || !string(value.title, 30) || !Array.isArray(value.people) || value.people.length < 1 || value.people.length > 30) return false
  const n = value.people.length
  if (!integer(value.leader, 0, n - 1) || !(UNITS as readonly unknown[]).includes(value.unit) || !['ceil', 'floor', 'round'].includes(value.dir as string)) return false
  if (!value.people.every(person => object(person) && keys(person, ['name', 'weight']) && string(person.name, 20) && typeof person.weight === 'number' && Number.isFinite(person.weight) && person.weight >= 0 && person.weight <= 9.9)) return false
  if (!Array.isArray(value.expenses) || value.expenses.length > 100) return false
  return value.expenses.every(expense => object(expense) && keys(expense, ['name', 'amount', 'payer', 'among']) && string(expense.name, 30) && integer(expense.amount, 0, 1e11) && integer(expense.payer, 0, n - 1) && Array.isArray(expense.among) && expense.among.length <= n && expense.among.every(index => integer(index, 0, n - 1)) && new Set(expense.among).size === expense.among.length)
}

const projectState = (state: State): State => ({ mode: state.mode, title: state.title, leader: state.leader, unit: state.unit, dir: state.dir,
  people: state.people.map(person => ({ name: person.name, weight: person.weight })),
  expenses: state.expenses.map(expense => ({ name: expense.name, amount: expense.amount, payer: expense.payer, among: [...expense.among] })),
})
const totalOf = (state: State) => state.mode === 's'
  ? simpleSplit(state.people, state.expenses, state.leader, state.unit, state.dir).total
  : settle(state.people, state.expenses).total

/** The permissive URL decoder alone is not sufficient to validate a saved record. */
export function decodeDutchPaySavedState(encoded: string): { ok: true; state: State } | { ok: false; error: DutchPayStorageError } {
  if (!withinBytes(encoded, DUTCH_PAY_STORAGE_LIMITS.encoded)) return { ok: false, error: 'tooLarge' }
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return { ok: false, error: 'corrupt' }
  try {
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
    if (binary.length > DUTCH_PAY_STORAGE_LIMITS.decoded) return { ok: false, error: 'tooLarge' }
    const json = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, char => char.charCodeAt(0)))
    const tuple: unknown = JSON.parse(json)
    if (!Array.isArray(tuple)) return { ok: false, error: 'corrupt' }
    if (tuple[0] !== 1) return { ok: false, error: Number.isInteger(tuple[0]) && tuple[0] > 1 ? 'unsupported' : 'corrupt' }
    const state = decodeState(encoded)
    if (tuple.length !== 8 || !state || !isState(state) || encodeState(state) !== encoded) return { ok: false, error: 'corrupt' }
    return { ok: true, state: projectState(state) }
  } catch { return { ok: false, error: 'corrupt' } }
}

export function prepareDutchPayRecent(state: State, at: number): { ok: true; entry: DutchPayRecent } | { ok: false; error: DutchPayStorageError } {
  if (!isState(state) || !integer(at, -8640000000000000, 8640000000000000)) return { ok: false, error: 'unsupportedState' }
  try {
    const original = projectState(state), d = encodeState(original), decoded = decodeDutchPaySavedState(d)
    if (!decoded.ok || JSON.stringify(projectState(decoded.state)) !== JSON.stringify(original)) return { ok: false, error: 'unsupportedState' }
    return { ok: true, entry: { d, title: original.title.trim(), total: totalOf(original), n: original.people.length, at } }
  } catch { return { ok: false, error: 'unsupportedState' } }
}

export function parseDutchPayRecent(raw: string | null): DutchPayRead<DutchPayRecent[]> {
  if (raw === null) return { ok: true, raw, value: [] }
  if (!withinBytes(raw, DUTCH_PAY_STORAGE_LIMITS.recent)) return failure('tooLarge', raw)
  try {
    const entries: unknown = JSON.parse(raw)
    if (!Array.isArray(entries) || entries.length > DUTCH_PAY_STORAGE_LIMITS.records) return failure('corrupt', raw)
    const seen = new Set<string>(), result: DutchPayRecent[] = []
    for (const entry of entries) {
      if (!object(entry) || !keys(entry, ['d', 'title', 'total', 'n', 'at']) || typeof entry.d !== 'string' || !string(entry.title, 30) || !integer(entry.total, 0, 1e13) || !integer(entry.n, 1, 30) || !integer(entry.at, -8640000000000000, 8640000000000000) || seen.has(entry.d)) return failure('corrupt', raw)
      const decoded = decodeDutchPaySavedState(entry.d)
      if (!decoded.ok) return failure(decoded.error, raw)
      if (entry.title !== decoded.state.title.trim() || entry.n !== decoded.state.people.length || entry.total !== totalOf(decoded.state)) return failure('corrupt', raw)
      seen.add(entry.d)
      result.push({ d: entry.d, title: entry.title, total: entry.total, n: entry.n, at: entry.at })
    }
    return { ok: true, raw, value: result }
  } catch { return failure('corrupt', raw) }
}

export function parseDutchPayAccount(raw: string | null): DutchPayRead<string> {
  if (raw === null) return { ok: true, raw, value: '' }
  if (!withinBytes(raw, DUTCH_PAY_STORAGE_LIMITS.account)) return failure('tooLarge', raw)
  try {
    const value: unknown = JSON.parse(raw)
    return string(value, 60) ? { ok: true, raw, value } : failure('corrupt', raw)
  } catch { return failure('corrupt', raw) }
}

function storageError(error: unknown): DutchPayStorageError {
  const name = object(error) ? error.name : undefined
  return name === 'QuotaExceededError' ? 'quota' : name === 'AbortError' ? 'cancelled' : 'unavailable'
}
function read<T>(key: string, parser: (raw: string | null) => DutchPayRead<T>, storage: Pick<Storage, 'getItem'>): DutchPayRead<T> {
  try { return parser(storage.getItem(key)) } catch (error) { return failure(storageError(error)) }
}
export const readDutchPayRecent = (storage: Pick<Storage, 'getItem'>) => read(DUTCH_PAY_RECENT_KEY, parseDutchPayRecent, storage)
export const readDutchPayAccount = (storage: Pick<Storage, 'getItem'>) => read(DUTCH_PAY_ACCOUNT_KEY, parseDutchPayAccount, storage)

/** Synchronous checked write; call inside the key lock. A failed readback never triggers rollback. */
function write<T>(key: string, expectedRaw: string | null, nextRaw: string, parser: (raw: string | null) => DutchPayRead<T>, storage: DutchPayStoragePort, current: () => boolean): DutchPayWrite<T> {
  const expected = parser(expectedRaw), next = parser(nextRaw)
  if (!expected.ok) return { ok: false, error: expected.error }
  if (!next.ok) return { ok: false, error: next.error }
  if (!current()) return { ok: false, error: 'cancelled' }
  try {
    if (storage.getItem(key) !== expectedRaw) return { ok: false, error: 'conflict' }
    if (!current()) return { ok: false, error: 'cancelled' }
    storage.setItem(key, nextRaw)
  } catch (error) { return { ok: false, error: storageError(error) } }
  try { if (storage.getItem(key) !== nextRaw) return { ok: false, error: 'unconfirmed' } }
  catch { return { ok: false, error: 'unconfirmed' } }
  return { ok: true, raw: nextRaw, value: next.value }
}

export const withDutchPayLock: DutchPayLock = async (key, action, signal) => {
  signal?.throwIfAborted()
  if (typeof navigator === 'undefined' || !navigator.locks) return action()
  return navigator.locks.request(key, { mode: 'exclusive', ...(signal ? { signal } : {}) }, action)
}

export type DutchPayRecentOperation = { kind: 'save'; entry: DutchPayRecent } | { kind: 'delete'; d: string }
export async function commitDutchPayRecent(expectedRaw: string | null, operation: DutchPayRecentOperation, ports: DutchPayWritePorts): Promise<DutchPayWrite<DutchPayRecent[]>> {
  const expected = parseDutchPayRecent(expectedRaw)
  if (!expected.ok) return { ok: false, error: expected.error }
  let value: DutchPayRecent[]
  if (operation.kind === 'save') {
    const entry = parseDutchPayRecent(JSON.stringify([operation.entry]))
    if (!entry.ok) return { ok: false, error: entry.error }
    value = [entry.value[0], ...expected.value.filter(record => record.d !== entry.value[0].d)].slice(0, DUTCH_PAY_STORAGE_LIMITS.records)
  } else {
    if (!expected.value.some(record => record.d === operation.d)) return { ok: false, error: 'conflict' }
    value = expected.value.filter(record => record.d !== operation.d)
  }
  const raw = JSON.stringify(value), current = () => !ports.signal?.aborted && (ports.current?.() ?? true)
  try { return await (ports.lock ?? withDutchPayLock)(DUTCH_PAY_RECENT_KEY, () => write(DUTCH_PAY_RECENT_KEY, expectedRaw, raw, parseDutchPayRecent, ports.storage, current), ports.signal) }
  catch (error) { return { ok: false, error: storageError(error) } }
}

export function writeDutchPayAccount(expectedRaw: string | null, value: string, storage: DutchPayStoragePort, current: () => boolean = () => true): DutchPayWrite<string> {
  return write(DUTCH_PAY_ACCOUNT_KEY, expectedRaw, JSON.stringify(value), parseDutchPayAccount, storage, current)
}

export async function commitDutchPayAccount(expectedRaw: string | null, value: string, ports: DutchPayWritePorts): Promise<DutchPayWrite<string>> {
  const current = () => !ports.signal?.aborted && (ports.current?.() ?? true)
  try { return await (ports.lock ?? withDutchPayLock)(DUTCH_PAY_ACCOUNT_KEY, () => writeDutchPayAccount(expectedRaw, value, ports.storage, current), ports.signal) }
  catch (error) { return { ok: false, error: storageError(error) } }
}

export interface DutchPayAccountView { readonly value: string; readonly savedValue: string | null; readonly status: 'idle' | 'dirty' | 'saving' | 'saved' | 'error'; readonly error?: DutchPayStorageError }

/** Latest input wins queued locks. Recheck changes only the confirmed basis, never the current draft. */
export function createDutchPayAccountWriter(ports: { storage: DutchPayStoragePort; lock?: DutchPayLock; onChange?: (view: DutchPayAccountView) => void }) {
  let active = true, initialized = false, edited = false, generation = 0, blocked = false, pending: AbortController | null = null
  let basis: DutchPayRead<string> = failure('unavailable')
  let view: DutchPayAccountView = Object.freeze({ value: '', savedValue: null, status: 'idle' })
  const publish = (next: DutchPayAccountView) => { view = Object.freeze(next); if (active) ports.onChange?.(view) }
  const cancel = () => { generation++; pending?.abort(); pending = null }
  const refresh = (apply: boolean) => {
    if (!active) return view
    cancel(); basis = readDutchPayAccount(ports.storage); blocked = !basis.ok
    if (basis.ok) {
      const value = apply ? basis.value : view.value
      publish({ value, savedValue: basis.value, status: value === basis.value ? 'saved' : 'dirty' })
    } else publish({ ...view, status: 'error', error: basis.error })
    return view
  }
  const persist = async (): Promise<DutchPayWrite<string>> => {
    if (!active) return { ok: false, error: 'cancelled' }
    if (!basis.ok || blocked) return { ok: false, error: basis.ok ? view.error ?? 'conflict' : basis.error }
    cancel()
    const request = generation, controller = new AbortController(), value = view.value, expectedRaw = basis.raw
    pending = controller
    const current = () => active && generation === request && !controller.signal.aborted
    publish({ value, savedValue: view.savedValue, status: 'saving' })
    if (!current()) return { ok: false, error: 'cancelled' }
    let result: DutchPayWrite<string>
    try {
      result = await (ports.lock ?? withDutchPayLock)(DUTCH_PAY_ACCOUNT_KEY, () => {
        const committed = writeDutchPayAccount(expectedRaw, value, ports.storage, current)
        // Advance our own verified basis before Promise/React scheduling can admit the next edit.
        if (committed.ok && current()) basis = { ok: true, raw: committed.raw, value: committed.value }
        return committed
      }, controller.signal)
    } catch (error) { result = { ok: false, error: storageError(error) } }
    if (!current()) return result
    pending = null
    if (result.ok) publish({ value: view.value, savedValue: result.value, status: view.value === result.value ? 'saved' : 'dirty' })
    else if (result.error !== 'cancelled') {
      if (['conflict', 'unconfirmed', 'corrupt', 'tooLarge', 'unsupported'].includes(result.error)) blocked = true
      publish({ ...view, status: 'error', error: result.error })
    }
    return result
  }
  return {
    snapshot: () => view,
    initialize() { if (initialized || !active) return view; initialized = true; return refresh(!edited) },
    recheck() { initialized = true; return refresh(false) },
    async edit(value: string): Promise<DutchPayWrite<string>> {
      if (!active) return { ok: false, error: 'cancelled' }
      if (!string(value, 60)) return { ok: false, error: 'unsupportedState' }
      cancel(); edited = true
      const request = generation
      const error = blocked || !basis.ok ? basis.ok ? view.error ?? 'conflict' : basis.error : undefined
      publish({ value, savedValue: view.savedValue, status: error ? 'error' : 'dirty', ...(error ? { error } : {}) })
      if (generation !== request || !active) return { ok: false, error: 'cancelled' }
      return persist()
    },
    retry: persist,
    externalChange() {
      if (!active) return
      cancel(); blocked = true
      publish({ ...view, status: 'error', error: 'conflict' })
    },
    activate() { active = true; if (view.status === 'saving') publish({ value: view.value, savedValue: view.savedValue, status: 'dirty' }) },
    dispose() { active = false; cancel() },
  }
}
