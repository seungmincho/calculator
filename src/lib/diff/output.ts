import { copyShareResultLink, createShareResultDownloads, type ShareClipboardPorts, type ShareDownloadPorts, type ShareCopyOutcome } from '../../utils/shareResultActions.ts'

export interface DiffOutputRequest { readonly target: 'comparison' | 'merged'; readonly text: string; readonly label: string; readonly filename: string }
export interface DiffOutputToken { readonly sequence: number }
export type DiffOutputState = Readonly<DiffOutputRequest & { token: DiffOutputToken } & (
  { kind: 'copy'; status: 'copying' | 'copied' | 'failed' } | { kind: 'download'; status: 'started' | 'failed' }
)>
interface Ports { clipboard?: ShareClipboardPorts; downloads?: ShareDownloadPorts; after?: (callback: () => void, milliseconds: number) => () => void }

/** Comparison and merged text share one output owner; their source documents never change. */
export function createTextDiffOutput(onChange: (state: DiffOutputState | null) => void, ports: Ports = {}) {
  const downloads = createShareResultDownloads(ports.downloads)
  let active = false, sequence = 0, token: DiffOutputToken | null = null, state: DiffOutputState | null = null
  let clearNotice: (() => void) | null = null
  const after = ports.after ?? ((callback, milliseconds) => { const timer = setTimeout(callback, milliseconds); return () => clearTimeout(timer) })
  const current = (candidate: DiffOutputToken) => active && token === candidate
  const clearTimer = () => { clearNotice?.(); clearNotice = null }
  const invalidate = () => { clearTimer(); token = null; state = null; if (active) onChange(null) }
  const begin = () => { clearTimer(); const next = Object.freeze({ sequence: ++sequence }); token = next; return next }
  const capture = (value: DiffOutputRequest): DiffOutputRequest => Object.freeze({ target: value.target, text: value.text, label: value.label, filename: value.filename })
  const later = (candidate: DiffOutputToken) => { if (current(candidate)) clearNotice = after(() => { if (current(candidate)) invalidate() }, 2000) }

  async function copy(request: DiffOutputRequest): Promise<ShareCopyOutcome> {
    if (!active) return 'stale'
    const captured = capture(request), owned = begin()
    // Empty merged documents are legitimate: an explicit copy may clear the clipboard.
    state = Object.freeze({ ...captured, token: owned, kind: 'copy', status: 'copying' }); onChange(state)
    const outcome = await copyShareResultLink(captured.text, () => current(owned), ports.clipboard)
    if (!current(owned) || outcome === 'stale') return 'stale'
    state = Object.freeze({ ...captured, token: owned, kind: 'copy', status: outcome === 'copied' ? 'copied' : 'failed' }); onChange(state)
    if (outcome === 'copied') later(owned)
    return outcome
  }
  function download(request: DiffOutputRequest): 'started' | 'failed' | 'stale' {
    if (!active) return 'stale'
    const captured = capture(request), owned = begin()
    let outcome: 'started' | 'failed' | 'stale'
    try { outcome = downloads.download(new Blob([captured.text], { type: 'text/plain;charset=utf-8' }), captured.filename, () => current(owned)) }
    catch { outcome = current(owned) ? 'failed' : 'stale' }
    if (!current(owned) || outcome === 'stale') return 'stale'
    state = Object.freeze({ ...captured, token: owned, kind: 'download', status: outcome }); onChange(state)
    if (outcome === 'started') later(owned)
    return outcome
  }
  return {
    copy, download, current, invalidate, getSnapshot: () => state,
    activate() { active = true; downloads.activate(); invalidate() },
    dispose() { active = false; clearTimer(); token = null; state = null; downloads.dispose() },
    close(candidate: DiffOutputToken) { if (current(candidate)) invalidate() },
    retry(candidate: DiffOutputToken): Promise<ShareCopyOutcome> { return current(candidate) && state?.kind === 'copy' && state.status === 'failed' ? copy(state) : Promise.resolve('stale') },
  }
}
