export type PercentOutputTarget = 'comparison' | 'download' | 'of' | 'ratio' | 'change' | 'discount' | 'reverse' | 'chain' | 'pp' | 'vat'
export type PercentOutputOutcome = 'success' | 'failed' | 'stale'
export function createPercentOutputOwner() {
  let sequence = 0, alive = true
  return {
    begin(target: PercentOutputTarget) { return Object.freeze({ sequence: ++sequence, target }) },
    current(token: { sequence: number }): boolean { return alive && token.sequence === sequence },
    invalidate() { sequence++ },
    mount() { alive = true; sequence++ },
    dispose() { alive = false; sequence++ },
  }
}
export interface PercentClipboardPort { writeText?: (text: string) => Promise<void>; fallback: (text: string) => boolean }
function legacyCopy(text: string): boolean {
  const field = document.createElement('textarea'), active = document.activeElement
  field.value = text; field.readOnly = true; field.style.position = 'fixed'; field.style.left = '-9999px'
  try { document.body.appendChild(field); field.focus(); field.select(); field.setSelectionRange(0, text.length); return document.execCommand('copy') === true }
  finally { field.remove(); try { if (active instanceof HTMLElement) active.focus({ preventScroll: true }) } catch { /* Focus is not the copy result. */ } }
}
/** A rejected obsolete request never performs a second system clipboard write. */
export async function copyPercentText(text: string, current: () => boolean, port?: PercentClipboardPort): Promise<PercentOutputOutcome> {
  if (!current()) return 'stale'
  try {
    const write = port ? port.writeText : typeof navigator !== 'undefined' && navigator.clipboard?.writeText ? (value: string) => navigator.clipboard.writeText(value) : undefined
    if (write) { await write(text); return current() ? 'success' : 'stale' }
  } catch { /* Only the latest context may try legacy copy. */ }
  if (!current()) return 'stale'
  try { const done = port ? port.fallback(text) : legacyCopy(text); return current() ? done === true ? 'success' : 'failed' : 'stale' }
  catch { return current() ? 'failed' : 'stale' }
}
export interface PercentDownloadPort { save: (text: string, filename: string) => void }
function saveText(text: string, filename: string) {
  const link = document.createElement('a'), url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  try { link.href = url; link.download = filename; document.body.appendChild(link); link.click() }
  finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 0) }
}
/** Success means the browser download request was dispatched, not that a file was saved. */
export function downloadPercentText(text: string, current: () => boolean, port: PercentDownloadPort = { save: saveText }): PercentOutputOutcome {
  if (!current()) return 'stale'
  if (!text) return 'failed'
  try { port.save(text, 'percent-comparison.txt'); return current() ? 'success' : 'stale' }
  catch { return current() ? 'failed' : 'stale' }
}
