export type JsonTreeCopyTarget = 'output' | 'value' | 'pointer' | 'path'
export type JsonTreeCopyOutcome = 'copied' | 'failed' | 'stale'
export interface JsonTreeClipboardPort { writeText?: (text: string) => Promise<void>; fallback: (text: string) => boolean }

/** All formatter copy targets share one system Clipboard and one latest request. */
export function createJsonTreeCopyGuard() {
  let revision = 0, request = 0
  return {
    begin(target: JsonTreeCopyTarget) { return Object.freeze({ target, revision, request: ++request }) },
    isCurrent(token: { revision: number; request: number }): boolean { return token.revision === revision && token.request === request },
    invalidate(): void { revision++ },
  }
}

function legacyCopy(text: string): boolean {
  const active = document.activeElement, field = document.createElement('textarea')
  field.value = text; field.readOnly = true; field.style.position = 'fixed'; field.style.left = '-9999px'
  try {
    document.body.appendChild(field); field.focus(); field.select(); field.setSelectionRange(0, text.length)
    return document.execCommand('copy') === true
  } finally {
    field.remove()
    try { if (active instanceof HTMLElement) active.focus({ preventScroll: true }) } catch { /* Focus restoration cannot change the copy result. */ }
  }
}

/** An empty root Pointer is valid text. Late rejections never start a legacy write. */
export async function copyJsonTreeText(text: string, current: () => boolean, port?: JsonTreeClipboardPort): Promise<JsonTreeCopyOutcome> {
  if (!current()) return 'stale'
  try {
    const write = port ? port.writeText : typeof navigator !== 'undefined' && navigator.clipboard?.writeText ? (value: string) => navigator.clipboard.writeText(value) : undefined
    if (write) { await write(text); return current() ? 'copied' : 'stale' }
  } catch { /* Fallback is allowed only while this exact request is current. */ }
  if (!current()) return 'stale'
  try {
    const copied = port ? port.fallback(text) : legacyCopy(text)
    return current() ? copied === true ? 'copied' : 'failed' : 'stale'
  } catch { return current() ? 'failed' : 'stale' }
}
