import { isWritingDraft, type WritingDraft } from './writingVersions.ts'

type Field = keyof WritingDraft
const fields: Field[] = ['title', 'text', 'target', 'basis']
type Touched = Partial<Record<Field, true>>
export interface CharacterUndo { readonly token: number; readonly tab: number; readonly afterRevision: number; readonly previous: Partial<WritingDraft> }
export interface CharacterDraftState {
  readonly tabs: WritingDraft[]; readonly active: number; readonly loaded: boolean
  readonly revision: number; readonly tabRevisions: number[]; readonly touched: Touched[]
  readonly activeIntent: boolean; readonly undo: CharacterUndo | null
}
export const emptyCharacterTabs = (): WritingDraft[] => Array.from({ length: 5 }, () => ({ title: '', text: '', target: 500, basis: 'chars' }))
export function createCharacterDraft(): CharacterDraftState {
  return { tabs: emptyCharacterTabs(), active: 0, loaded: false, revision: 0, tabRevisions: [0, 0, 0, 0, 0], touched: Array.from({ length: 5 }, () => ({})), activeIntent: false, undo: null }
}
export const characterDraftRaw = (state: Pick<CharacterDraftState, 'tabs' | 'active'>) => JSON.stringify({ tabs: state.tabs, active: state.active })

/** Initial editing wins field-by-field; untouched manuscripts are never discarded. */
export function initializeCharacterDraft(state: CharacterDraftState, saved: { tabs: WritingDraft[]; active: number } | null): CharacterDraftState {
  if (state.loaded) return state
  const source = saved ?? { tabs: emptyCharacterTabs(), active: 0 }
  const tabs = source.tabs.map((tab, index) => {
    const edited = state.tabs[index], touched = state.touched[index]
    return { title: touched.title ? edited.title : tab.title, text: touched.text ? edited.text : tab.text,
      target: touched.target ? edited.target : tab.target, basis: touched.basis ? edited.basis : tab.basis }
  })
  return { ...state, tabs, active: state.activeIntent ? state.active : source.active, loaded: true, revision: state.revision + 1, undo: null }
}

export function selectCharacterTab(state: CharacterDraftState, active: number): CharacterDraftState {
  if (!Number.isInteger(active) || active < 0 || active >= 5 || state.active === active && (state.loaded || state.activeIntent)) return state
  return { ...state, active, activeIntent: true, revision: state.revision + 1 }
}

export function patchCharacterDraft(state: CharacterDraftState, index: number, patch: Partial<WritingDraft>, undoable = false): CharacterDraftState {
  if (!Number.isInteger(index) || index < 0 || index >= 5 || undoable && !state.loaded) return state
  const old = state.tabs[index], next = { ...old, ...patch }
  if (!isWritingDraft(next)) return state
  const changed = fields.filter(field => old[field] !== next[field])
  if (!changed.length) return state
  const previous = Object.fromEntries(changed.map(field => [field, old[field]])) as Partial<WritingDraft>
  const revision = state.revision + 1, tabRevision = state.tabRevisions[index] + 1
  return { ...state, tabs: state.tabs.map((tab, at) => at === index ? next : tab), revision,
    tabRevisions: state.tabRevisions.map((value, at) => at === index ? tabRevision : value), activeIntent: state.activeIntent || !state.loaded,
    touched: state.loaded ? state.touched : state.touched.map((value, at) => at === index ? { ...value, ...Object.fromEntries(changed.map(field => [field, true])) } : value),
    undo: undoable ? { token: revision, tab: index, afterRevision: tabRevision, previous } : state.undo?.tab === index ? null : state.undo }
}

export function undoCharacterDraft(state: CharacterDraftState, token: number): CharacterDraftState {
  const undo = state.undo
  if (!state.loaded || !undo || undo.token !== token || undo.tab !== state.active || state.tabRevisions[undo.tab] !== undo.afterRevision) return state
  return patchCharacterDraft(state, undo.tab, undo.previous)
}

export function clearCharacterDraft(state: CharacterDraftState): CharacterDraftState {
  return { ...createCharacterDraft(), loaded: true, activeIntent: true, revision: state.revision + 1,
    tabRevisions: state.tabRevisions.map(value => value + 1) }
}
