export interface TypingClipboardPort { writeText?: (text: string) => Promise<void>; fallback: (text: string) => boolean }
export type TypingCopyOutcome = 'copied' | 'failed' | 'stale'

function legacyCopy(text: string): boolean {
  const previous = document.activeElement
  const field = document.createElement('textarea')
  field.value = text; field.readOnly = true
  field.style.position = 'fixed'; field.style.left = '-9999px'
  try {
    document.body.appendChild(field)
    field.focus(); field.select(); field.setSelectionRange(0, text.length)
    return document.execCommand('copy') === true
  } finally {
    field.remove()
    try { if (previous instanceof HTMLElement) previous.focus({ preventScroll: true }) } catch { /* Focus restoration is separate from copy success. */ }
  }
}

/** Share only the caller's summary, and never report a stale result or a failed legacy copy as success. */
export async function copyTypingSummary(text: string, isCurrent: () => boolean, port?: TypingClipboardPort): Promise<TypingCopyOutcome> {
  if (!isCurrent()) return 'stale'
  try {
    const write = port ? port.writeText : typeof navigator !== 'undefined' && navigator.clipboard?.writeText ? (value: string) => navigator.clipboard.writeText(value) : undefined
    if (write) { await write(text); return isCurrent() ? 'copied' : 'stale' }
  } catch { /* A current request may try the local legacy path. */ }
  if (!isCurrent()) return 'stale'
  try {
    const copied = port ? port.fallback(text) : legacyCopy(text)
    return !isCurrent() ? 'stale' : copied ? 'copied' : 'failed'
  } catch { return isCurrent() ? 'failed' : 'stale' }
}
