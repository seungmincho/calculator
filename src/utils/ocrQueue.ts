import { cleanOcrText, type CleanOptions, type PrepMode } from './ocr.ts'

export interface OcrQueueWord { readonly text: string; readonly confidence: number; readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }
export interface OcrRunSettings { readonly langs: string; readonly mode: PrepMode; readonly rotation: number }
export interface OcrSuccess { readonly raw: string; readonly words: readonly OcrQueueWord[]; readonly confidence: number; readonly settings: OcrRunSettings }
export interface OcrQueueItem<Source = File> {
  readonly id: number; readonly file: Source; readonly url: string; readonly rotation: number; readonly sourceRevision: number
  readonly status: 'pending' | 'running' | 'done' | 'error'
  readonly success: OcrSuccess | null; readonly edited: string | null; readonly editRevision: number
  readonly replaceEditRevision: number | null; readonly keptEdited: boolean
}
export interface OcrQueueJob {
  readonly id: number; readonly epoch: number; readonly itemId: number; readonly sourceRevision: number
  readonly replaceEditRevision: number | null; readonly settings: OcrRunSettings
}
export interface OcrQueueState<Source = File> {
  readonly items: readonly OcrQueueItem<Source>[]; readonly paused: boolean; readonly clean: Readonly<CleanOptions>
  readonly epoch: number; readonly revision: number; readonly nextJob: number; readonly active: OcrQueueJob | null
}
export function createOcrQueue<Source = File>(): OcrQueueState<Source> {
  return { items: [], paused: false, clean: { fixKoreanSpaces: true, joinLines: false }, epoch: 0, revision: 0, nextJob: 1, active: null }
}
export function appendOcrItems<Source>(state: OcrQueueState<Source>, sources: readonly { id: number; file: Source; url: string }[]): OcrQueueState<Source> {
  const ids = new Set(state.items.map(item => item.id))
  for (const source of sources) { if (!Number.isSafeInteger(source.id) || source.id < 1 || ids.has(source.id)) throw Error('Duplicate or invalid OCR source id'); ids.add(source.id) }
  if (!sources.length) return state
  return { ...state, revision: state.revision + 1, items: [...state.items, ...sources.map(source => ({ ...source, rotation: 0, sourceRevision: 0, status: 'pending' as const, success: null, edited: null, editRevision: 0, replaceEditRevision: 0, keptEdited: false }))] }
}
export function setOcrPaused<Source>(state: OcrQueueState<Source>, paused: boolean): OcrQueueState<Source> {
  return state.paused === paused ? state : { ...state, paused, revision: state.revision + 1 }
}
export function editOcrText<Source>(state: OcrQueueState<Source>, id: number, text: string): OcrQueueState<Source> {
  const item = state.items.find(item => item.id === id)
  if (!item?.success || item.edited === text) return state
  return { ...state, revision: state.revision + 1, items: state.items.map(item => item.id === id ? { ...item, edited: text, editRevision: item.editRevision + 1, keptEdited: false } : item) }
}
export function rotateOcrItem<Source>(state: OcrQueueState<Source>, id: number, rotation: number): OcrQueueState<Source> {
  if (![0, 90, 180, 270].includes(rotation)) throw Error('Invalid OCR rotation')
  const item = state.items.find(item => item.id === id)
  if (!item || item.rotation === rotation) return state
  return { ...state, revision: state.revision + 1, items: state.items.map(item => item.id === id ? { ...item, rotation } : item) }
}
export function removeOcrItem<Source>(state: OcrQueueState<Source>, id: number): OcrQueueState<Source> {
  if (!state.items.some(item => item.id === id)) return state
  return { ...state, revision: state.revision + 1, items: state.items.filter(item => item.id !== id), active: state.active?.itemId === id ? null : state.active }
}
/** Text remains available through pending/running/error whenever a successful snapshot exists, including empty text. */
export function ocrItemText(item: OcrQueueItem<unknown>, clean: CleanOptions): string {
  return item.edited ?? (item.success ? cleanOcrText(item.success.raw, clean) : '')
}
export function ocrAllText(state: OcrQueueState<unknown>): string {
  return state.items.filter(item => item.success !== null).map(item => ocrItemText(item, state.clean)).join('\n\n')
}
export function beginOcrJob<Source>(state: OcrQueueState<Source>, settings: Pick<OcrRunSettings, 'langs' | 'mode'>): { state: OcrQueueState<Source>; job: OcrQueueJob | null } {
  const item = !state.paused && !state.active ? state.items.find(item => item.status === 'pending') : null
  if (!item) return { state, job: null }
  const job = Object.freeze({ id: state.nextJob, epoch: state.epoch, itemId: item.id, sourceRevision: item.sourceRevision, replaceEditRevision: item.replaceEditRevision, settings: Object.freeze({ ...settings, rotation: item.rotation }) })
  return { job, state: { ...state, active: job, nextJob: state.nextJob + 1, revision: state.revision + 1, items: state.items.map(entry => entry.id === item.id ? { ...entry, status: 'running' } : entry) } }
}
export function isOcrJobCurrent(state: OcrQueueState<unknown>, job: OcrQueueJob): boolean {
  return state.epoch === job.epoch && state.active?.id === job.id && state.active.itemId === job.itemId && state.items.some(item => item.id === job.itemId && item.sourceRevision === job.sourceRevision && item.status === 'running')
}
export function completeOcrJob<Source>(state: OcrQueueState<Source>, job: OcrQueueJob, result: { raw: string; words: readonly OcrQueueWord[]; confidence: number } | null): OcrQueueState<Source> {
  if (!isOcrJobCurrent(state, job)) return state
  const success = result === null ? null : Object.freeze({ raw: result.raw, words: Object.freeze(result.words.map(word => Object.freeze({ ...word }))), confidence: result.confidence, settings: job.settings })
  return { ...state, revision: state.revision + 1, active: null, items: state.items.map(item => {
    if (item.id !== job.itemId) return item
    if (!success) return { ...item, status: 'error' }
    const preserve = item.edited !== null && (job.replaceEditRevision === null || job.replaceEditRevision !== item.editRevision)
    return { ...item, status: 'done', success, edited: preserve ? item.edited : null, keptEdited: preserve }
  }) }
}
function enqueue<Source>(state: OcrQueueState<Source>, ids: readonly number[], replaceEdited: boolean): OcrQueueState<Source> {
  const selected = new Set(ids), entries = state.items.filter(item => selected.has(item.id) && item.status !== 'running')
  if (!entries.length) return state
  return { ...state, revision: state.revision + 1, items: state.items.map(item => selected.has(item.id) && item.status !== 'running' ? { ...item, status: 'pending', replaceEditRevision: replaceEdited ? item.editRevision : null, keptEdited: false } : item) }
}
/** Capture failed IDs at click time. Paused state and every non-error item are retained. */
export function retryOcrFailures<Source>(state: OcrQueueState<Source>): OcrQueueState<Source> {
  return enqueue(state, state.items.filter(item => item.status === 'error').map(item => item.id), false)
}
export type OcrConfirmedAction = { readonly kind: 'rerun'; readonly ids: readonly number[] } | { readonly kind: 'cleanup'; readonly clean: Readonly<CleanOptions> } | { readonly kind: 'reset' }
export interface OcrConfirmation { readonly revision: number; readonly action: OcrConfirmedAction; readonly editedCount: number }
export function prepareOcrConfirmation(state: OcrQueueState<unknown>, action: OcrConfirmedAction): OcrConfirmation {
  const captured: OcrConfirmedAction = action.kind === 'rerun' ? Object.freeze({ kind: action.kind, ids: Object.freeze([...new Set(action.ids)].filter(id => state.items.some(item => item.id === id && item.status !== 'running'))) })
    : action.kind === 'cleanup' ? Object.freeze({ kind: action.kind, clean: Object.freeze({ ...action.clean }) }) : Object.freeze({ kind: 'reset' })
  const targets = captured.kind === 'rerun' ? new Set(captured.ids) : null
  return Object.freeze({ revision: state.revision, action: captured, editedCount: state.items.filter(item => item.edited !== null && (!targets || targets.has(item.id))).length })
}
/** Call immediately for editedCount=0; otherwise only after the user's explicit confirmation. */
export function applyOcrConfirmation<Source>(state: OcrQueueState<Source>, confirmation: OcrConfirmation): { ok: true; state: OcrQueueState<Source> } | { ok: false; state: OcrQueueState<Source> } {
  if (state.revision !== confirmation.revision) return { ok: false, state }
  const { action } = confirmation
  if (action.kind === 'rerun') return { ok: true, state: enqueue(state, action.ids, true) }
  if (action.kind === 'reset') return { ok: true, state: { ...state, items: [], active: null, paused: false, epoch: state.epoch + 1, revision: state.revision + 1 } }
  return { ok: true, state: { ...state, clean: action.clean, revision: state.revision + 1, items: state.items.map(item => item.edited === null ? item : { ...item, edited: null, editRevision: item.editRevision + 1, keptEdited: false }) } }
}
