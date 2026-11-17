export type NumberCopyTarget = 'formal' | 'formal-mobile' | 'contract' | 'chinese' | 'mixed' | 'reading' | 'english' | 'link' | 'batch'
export type NumberCopyOutcome = 'copied' | 'failed' | 'stale'
export interface NumberCopyToken { readonly revision: number; readonly request: number; readonly target: NumberCopyTarget }
export interface NumberClipboard {
  writeText?: (text: string) => Promise<void>
  fallback: (text: string, isCurrent: () => boolean) => boolean
}

export function createNumberCopyGuard() {
  let revision = 0, request = 0, current: NumberCopyToken | null = null
  return {
    begin(target: NumberCopyTarget): NumberCopyToken { current = Object.freeze({ revision, request: ++request, target }); return current },
    isCurrent(token: NumberCopyToken) { return current === token && token.revision === revision },
    invalidate() { revision++; current = null },
  }
}

/** Selection may synchronously trigger blur handlers. Check ownership again before execCommand. */
export function legacyNumberCopy(text: string, isCurrent: () => boolean, doc: Document = document): boolean {
  if (!isCurrent()) return false
  const active = doc.activeElement as HTMLElement | null
  const field = doc.createElement('textarea')
  field.value = text; field.readOnly = true; field.style.position = 'fixed'; field.style.left = '-999999px'
  try {
    doc.body.appendChild(field)
    field.focus(); field.select(); field.setSelectionRange(0, text.length)
    return isCurrent() && doc.execCommand('copy') === true
  } finally {
    try { field.remove() } finally {
      if (isCurrent() && active?.isConnected && typeof active.focus === 'function') active.focus({ preventScroll: true })
    }
  }
}

export async function copyNumberText(text: string, isCurrent: () => boolean, clipboard?: NumberClipboard): Promise<NumberCopyOutcome> {
  if (!isCurrent()) return 'stale'
  if (!text) return 'failed'
  try {
    const write = clipboard ? clipboard.writeText : typeof globalThis.navigator?.clipboard?.writeText === 'function'
      ? (value: string) => navigator.clipboard.writeText(value) : undefined
    if (write) { await write(text); return isCurrent() ? 'copied' : 'stale' }
  } catch { /* A current request may still use the legacy fallback. */ }
  if (!isCurrent()) return 'stale'
  try {
    const copied = clipboard ? clipboard.fallback(text, isCurrent) : legacyNumberCopy(text, isCurrent)
    return isCurrent() ? copied === true ? 'copied' : 'failed' : 'stale'
  } catch { return isCurrent() ? 'failed' : 'stale' }
}

export interface NumberCopyRequest { target: NumberCopyTarget; text: string; label: string }
export interface NumberCopyState extends NumberCopyRequest { token: NumberCopyToken; status: 'copying' | 'copied' | 'failed' }
export interface NumberCopyPorts { clipboard?: NumberClipboard; after: (callback: () => void, delayMs: number) => () => void }

/** A parent-owned controller covers all single-result, URL and batch clipboard targets. */
export function createNumberCopyController(ports: NumberCopyPorts, onChange: (state: NumberCopyState | null) => void) {
  const guard = createNumberCopyGuard()
  let state: NumberCopyState | null = null, cancelTimer: (() => void) | null = null, disposed = false
  const snapshot = () => state ? { ...state } : null
  const emit = () => { if (!disposed) onChange(snapshot()) }
  const clearTimer = () => { cancelTimer?.(); cancelTimer = null }
  const invalidate = () => { clearTimer(); guard.invalidate(); state = null; emit() }
  async function request(value: NumberCopyRequest): Promise<NumberCopyOutcome> {
    if (disposed) return 'stale'
    if (!value.text) return 'failed'
    const captured = { target: value.target, text: value.text, label: value.label }
    clearTimer()
    const token = guard.begin(captured.target)
    state = { ...captured, token, status: 'copying' }; emit()
    const current = () => !disposed && guard.isCurrent(token)
    const result = await copyNumberText(captured.text, current, ports.clipboard)
    if (!current() || result === 'stale') return 'stale'
    state = { ...captured, token, status: result }; emit()
    if (result === 'copied' && current()) cancelTimer = ports.after(() => {
      if (current() && state?.status === 'copied') invalidate()
    }, 2000)
    return result
  }
  return {
    getSnapshot: snapshot, request, invalidate,
    retry(token: NumberCopyToken): Promise<NumberCopyOutcome> {
      return !disposed && guard.isCurrent(token) && state?.status === 'failed' ? request(state) : Promise.resolve('stale')
    },
    close(token: NumberCopyToken) { if (!disposed && guard.isCurrent(token)) invalidate() },
    dispose() { if (!disposed) { disposed = true; clearTimer(); guard.invalidate(); state = null } },
  }
}
