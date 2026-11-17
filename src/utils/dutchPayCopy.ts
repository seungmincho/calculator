export type DutchPayCopyTarget = 'amount' | 'notice' | 'link'
export interface DutchPayCopySnapshot { readonly target: DutchPayCopyTarget; readonly id: string; readonly text: string }
export interface DutchPayCopyToken { readonly owner: symbol; readonly generation: number; readonly request: number }

export function captureDutchPayCopy(target: DutchPayCopyTarget, id: string, text: string): DutchPayCopySnapshot {
  return Object.freeze({ target, id, text })
}

/** One owner for every amount, notice and link; activation also supports effect replay. */
export function createDutchPayCopyGuard() {
  const owner = Symbol('dutch-pay-copy')
  let active = true, generation = 0, request = 0
  return {
    begin(): DutchPayCopyToken | null { return active ? Object.freeze({ owner, generation, request: ++request }) : null },
    current(token: DutchPayCopyToken): boolean { return active && token.owner === owner && token.generation === generation && token.request === request },
    invalidate() { generation++ },
    activate() { active = true; generation++ },
    dispose() { active = false; generation++ },
  }
}

export interface DutchPayClipboardPorts { writeText?: (text: string) => Promise<void>; fallback: (text: string, current: () => boolean) => boolean }
export type DutchPayCopyOutcome = 'copied' | 'failed' | 'stale'

function legacyCopy(text: string, current: () => boolean): boolean {
  const previous = document.activeElement, field = document.createElement('textarea')
  field.value = text; field.readOnly = true; field.style.position = 'fixed'; field.style.left = '-9999px'
  try {
    document.body.appendChild(field); field.focus(); field.select(); field.setSelectionRange(0, text.length)
    return current() && document.execCommand('copy') === true
  } finally {
    const restore = document.activeElement === field && current()
    field.remove()
    try { if (restore && typeof HTMLElement !== 'undefined' && previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true }) } catch { /* Selection cleanup does not make a copy successful. */ }
  }
}

export async function copyDutchPayText(snapshot: DutchPayCopySnapshot, current: () => boolean, ports?: DutchPayClipboardPorts): Promise<DutchPayCopyOutcome> {
  if (!current()) return 'stale'
  try {
    const write = ports ? ports.writeText : typeof navigator !== 'undefined' && navigator.clipboard?.writeText ? (text: string) => navigator.clipboard.writeText(text) : undefined
    if (write) { await write(snapshot.text); return current() ? 'copied' : 'stale' }
  } catch { /* Only the latest request may fall back after a native rejection. */ }
  if (!current()) return 'stale'
  try {
    const result = (ports?.fallback ?? legacyCopy)(snapshot.text, current)
    return current() ? result === true ? 'copied' : 'failed' : 'stale'
  } catch { return current() ? 'failed' : 'stale' }
}
