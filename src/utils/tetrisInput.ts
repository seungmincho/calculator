/** Solo-input policy only: no DOM globals, React, timers, engine mutation or storage. */
export type TetrisInputAction = 'left' | 'right' | 'down' | 'cw' | 'ccw' | 'hard' | 'hold'
export type TetrisInputStatus = 'idle' | 'playing' | 'paused' | 'over'
export const TETRIS_KEY_ACTIONS: Readonly<Record<string, TetrisInputAction>> = Object.freeze({
  ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'cw', KeyX: 'cw', KeyZ: 'ccw',
  ControlLeft: 'ccw', ControlRight: 'ccw', Space: 'hard', KeyC: 'hold', ShiftLeft: 'hold', ShiftRight: 'hold',
})
const actions = new Set<TetrisInputAction>(['left', 'right', 'down', 'cw', 'ccw', 'hard', 'hold'])
const roles = new Set(['button', 'link', 'checkbox', 'radio', 'switch', 'slider', 'spinbutton', 'textbox', 'searchbox',
  'combobox', 'listbox', 'option', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'tab', 'treeitem', 'gridcell'])
export const TETRIS_INTERACTIVE_SELECTOR = 'input,textarea,select,button,a[href],summary,[contenteditable]:not([contenteditable="false"]),' +
  [...roles].map(role => `[role~="${role}"]`).join(',')
type NodePort = {
  tagName?: string; isContentEditable?: boolean; parentElement?: unknown
  closest?: (selector: string) => unknown; getAttribute?: (name: string) => string | null
}
const nodePort = (value: unknown): NodePort | null => value !== null && typeof value === 'object' ? value as NodePort : null
const interactiveNode = (node: NodePort): boolean => {
  const tag = typeof node.tagName === 'string' ? node.tagName.toLowerCase() : ''
  if (['input', 'textarea', 'select', 'button', 'summary'].includes(tag) || node.isContentEditable === true) return true
  const attr = (key: string) => typeof node.getAttribute === 'function' ? node.getAttribute(key) : null
  if (tag === 'a' && attr('href') !== null) return true
  const editable = attr('contenteditable')?.toLowerCase()
  if (editable === '' || editable === 'true' || editable === 'plaintext-only') return true
  return (attr('role') ?? '').toLowerCase().split(/\s+/).some(role => roles.has(role))
}

/** closest covers SVG descendants; composedPath covers retargeted controls such as a shadow host. */
export function isTetrisInteractiveTarget(target: unknown, path: readonly unknown[] = []): boolean {
  for (const candidate of [target, ...path]) {
    let node = nodePort(candidate)
    const seen = new Set<NodePort>()
    while (node && !seen.has(node)) {
      seen.add(node)
      if (interactiveNode(node)) return true
      if (typeof node.closest === 'function') {
        try { if (node.closest(TETRIS_INTERACTIVE_SELECTOR)) return true } catch { /* Structural ancestor fallback. */ }
      }
      node = nodePort(node.parentElement)
    }
  }
  return false
}
export interface TetrisKeyboardEvent {
  code: string; target?: unknown; defaultPrevented?: boolean; isComposing?: boolean; keyCode?: number; repeat?: boolean
  ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; shiftKey?: boolean
  composedPath?: () => readonly unknown[]
}
export type TetrisKeyIntent =
  | { kind: 'action'; action: TetrisInputAction; source: TetrisInputSource }
  | { kind: 'pause' | 'resume' | 'start' | 'repeat' }
/** Non-null means a game-background key owns its default action; repeat must not execute an action. */
export function tetrisKeyIntent(event: TetrisKeyboardEvent, status: TetrisInputStatus, modalOpen = false): TetrisKeyIntent | null {
  if (modalOpen || event.defaultPrevented || event.isComposing || event.keyCode === 229) return null
  if (event.metaKey || event.altKey || (event.ctrlKey && event.code !== 'ControlLeft' && event.code !== 'ControlRight')) return null
  let path: readonly unknown[] = []
  try { path = event.composedPath?.() ?? [] } catch { /* target remains available. */ }
  if (isTetrisInteractiveTarget(event.target, path)) return null
  if ((event.code === 'KeyP' || event.code === 'Escape') && (status === 'playing' || status === 'paused')) {
    return { kind: event.repeat ? 'repeat' : status === 'playing' ? 'pause' : 'resume' }
  }
  if ((event.code === 'Enter' || event.code === 'NumpadEnter') && (status === 'idle' || status === 'over')) return { kind: event.repeat ? 'repeat' : 'start' }
  const action = TETRIS_KEY_ACTIONS[event.code]
  if (status !== 'playing' || !action) return null
  return event.repeat ? { kind: 'repeat' } : { kind: 'action', action, source: { kind: 'key', code: event.code } }
}

export type TetrisInputSource = Readonly<{ kind: 'key'; code: string } | { kind: 'pointer'; pointerId: number; target: string }>
export interface TetrisInputToken { readonly epoch: number; readonly sequence: number; readonly source: TetrisInputSource; readonly action: TetrisInputAction }
export interface TetrisHeldSnapshot {
  readonly epoch: number; readonly active: boolean; readonly left: boolean; readonly right: boolean; readonly down: boolean
  readonly direction: -1 | 0 | 1; readonly owners: readonly TetrisInputToken[]
}
const validPointerId = (value: number) => Number.isSafeInteger(value) && value >= 0
const validTarget = (value: string) => typeof value === 'string' && value.length > 0 && value.length <= 128
const sourceKey = (source: TetrisInputSource): string | null => {
  if (source.kind === 'key') return typeof source.code === 'string' && /^[A-Za-z][A-Za-z0-9]{0,31}$/.test(source.code) ? `key:${source.code}` : null
  return source.kind === 'pointer' && validPointerId(source.pointerId) && validTarget(source.target) ? `pointer:${source.pointerId}` : null
}
const sameSource = (a: TetrisInputSource, b: TetrisInputSource) => a.kind === b.kind &&
  (a.kind === 'key' && b.kind === 'key' ? a.code === b.code : a.kind === 'pointer' && b.kind === 'pointer' && a.pointerId === b.pointerId && a.target === b.target)

/** Each physical press gets one token. Releasing that exact token cannot release any other owner. */
export function createTetrisInputOwners() {
  const owners = new Map<string, TetrisInputToken>()
  let epoch = 0, sequence = 0, active = false
  const snapshot = (): TetrisHeldSnapshot => {
    const values = [...owners.values()], horizontal = values.filter(token => token.action === 'left' || token.action === 'right')
    const last = horizontal.at(-1)
    return Object.freeze({ epoch, active, left: values.some(token => token.action === 'left'), right: values.some(token => token.action === 'right'),
      down: values.some(token => token.action === 'down'), direction: last?.action === 'left' ? -1 : last?.action === 'right' ? 1 : 0,
      owners: Object.freeze(values) })
  }
  return {
    getSnapshot: snapshot,
    reset(enabled = false): TetrisHeldSnapshot { epoch++; active = enabled; owners.clear(); return snapshot() },
    press(source: TetrisInputSource, action: TetrisInputAction, expectedEpoch = epoch): { token: TetrisInputToken; snapshot: TetrisHeldSnapshot; resetDas: boolean } | null {
      const key = sourceKey(source)
      if (!active || expectedEpoch !== epoch || !actions.has(action) || key === null || owners.has(key)) return null
      const token = Object.freeze({ epoch, sequence: ++sequence, source: Object.freeze({ ...source }), action })
      owners.set(key, token)
      return { token, snapshot: snapshot(), resetDas: action === 'left' || action === 'right' }
    },
    getToken(source: TetrisInputSource): TetrisInputToken | null {
      const key = sourceKey(source), token = key === null ? undefined : owners.get(key)
      return token && sameSource(token.source, source) ? token : null
    },
    release(token: TetrisInputToken): { snapshot: TetrisHeldSnapshot; resetDas: boolean } | null {
      const key = sourceKey(token.source)
      if (key === null || token.epoch !== epoch || owners.get(key) !== token) return null
      const direction = snapshot().direction
      owners.delete(key)
      const next = snapshot()
      return { snapshot: next, resetDas: direction !== next.direction }
    },
    pulse(action: TetrisInputAction, expectedEpoch = epoch): TetrisInputAction | null {
      return active && expectedEpoch === epoch && actions.has(action) ? action : null
    },
  }
}

export interface TetrisPointerActivation { readonly epoch: number; readonly sequence: number; readonly pointerId: number; readonly target: string; readonly at: number }
export interface TetrisClickInput { epoch: number; target: string; at: number; pointerId?: number; pointerType?: string; detail?: number; defaultPrevented?: boolean }
export type TetrisActivationDecision = 'activate' | 'duplicate' | 'stale'
const PAD_KEY_CODES = new Set(['Space', 'Enter', 'NumpadEnter'])
const MAX_POINTER_ACTIVATIONS = 32
const LEGACY_CLICK_WINDOW_MS = 1200

/** Keeps bounded consumed-pointer tombstones separately from held-input ownership. */
export function createTetrisActivationGate() {
  let epoch = 0, active = false, sequence = 0
  const pointers = new Map<number, { token: TetrisPointerActivation; lastAt: number; retired: boolean }>()
  const keys = new Map<string, { target: string; epoch: number; down: boolean; used: boolean; canceled: boolean }>()
  const current = (expected: number) => active && expected === epoch
  return {
    reset(nextEpoch: number, enabled: boolean): boolean {
      if (!Number.isSafeInteger(nextEpoch) || nextEpoch <= epoch) return false
      epoch = nextEpoch; active = enabled
      for (const record of pointers.values()) record.retired = true
      for (const record of keys.values()) record.canceled = true
      return true
    },
    pointerDown(pointerId: number, target: string, at: number, expectedEpoch = epoch): TetrisPointerActivation | null {
      if (!current(expectedEpoch) || !validPointerId(pointerId) || !validTarget(target) || !Number.isFinite(at)) return null
      const previous = pointers.get(pointerId)
      if (previous && !previous.retired) return null
      const token = Object.freeze({ epoch, sequence: ++sequence, pointerId, target, at })
      pointers.delete(pointerId); pointers.set(pointerId, { token, lastAt: at, retired: false })
      while (pointers.size > MAX_POINTER_ACTIVATIONS) pointers.delete(pointers.keys().next().value!)
      return token
    },
    pointerEnd(token: TetrisPointerActivation, at: number): boolean {
      const record = pointers.get(token.pointerId)
      if (!record || record.token !== token || !Number.isFinite(at) || at < token.at) return false
      record.lastAt = at; record.retired = true
      return true
    },
    /** Return true to leave native button activation alone; false means preventDefault. */
    keyDown(code: string, target: string, expectedEpoch = epoch, repeat = false): boolean {
      if (!PAD_KEY_CODES.has(code)) return true
      if (!current(expectedEpoch) || !validTarget(target)) return false
      const previous = keys.get(code)
      if (repeat || previous?.down && previous.epoch === epoch && !previous.canceled) return false
      keys.set(code, { target, epoch, down: true, used: false, canceled: false })
      return true
    },
    keyUp(code: string, target: string, expectedEpoch = epoch): boolean {
      const previous = keys.get(code)
      if (!previous) return true
      if (!current(expectedEpoch) || previous.epoch !== epoch || previous.canceled || previous.target !== target) { keys.delete(code); return false }
      previous.down = false
      if (code !== 'Space' || previous.used) keys.delete(code)
      return true
    },
    cancelKeys(target?: string): void {
      for (const [code, record] of keys) if (target === undefined || record.target === target) {
        if (!record.down) keys.delete(code)
        else record.canceled = true
      }
    },
    click(event: TetrisClickInput): TetrisActivationDecision {
      if (!current(event.epoch) || !validTarget(event.target) || !Number.isFinite(event.at) || event.defaultPrevented) return 'stale'
      const fromPointer = event.pointerId !== undefined && validPointerId(event.pointerId) && event.pointerType !== ''
      if (fromPointer) {
        const pointer = pointers.get(event.pointerId!)
        // An unknown/evicted hardware pointer is never upgraded to an accessibility activation.
        if (!pointer || pointer.token.target !== event.target) return 'stale'
        return pointer.token.epoch === epoch ? 'duplicate' : 'stale'
      }
      // Native non-pointer activation has pointerId -1/empty type. A missing ID is a legacy MouseEvent path.
      if (event.pointerId === undefined && (event.detail ?? 0) > 0) {
        const previous = [...pointers.values()].reverse().find(record => record.token.target === event.target && event.at >= record.lastAt && event.at - record.lastAt <= LEGACY_CLICK_WINDOW_MS)
        if (previous) {
          pointers.delete(previous.token.pointerId)
          return previous.token.epoch === epoch ? 'duplicate' : 'stale'
        }
      }
      const key = [...keys.entries()].reverse().find(([, record]) => record.target === event.target && record.epoch === epoch && !record.canceled)
      if (key) {
        const [code, record] = key
        if (record.down && record.used) return 'duplicate'
        record.used = true
        if (!record.down) keys.delete(code)
      }
      return 'activate'
    },
  }
}
