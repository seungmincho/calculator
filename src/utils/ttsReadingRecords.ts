import { chunkText, pickVoice, type Segment, type VoiceLike } from './tts.ts'
import { canRetryTtsRecovery, type TtsRecovery, type TtsRecoveryContext } from './ttsRecovery.ts'

export const TTS_READING_KEY = 'toolhub-tts-reading-list-v1'
export const TTS_READING_LIMITS = { records: 8, text: 30_000, name: 40, voiceName: 512, positionText: 140, rawBytes: 2 * 1024 * 1024 } as const
export interface TtsReadingSettings { voiceName: string | null; rate: number; pitch: number; volume: number; localVoicesOnly: boolean }
export interface TtsReadingPosition extends Segment { index: number }
export interface TtsReadingDraft { text: string; position: TtsReadingPosition; settings: TtsReadingSettings }
export interface TtsReadingRecord extends TtsReadingDraft { id: string; name: string; createdAt: number }
export interface TtsReadingSnapshot { raw: string | null; revision: string | null; records: TtsReadingRecord[] }
export type TtsReadingError = 'corrupt' | 'unsupported' | 'tooLarge' | 'unavailable' | 'conflict' | 'writeUnknown' | 'quota' | 'canceled' | 'invalidName' | 'duplicateName' | 'limit' | 'textTooLong' | 'noSentences' | 'invalidPosition' | 'invalidSettings' | 'voiceTooLong' | 'notFound' | 'invalidAction'
export type TtsReadingResult<T> = { ok: true; value: T } | { ok: false; error: TtsReadingError }
export type TtsReadingRead = { ok: true; snapshot: TtsReadingSnapshot } | { ok: false; error: TtsReadingError; raw?: string | null }
export type TtsReadingAction = { kind: 'add'; record: TtsReadingRecord } | { kind: 'delete'; id: string }
export interface TtsReadingLoad { record: TtsReadingRecord; segments: Segment[]; index: number | null; positionMatched: boolean }
export type TtsReadingStorage = Pick<Storage, 'getItem' | 'setItem'>
export interface TtsReadingPorts { storage?: TtsReadingStorage; current?: () => boolean; signal?: AbortSignal; lock?: <T>(action: () => T, signal?: AbortSignal) => Promise<T> }

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const exact = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value)
const nameValid = (value: unknown): value is string => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= TTS_READING_LIMITS.name
const nameKey = (name: string) => name.normalize('NFKC').toLowerCase()
const finite = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
const withinRaw = (raw: string) => raw.length <= TTS_READING_LIMITS.rawBytes && new TextEncoder().encode(raw).length <= TTS_READING_LIMITS.rawBytes
const failure = (error: TtsReadingError): { ok: false; error: TtsReadingError } => ({ ok: false, error })
const cloneRecord = (record: TtsReadingRecord): TtsReadingRecord => ({ ...record, position: { ...record.position }, settings: { ...record.settings } })

export function validTtsReadingSettings(value: unknown): value is TtsReadingSettings {
  return object(value) && exact(value, ['voiceName', 'rate', 'pitch', 'volume', 'localVoicesOnly'])
    && (value.voiceName === null || typeof value.voiceName === 'string' && value.voiceName.length > 0 && value.voiceName.length <= TTS_READING_LIMITS.voiceName)
    && finite(value.rate, 0.5, 2) && finite(value.pitch, 0.5, 2) && finite(value.volume, 0, 1) && typeof value.localVoicesOnly === 'boolean'
}
function validPosition(value: unknown, text: string): value is TtsReadingPosition {
  return object(value) && exact(value, ['index', 'start', 'end', 'text'])
    && typeof value.index === 'number' && Number.isInteger(value.index) && value.index >= 0 && value.index < TTS_READING_LIMITS.text
    && typeof value.start === 'number' && Number.isInteger(value.start) && value.start >= 0
    && typeof value.end === 'number' && Number.isInteger(value.end) && value.end > value.start && value.end <= text.length
    && typeof value.text === 'string' && value.text.length <= TTS_READING_LIMITS.positionText && value.text.trim().length > 0 && text.slice(value.start, value.end) === value.text
}
function validRecord(value: unknown): value is TtsReadingRecord {
  return object(value) && exact(value, ['id', 'name', 'text', 'createdAt', 'position', 'settings']) && identifier(value.id) && nameValid(value.name)
    && typeof value.text === 'string' && value.text.trim().length > 0 && value.text.length <= TTS_READING_LIMITS.text
    && typeof value.createdAt === 'number' && Number.isSafeInteger(value.createdAt) && value.createdAt >= 0 && value.createdAt <= 8_640_000_000_000_000
    && validPosition(value.position, value.text) && validTtsReadingSettings(value.settings)
}
/** JSON.parse owns syntax; this scan only rejects duplicate decoded property names. */
function duplicateKeys(raw: string): boolean {
  const stack: (Set<string> | null)[] = []
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i]
    if (char === '{') stack.push(new Set())
    else if (char === '[') stack.push(null)
    else if (char === '}' || char === ']') stack.pop()
    else if (char === '"') {
      const start = i++
      for (; i < raw.length; i++) { if (raw[i] === '\\') i++; else if (raw[i] === '"') break }
      let next = i + 1
      while (next < raw.length && /\s/.test(raw[next])) next++
      if (raw[next] === ':') { const key: string = JSON.parse(raw.slice(start, i + 1)), keys = stack.at(-1); if (keys?.has(key)) return true; keys?.add(key) }
    }
  }
  return false
}
export function parseTtsReadingRecords(raw: string | null): TtsReadingRead {
  if (raw === null) return { ok: true, snapshot: { raw, revision: null, records: [] } }
  if (!withinRaw(raw)) return { ...failure('tooLarge'), raw }
  try {
    const data: unknown = JSON.parse(raw)
    if (duplicateKeys(raw) || !object(data) || !Number.isInteger(data.version)) return { ...failure('corrupt'), raw }
    if (data.version !== 1 || Object.keys(data).some(key => !['version', 'revision', 'records'].includes(key))) return { ...failure('unsupported'), raw }
    if (!exact(data, ['version', 'revision', 'records']) || !identifier(data.revision) || !Array.isArray(data.records) || data.records.length > TTS_READING_LIMITS.records) return { ...failure('corrupt'), raw }
    const ids = new Set<string>(), names = new Set<string>()
    for (const item of data.records) {
      if (object(item) && (Object.keys(item).some(key => !['id', 'name', 'text', 'createdAt', 'position', 'settings'].includes(key)) || object(item.settings) && Object.keys(item.settings).some(key => !['voiceName', 'rate', 'pitch', 'volume', 'localVoicesOnly'].includes(key)) || object(item.position) && Object.keys(item.position).some(key => !['index', 'start', 'end', 'text'].includes(key)))) return { ...failure('unsupported'), raw }
      if (!validRecord(item) || ids.has(item.id) || names.has(nameKey(item.name))) return { ...failure('corrupt'), raw }
      ids.add(item.id); names.add(nameKey(item.name))
    }
    return { ok: true, snapshot: { raw, revision: data.revision, records: data.records as TtsReadingRecord[] } }
  } catch { return { ...failure('corrupt'), raw } }
}
export function readTtsReadingRecords(storage?: TtsReadingStorage): TtsReadingRead {
  try { return parseTtsReadingRecords((storage ?? window.localStorage).getItem(TTS_READING_KEY)) } catch { return failure('unavailable') }
}

export function resolveTtsReadingPosition(text: string, position: TtsReadingPosition): { segments: Segment[]; index: number | null; positionMatched: boolean } {
  const segments = chunkText(text), found = segments[position.index]
  const positionMatched = validPosition(position, text) && !!found && found.start === position.start && found.end === position.end && found.text === position.text
  return { segments, index: positionMatched ? position.index : segments.length ? 0 : null, positionMatched }
}
export function captureTtsReadingPosition(text: string, context: { status: 'stopped' | 'speaking' | 'paused'; currentIndex: number; startFrom: number; recovery: TtsRecovery | null; recoveryContext?: TtsRecoveryContext }): TtsReadingResult<TtsReadingPosition> {
  if (text.length > TTS_READING_LIMITS.text) return failure('textTooLong')
  const segments = chunkText(text)
  if (!segments.length) return failure('noSentences')
  const failed = context.recovery, recoveryValid = !!context.recoveryContext && context.recoveryContext.text === text && canRetryTtsRecovery(failed, context.recoveryContext)
  const index = recoveryValid && failed ? failed.sentenceIndex : context.status !== 'stopped' ? context.currentIndex : context.startFrom
  if (!Number.isInteger(index) || index < 0 || index >= segments.length) return failure('invalidPosition')
  const position = { index, ...segments[index] }
  if (recoveryValid && failed && (failed.sentence.start !== position.start || failed.sentence.end !== position.end || failed.sentence.text !== position.text)) return failure('invalidPosition')
  return { ok: true, value: position }
}
export function createTtsReadingRecord(draft: TtsReadingDraft, id: string, name: string, now: number): TtsReadingResult<TtsReadingRecord> {
  if (typeof name !== 'string' || !nameValid(name.trim())) return failure('invalidName')
  if (!object(draft) || typeof draft.text !== 'string') return failure('invalidAction')
  if (draft.text.length > TTS_READING_LIMITS.text) return failure('textTooLong')
  if (object(draft.settings) && typeof draft.settings.voiceName === 'string' && draft.settings.voiceName.length > TTS_READING_LIMITS.voiceName) return failure('voiceTooLong')
  if (!validTtsReadingSettings(draft.settings)) return failure('invalidSettings')
  if (!validPosition(draft.position, draft.text)) return failure('invalidPosition')
  const resolved = resolveTtsReadingPosition(draft.text, draft.position)
  if (!resolved.segments.length) return failure('noSentences')
  if (!resolved.positionMatched) return failure('invalidPosition')
  const value: TtsReadingRecord = { id, name: name.trim(), text: draft.text, createdAt: now, position: { ...draft.position }, settings: { ...draft.settings } }
  return validRecord(value) ? { ok: true, value } : failure('invalidAction')
}
export function resolveTtsReadingVoice<T extends VoiceLike>(settings: TtsReadingSettings, voices: T[]): { voice: T | null; missing: boolean; playAllowed: boolean } {
  const allowed = settings.localVoicesOnly ? voices.filter(voice => voice.localService === true) : voices
  const voice = pickVoice(allowed, settings.voiceName)
  return { voice, missing: settings.voiceName !== null && !allowed.some(item => item.name === settings.voiceName), playAllowed: !settings.localVoicesOnly || voice !== null }
}
const current = (ports: TtsReadingPorts) => !ports.signal?.aborted && (ports.current?.() ?? true)
const storageError = (error: unknown): TtsReadingError => error instanceof Error && error.name === 'AbortError' ? 'canceled' : error instanceof Error && error.name === 'QuotaExceededError' ? 'quota' : 'unavailable'
const defaultLock = <T>(action: () => T, signal?: AbortSignal): Promise<T> => typeof navigator !== 'undefined' && navigator.locks
  ? navigator.locks.request(TTS_READING_KEY, { mode: 'exclusive', ...(signal ? { signal } : {}) }, action) : Promise.resolve().then(action)

export async function writeTtsReadingAction(snapshot: TtsReadingSnapshot, action: TtsReadingAction, revision: string, ports: TtsReadingPorts = {}): Promise<TtsReadingRead> {
  if (!identifier(revision)) return failure('invalidAction')
  const basis = parseTtsReadingRecords(snapshot.raw)
  if (!basis.ok) return basis
  if (revision === basis.snapshot.revision || !object(action)) return failure('invalidAction')
  if (action.kind === 'add' && exact(action, ['kind', 'record']) && validRecord(action.record)) {
    if (!resolveTtsReadingPosition(action.record.text, action.record.position).positionMatched) return failure('invalidPosition')
  }
  else if (!(action.kind === 'delete' && exact(action, ['kind', 'id']) && identifier(action.id))) return failure('invalidAction')
  const captured: TtsReadingAction = action.kind === 'add' ? { kind: 'add', record: cloneRecord(action.record) } : { kind: 'delete', id: action.id }
  try {
    return await (ports.lock ?? defaultLock)((): TtsReadingRead => {
      if (!current(ports)) return failure('canceled')
      const storage = ports.storage ?? window.localStorage, latest = readTtsReadingRecords(storage)
      if (!latest.ok) return latest
      if (latest.snapshot.raw !== basis.snapshot.raw) return failure('conflict')
      const records = latest.snapshot.records
      if (captured.kind === 'add') {
        if (records.length >= TTS_READING_LIMITS.records) return failure('limit')
        if (records.some(item => nameKey(item.name) === nameKey(captured.record.name))) return failure('duplicateName')
        if (records.some(item => item.id === captured.record.id)) return failure('invalidAction')
      } else if (!records.some(item => item.id === captured.id)) return failure('notFound')
      const next = captured.kind === 'add' ? [...records, captured.record] : records.filter(item => item.id !== captured.id)
      const raw = JSON.stringify({ version: 1, revision, records: next })
      if (!withinRaw(raw)) return failure('tooLarge')
      if (!current(ports)) return failure('canceled')
      if (storage.getItem(TTS_READING_KEY) !== basis.snapshot.raw) return failure('conflict')
      try { storage.setItem(TTS_READING_KEY, raw) } catch (error) { return failure(storageError(error)) }
      try { if (storage.getItem(TTS_READING_KEY) !== raw) return failure('writeUnknown') } catch { return failure('writeUnknown') }
      return { ok: true, snapshot: { raw, revision, records: next.map(cloneRecord) } }
    }, ports.signal)
  } catch (error) { return failure(storageError(error)) }
}
export async function loadTtsReadingRecord(snapshot: TtsReadingSnapshot, id: string, ports: TtsReadingPorts = {}): Promise<TtsReadingResult<TtsReadingLoad>> {
  const basis = parseTtsReadingRecords(snapshot.raw)
  if (!basis.ok) return basis
  if (!identifier(id)) return failure('invalidAction')
  try {
    return await (ports.lock ?? defaultLock)((): TtsReadingResult<TtsReadingLoad> => {
      if (!current(ports)) return failure('canceled')
      const storage = ports.storage ?? window.localStorage, latest = readTtsReadingRecords(storage)
      if (!latest.ok) return latest
      if (latest.snapshot.raw !== basis.snapshot.raw) return failure('conflict')
      const record = latest.snapshot.records.find(item => item.id === id)
      if (!record) return failure('notFound')
      const value = { record: cloneRecord(record), ...resolveTtsReadingPosition(record.text, record.position) }
      if (!current(ports)) return failure('canceled')
      if (storage.getItem(TTS_READING_KEY) !== basis.snapshot.raw) return failure('conflict')
      return { ok: true, value }
    }, ports.signal)
  } catch (error) { return failure(storageError(error)) }
}
