import { newId, type Note } from './notepad.ts'
import { cloneNotepadNotes, inspectNotepadList } from './notepadPersistence.ts'

export type NotepadImportError = 'unreadable' | 'corrupt' | 'unsupported'
export type NotepadImportParsed = { ok: true; notes: Note[] } | { ok: false; error: NotepadImportError }
export function parseNotepadImport(text: string): NotepadImportParsed {
  try {
    const value: unknown = JSON.parse(text)
    if (Array.isArray(value)) {
      const notes = inspectNotepadList(value)
      return notes ? { ok: true, notes } : { ok: false, error: 'corrupt' }
    }
    if (!value || typeof value !== 'object') return { ok: false, error: 'corrupt' }
    const wrapper = value as Record<string, unknown>
    if (wrapper.app !== 'toolhub-notepad' || wrapper.version !== 1) return { ok: false, error: 'unsupported' }
    if (Object.keys(wrapper).some(key => !['app', 'version', 'exportedAt', 'notes'].includes(key)) || typeof wrapper.exportedAt !== 'string') return { ok: false, error: 'corrupt' }
    const notes = inspectNotepadList(wrapper.notes)
    return notes ? { ok: true, notes } : { ok: false, error: 'corrupt' }
  } catch { return { ok: false, error: 'corrupt' } }
}
const body = (note: Note) => JSON.stringify([note.title, note.content, note.createdAt, note.updatedAt, note.pinned ?? false])
/** Timestamp never chooses a winner. Distinct legitimate IDs are not collapsed. */
export function mergeImportedNotes(current: readonly Note[], incoming: readonly Note[], id: () => string = newId) {
  const notes = cloneNotepadNotes(current), byId = new Map(notes.map(note => [note.id, note])), bodies = new Set(notes.map(body))
  const reservedIds = new Set([...current.map(note => note.id), ...incoming.map(note => note.id)])
  let added = 0, conflicts = 0, duplicates = 0, serial = 0
  for (const note of incoming) {
    const old = byId.get(note.id), signature = body(note)
    if (old && (body(old) === signature || bodies.has(signature))) { duplicates++; continue }
    let nextId = note.id
    if (old) {
      conflicts++
      // Bounded even with a broken/colliding injected ID source; never overwrite an existing entry.
      const candidate = id() || 'imported-note'
      nextId = candidate
      while (reservedIds.has(nextId)) nextId = `${candidate}-${++serial}`
    }
    const copy = { ...note, id: nextId }
    notes.push(copy); byId.set(nextId, copy); reservedIds.add(nextId); bodies.add(signature); added++
  }
  return { notes, added, conflicts, duplicates }
}

export interface NotepadImportFile { name: string; text(): Promise<string> }
export interface NotepadImportReport { notes: Note[]; files: number; failures: { name: string; error: NotepadImportError }[] }
/** Reads one file at a time. A superseded read is consumed, but cannot apply or start another read. */
export function createNotepadImporter(ports: { now?: () => number; id?: () => string } = {}) {
  let active = true, generation = 0
  return {
    cancel() { generation++ },
    activate() { active = true },
    dispose() { active = false; generation++ },
    async read(files: readonly NotepadImportFile[], current: () => boolean = () => true): Promise<NotepadImportReport | null> {
      const request = ++generation, captured = [...files], notes: Note[] = [], failures: NotepadImportReport['failures'] = []
      const valid = () => active && request === generation && current()
      let completed = 0
      for (const file of captured) {
        if (!valid()) return null
        try {
          const text = await file.text()
          if (!valid()) return null
          if (/\.json$/i.test(file.name)) {
            const parsed = parseNotepadImport(text)
            if (parsed.ok) for (const note of parsed.notes) notes.push(note)
            else failures.push({ name: file.name, error: parsed.error })
          } else {
            const now = (ports.now ?? Date.now)()
            notes.push({ id: (ports.id ?? newId)(), title: file.name.replace(/\.[^.]+$/, ''), content: text.replace(/\r\n?/g, '\n'), createdAt: now, updatedAt: now })
          }
        } catch { if (valid()) failures.push({ name: file.name, error: 'unreadable' }) }
        if (!valid()) return null
        completed++
      }
      return valid() ? { notes, files: completed, failures } : null
    },
  }
}
