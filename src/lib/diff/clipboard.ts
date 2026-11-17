export interface DiffClipboardPort { writeText?: (text: string) => Promise<void>; fallback: (text: string) => boolean }
export type DiffCopyOutcome = 'copied' | 'failed' | 'stale'

function legacyCopy(text: string): boolean {
  const previous = document.activeElement
  const field = document.createElement('textarea')
  field.value = text; field.readOnly = true
  field.style.position = 'fixed'; field.style.left = '-9999px'
  document.body.appendChild(field)
  try { field.focus(); field.select(); field.setSelectionRange(0, text.length); return document.execCommand('copy') === true }
  finally { field.remove(); if (previous instanceof HTMLElement) previous.focus({ preventScroll: true }) }
}

export async function copyDiffText(text: string, isCurrent: () => boolean, port?: DiffClipboardPort): Promise<DiffCopyOutcome> {
  if (!isCurrent()) return 'stale'
  try {
    const write = port ? port.writeText : typeof navigator !== 'undefined' && navigator.clipboard?.writeText ? (value: string) => navigator.clipboard.writeText(value) : undefined
    if (write) { await write(text); return isCurrent() ? 'copied' : 'stale' }
  } catch { /* Only the still-current action may attempt the fallback. */ }
  if (!isCurrent()) return 'stale'
  try {
    const copied = port ? port.fallback(text) : legacyCopy(text)
    return !isCurrent() ? 'stale' : copied ? 'copied' : 'failed'
  } catch { return isCurrent() ? 'failed' : 'stale' }
}
