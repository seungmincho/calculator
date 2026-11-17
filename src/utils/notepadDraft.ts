import { STORAGE_KEY, type Note } from './notepad.ts'
import { mergeImportedNotes } from './notepadImport.ts'
import {
  cloneNotepadNotes, commitNotepad, inspectNotepadList, readNotepad, withNotepadLock, writeNotepad, notepadStorageError,
  type NotepadError, type NotepadLock, type NotepadRead, type NotepadStorage, type NotepadWrite,
} from './notepadPersistence.ts'

export interface NotepadDraftView {
  readonly ready: boolean; readonly notes: readonly Note[]; readonly activeId: string | null
  readonly revision: number; readonly scope: number; readonly dirty: boolean
  readonly status: 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'external'
  readonly error?: NotepadError; readonly originalRaw?: string | null
  readonly external: NotepadRead<Note[]> | null; readonly undoToken: number | null
}
export interface NotepadTimers { set(callback: () => void, ms: number): unknown; clear(handle: unknown): void }
export interface NotepadDraftPorts {
  storage: NotepadStorage; lock?: NotepadLock; timers?: NotepadTimers; id?: () => string
  onChange?: (view: NotepadDraftView) => void
}
const defaultTimers: NotepadTimers = { set: (callback, ms) => setTimeout(callback, ms), clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) }
const frozenNotes = (notes: readonly Note[]) => Object.freeze(notes.map(note => Object.freeze({ ...note })))

/** Memory remains authoritative for editing; an external raw never silently becomes the next write basis. */
export function createNotepadDraft(ports: NotepadDraftPorts) {
  const timers = ports.timers ?? defaultTimers
  let active = true, ready = false, notes: Note[] = [], activeId: string | null = null
  let revision = 0, scope = 0, generation = 0, undoSerial = 0, blocked = true
  let status: NotepadDraftView['status'] = 'idle', error: NotepadError | undefined
  let basis: NotepadRead<Note[]> = { ok: false, error: 'unavailable' }, external: NotepadRead<Note[]> | null = null
  let cleanKey = '[]', lastAttempt: string | null = null
  let timer: { handle: unknown; owner: object } | null = null, pending: AbortController | null = null
  let undo: { token: number; afterRevision: number; notes: Note[]; activeId: string | null } | null = null
  const key = () => JSON.stringify(notes)
  const dirty = () => key() !== cleanKey
  const snapshot = (): NotepadDraftView => Object.freeze({
    ready, notes: frozenNotes(notes), activeId, revision, scope, dirty: dirty(), status, ...(error ? { error } : {}),
    ...('raw' in basis ? { originalRaw: basis.raw } : {}),
    external: external ? Object.freeze(external.ok ? { ...external, value: cloneNotepadNotes(external.value) } : { ...external }) : null,
    undoToken: undo?.token ?? null,
  })
  const emit = () => { if (active) ports.onChange?.(snapshot()) }
  const cancel = () => {
    generation++
    if (timer) { timers.clear(timer.handle); timer = null }
    pending?.abort(); pending = null
  }
  const invalidateUndo = () => { undo = null }
  const confirm = (result: { ok: true; raw: string; value: Note[] }) => {
    basis = { ...result }; cleanKey = JSON.stringify(result.value); lastAttempt = null; blocked = false
  }
  const failed = (reason: NotepadError) => {
    if (reason === 'cancelled') return
    blocked = true; status = 'error'; error = reason
  }
  const schedule = () => {
    if (!active || !ready || blocked || !dirty()) return
    const owner = {}, request = generation
    const handle = timers.set(() => {
      if (!active || timer?.owner !== owner || generation !== request) return
      timer = null; void save()
    }, 400)
    timer = { handle, owner }
  }
  const save = async (): Promise<NotepadWrite<Note[]>> => {
    if (!active || !ready) return { ok: false, error: 'cancelled' }
    if (!basis.ok || blocked) return { ok: false, error: error ?? (basis.ok ? 'conflict' : basis.error) }
    cancel()
    const request = generation, controller = new AbortController(), captured = cloneNotepadNotes(notes), expectedRaw = basis.raw
    pending = controller; lastAttempt = JSON.stringify(captured); status = 'saving'; error = undefined
    const current = () => active && generation === request && !controller.signal.aborted
    emit()
    if (!current()) return { ok: false, error: 'cancelled' }
    const result = await commitNotepad(expectedRaw, captured, { storage: ports.storage, lock: ports.lock, signal: controller.signal, current, onConfirmed: confirm })
    if (!current()) return result
    pending = null
    if (result.ok) { status = dirty() ? 'dirty' : 'saved'; error = undefined }
    else failed(result.error)
    emit()
    if (current() && result.ok && dirty()) schedule()
    return result
  }
  const mutate = (next: readonly Note[], selected: string | null, undoable: boolean): boolean => {
    if (!active || !ready) return false
    const valid = inspectNotepadList(next)
    if (!valid) return false
    if (JSON.stringify(valid) === key()) return false
    const before = { notes: cloneNotepadNotes(notes), activeId }
    cancel(); invalidateUndo(); notes = valid; activeId = notes.some(note => note.id === selected) ? selected : notes[0]?.id ?? null
    revision++; scope++
    if (undoable) undo = { ...before, token: ++undoSerial, afterRevision: revision }
    status = external ? 'external' : blocked ? 'error' : dirty() ? 'dirty' : 'saved'
    const request = generation
    emit(); if (active && request === generation) schedule()
    return true
  }
  const recheck = () => {
    if (!active || !ready) return snapshot()
    cancel(); scope++; invalidateUndo()
    const read = readNotepad(ports.storage)
    if (read.ok && basis.ok && read.raw === basis.raw) {
      // A retry after quota or transient read failure may safely use the unchanged confirmed basis.
      blocked = false; external = null; error = undefined; status = dirty() ? 'dirty' : 'saved'
    } else if (read.ok && lastAttempt !== null && read.raw === lastAttempt) {
      basis = read; cleanKey = JSON.stringify(read.value); lastAttempt = null; blocked = false; external = null; error = undefined
      status = dirty() ? 'dirty' : 'saved'
    } else {
      external = read; blocked = true; status = read.ok ? 'external' : 'error'; error = read.ok ? 'conflict' : read.error
    }
    emit()
    return snapshot()
  }
  return {
    snapshot,
    initialize(emptyNote?: Note) {
      if (!active || ready) return snapshot()
      basis = readNotepad(ports.storage); ready = true; blocked = !basis.ok
      if (basis.ok) {
        notes = cloneNotepadNotes(basis.value)
        if (!notes.length && emptyNote && inspectNotepadList([emptyNote])) notes = [{ ...emptyNote }]
        activeId = notes[0]?.id ?? null; cleanKey = key(); status = 'idle'
      } else { status = 'error'; error = basis.error }
      emit(); return snapshot()
    },
    select(id: string | null) { if (!active || !ready || (id !== null && !notes.some(note => note.id === id))) return; activeId = id; emit() },
    edit(next: readonly Note[], selected: string | null = activeId) { return mutate(next, selected, false) },
    editUndoable(next: readonly Note[], selected: string | null = activeId) { return mutate(next, selected, true) },
    undo(token: number) {
      if (!undo || token !== undo.token || revision !== undo.afterRevision) return false
      return mutate(undo.notes, undo.activeId, false)
    },
    clearUndo(token: number) { if (undo?.token === token) { undo = null; emit() } },
    requestSave: save,
    async retry() {
      recheck()
      if (!active || blocked || !basis.ok) return { ok: false as const, error: error ?? 'conflict' as NotepadError }
      return save()
    },
    recheckExternal: recheck,
    externalChange() {
      if (!active || !ready) return snapshot()
      const read = readNotepad(ports.storage)
      if (read.ok && basis.ok && read.raw === basis.raw) return snapshot()
      cancel(); scope++; invalidateUndo(); external = read; blocked = true
      status = read.ok ? 'external' : 'error'; error = read.ok ? 'conflict' : read.error
      emit(); return snapshot()
    },
    async applyMergedExternal(expectedScope: number, expectedExternalRaw: string | null): Promise<NotepadWrite<Note[]>> {
      if (!active || !ready || scope !== expectedScope || !external?.ok || external.raw !== expectedExternalRaw) return { ok: false, error: 'cancelled' }
      const captured = cloneNotepadNotes(notes), candidate = cloneNotepadNotes(external.value), selected = activeId
      cancel()
      const request = generation, controller = new AbortController()
      pending = controller; status = 'saving'
      const current = () => active && request === generation && !controller.signal.aborted
      emit()
      if (!current()) return { ok: false, error: 'cancelled' }
      let result: NotepadWrite<Note[]>
      try {
        result = await (ports.lock ?? withNotepadLock)(STORAGE_KEY, (): NotepadWrite<Note[]> => {
          if (!current()) return { ok: false, error: 'cancelled' }
          const read = readNotepad(ports.storage)
          if (!read.ok) return { ok: false, error: read.error }
          if (read.raw !== expectedExternalRaw) return { ok: false, error: 'conflict' }
          if (!current()) return { ok: false, error: 'cancelled' }
          const merged = mergeImportedNotes(captured, candidate, ports.id)
          basis = read; cleanKey = JSON.stringify(read.value); notes = merged.notes; activeId = notes.some(note => note.id === selected) ? selected : notes[0]?.id ?? null
          revision++; scope++; invalidateUndo(); external = null; blocked = false
          lastAttempt = JSON.stringify(notes)
          return writeNotepad(read.raw, notes, { storage: ports.storage, current, signal: controller.signal, onConfirmed: confirm })
        }, controller.signal)
      } catch (cause) { result = { ok: false, error: notepadStorageError(cause) } }
      if (!current()) return result
      pending = null
      if (result.ok) { error = undefined; status = dirty() ? 'dirty' : 'saved' }
      else failed(result.error)
      emit(); return result
    },
    hide() { if (active && ready && !blocked && dirty()) void save() },
    pagehide() { active = false; cancel(); scope++; invalidateUndo() },
    pageshow() { active = true; if (ready) { recheck(); if (!blocked && dirty()) schedule() } },
    activate() { active = true; if (status === 'saving') status = dirty() ? 'dirty' : 'idle'; if (ready && !blocked && dirty()) schedule() },
    dispose() { active = false; cancel(); scope++; invalidateUndo() },
  }
}
