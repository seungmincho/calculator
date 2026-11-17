import { copyShareResultLink, type ShareClipboardPorts, type ShareCopyOutcome } from './shareResultActions.ts'

export interface UnitCopyRequest { readonly id: string; readonly text: string; readonly label: string }
export interface UnitCopyToken { readonly sequence: number }
export interface UnitCopyState extends UnitCopyRequest { readonly token: UnitCopyToken; readonly status: 'copying' | 'copied' | 'failed' }
export interface UnitCopyPorts { clipboard?: ShareClipboardPorts; after: (callback: () => void, ms: number) => () => void }

/** Parent-owned: single values, rows and the full batch share one latest clipboard request. */
export function createUnitCopyController(ports: UnitCopyPorts, onChange: (state: UnitCopyState | null) => void) {
  let sequence = 0, alive = true, token: UnitCopyToken | null = null, state: UnitCopyState | null = null, cancel: (() => void) | null = null
  const current = (candidate: UnitCopyToken) => alive && candidate === token
  const clearTimer = () => { cancel?.(); cancel = null }
  const invalidate = () => { clearTimer(); token = null; state = null; if (alive) onChange(null) }
  async function request(value: UnitCopyRequest): Promise<ShareCopyOutcome> {
    if (!alive) return 'stale'
    if (!value.text) return 'failed'
    clearTimer(); const next = Object.freeze({ sequence: ++sequence }); token = next
    const captured = Object.freeze({ id: value.id, text: value.text, label: value.label })
    state = Object.freeze({ ...captured, token: next, status: 'copying' }); onChange(state)
    const outcome = await copyShareResultLink(captured.text, () => current(next), ports.clipboard)
    if (!current(next) || outcome === 'stale') return 'stale'
    state = Object.freeze({ ...captured, token: next, status: outcome === 'copied' ? 'copied' : 'failed' }); onChange(state)
    if (outcome === 'copied' && current(next)) cancel = ports.after(() => { if (current(next)) invalidate() }, 2000)
    return outcome
  }
  return {
    request, invalidate, getSnapshot: () => state,
    retry(candidate: UnitCopyToken): Promise<ShareCopyOutcome> { return current(candidate) && state?.status === 'failed' ? request(state) : Promise.resolve('stale') },
    close(candidate: UnitCopyToken) { if (current(candidate)) invalidate() },
    dispose() { alive = false; clearTimer(); token = null; state = null },
  }
}
