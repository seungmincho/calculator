/** Ephemeral menu choices only. Never persist this state or replace the original URL candidates. */
export const MENU_ROUND_MIN_ITEMS = 2
export interface MenuRoundItem { readonly sourceIndex: number; readonly value: string; readonly key: string }
export interface MenuRoundExclusions {
  readonly revision: number
  readonly source: readonly string[]
  /** Original candidates after the existing meal-history filter, before temporary exclusions. */
  readonly eligible: readonly MenuRoundItem[]
  readonly excluded: readonly string[]
  readonly items: readonly MenuRoundItem[]
}
export type MenuRoundChange = { ok: true; changed: boolean; state: MenuRoundExclusions }
  | { ok: false; error: 'stale' | 'unknown' | 'minimum'; state: MenuRoundExclusions }

const keyOf = (name: string) => name.trim()
const sameSource = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((value, i) => value === b[i])
const sameItems = (a: readonly MenuRoundItem[], b: readonly MenuRoundItem[]) => a.length === b.length && a.every((value, i) => value.sourceIndex === b[i].sourceIndex && value.value === b[i].value)
function eligibleItems(source: readonly string[], unavailable: readonly string[]) {
  // Existing meal filtering compares item.trim() to stored names verbatim.
  const blocked = new Set(unavailable)
  return Object.freeze(source.map((value, sourceIndex) => Object.freeze({ sourceIndex, value, key: keyOf(value) })).filter(item => !blocked.has(item.key)))
}
function snapshot(source: readonly string[], eligible: readonly MenuRoundItem[], excluded: readonly string[], revision: number): MenuRoundExclusions {
  const blocked = new Set(excluded)
  return Object.freeze({ revision, source: Object.freeze([...source]), eligible: Object.freeze([...eligible]), excluded: Object.freeze([...excluded]), items: Object.freeze(eligible.filter(item => !blocked.has(item.key))) })
}
export function createMenuRoundExclusions(source: readonly string[], unavailable: readonly string[] = []): MenuRoundExclusions {
  return snapshot(source, eligibleItems(source, unavailable), [], 0)
}
/** Explicit preset application may reset even when the preset values are unchanged. */
export function updateMenuRoundContext(state: MenuRoundExclusions, source: readonly string[], unavailable: readonly string[] = [], forceReset = false): MenuRoundExclusions {
  const eligible = eligibleItems(source, unavailable)
  if (!forceReset && sameSource(state.source, source) && sameItems(state.eligible, eligible)) return state
  return snapshot(source, eligible, [], state.revision + 1)
}
export function excludeMenuRoundName(state: MenuRoundExclusions, name: string, expectedRevision: number): MenuRoundChange {
  if (expectedRevision !== state.revision) return { ok: false, error: 'stale', state }
  const key = keyOf(name)
  if (state.excluded.includes(key)) return { ok: true, changed: false, state }
  if (!state.items.some(item => item.key === key)) return { ok: false, error: 'unknown', state }
  if (state.items.filter(item => item.key !== key).length < MENU_ROUND_MIN_ITEMS) return { ok: false, error: 'minimum', state }
  return { ok: true, changed: true, state: snapshot(state.source, state.eligible, [...state.excluded, key], state.revision + 1) }
}
export function restoreMenuRoundName(state: MenuRoundExclusions, name: string, expectedRevision: number): MenuRoundChange {
  if (expectedRevision !== state.revision) return { ok: false, error: 'stale', state }
  const key = keyOf(name)
  if (!state.excluded.includes(key)) return { ok: true, changed: false, state }
  return { ok: true, changed: true, state: snapshot(state.source, state.eligible, state.excluded.filter(value => value !== key), state.revision + 1) }
}
export function restoreAllMenuRoundNames(state: MenuRoundExclusions, expectedRevision: number): MenuRoundChange {
  if (expectedRevision !== state.revision) return { ok: false, error: 'stale', state }
  if (!state.excluded.length) return { ok: true, changed: false, state }
  return { ok: true, changed: true, state: snapshot(state.source, state.eligible, [], state.revision + 1) }
}

export interface MenuSpinToken { readonly run: number; readonly context: number }
/** A callback authorization port, not a timer or random-number implementation. */
export function createMenuSpinGuard() {
  let alive = true, sequence = 0, active: MenuSpinToken | null = null
  const current = (token: MenuSpinToken, context: number) => alive && active === token && token.context === context
  return {
    begin(context: number): MenuSpinToken | null {
      if (!alive || active || !Number.isSafeInteger(context) || context < 0) return null
      active = Object.freeze({ run: ++sequence, context }); return active
    },
    current,
    finish(token: MenuSpinToken, context: number) { if (!current(token, context)) return false; active = null; return true },
    invalidate() { active = null },
    dispose() { alive = false; active = null },
    activate() { alive = true },
  }
}
