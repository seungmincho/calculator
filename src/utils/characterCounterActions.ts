import { copyShareResultLink, type ShareClipboardPorts, type ShareCopyOutcome } from './shareResultActions.ts'

export interface CharacterCopyRequest { readonly text: string; readonly tab: number; readonly revision: number; readonly kind: 'copy' | 'speller' }
export interface CharacterCopyState extends CharacterCopyRequest { readonly token: object; readonly status: 'copying' | 'copied' | 'failed' }
export function createCharacterCopy(ports: { clipboard?: ShareClipboardPorts; after: (callback: () => void, ms: number) => () => void }, onChange: (state: CharacterCopyState | null) => void) {
  let alive = true, state: CharacterCopyState | null = null, token: object | null = null, timer: (() => void) | null = null
  const clearTimer = () => { timer?.(); timer = null }
  const current = (request: object) => alive && request === token
  const invalidate = () => { clearTimer(); token = null; state = null; if (alive) onChange(null) }
  const request = async (value: CharacterCopyRequest): Promise<ShareCopyOutcome> => {
    if (!alive) return 'stale'
    if (!value.text) { invalidate(); return 'failed' }
    clearTimer(); const owner = Object.freeze({}); token = owner
    const captured = { text: value.text, tab: value.tab, revision: value.revision, kind: value.kind }
    state = Object.freeze({ ...captured, token: owner, status: 'copying' }); onChange(state)
    const result = await copyShareResultLink(captured.text, () => current(owner), ports.clipboard)
    if (!current(owner) || result === 'stale') return 'stale'
    state = Object.freeze({ ...captured, token: owner, status: result === 'copied' ? 'copied' : 'failed' }); onChange(state)
    if (result === 'copied') timer = ports.after(() => { if (current(owner)) invalidate() }, 2000)
    return result
  }
  return { request, invalidate, getSnapshot: () => state,
    retry(owner: object) { return current(owner) && state?.status === 'failed' ? request(state) : Promise.resolve<ShareCopyOutcome>('stale') },
    close(owner: object) { if (current(owner)) invalidate() },
    dispose() { alive = false; clearTimer(); token = null; state = null },
  }
}
