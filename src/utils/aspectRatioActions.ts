/** Independent instances are used for source reads, render/export work and all copy targets. */
export function createAspectRequestGuard() {
  let request = 0, alive = true
  return { begin: () => ++request, isCurrent: (token: number) => alive && token === request, invalidate: () => { request++ }, dispose: () => { alive = false; request++ } }
}
export interface AspectClipboardPort { writeText?: (text: string) => Promise<void>; fallback: (text: string) => boolean }
function legacyCopy(text: string): boolean {
  const active = document.activeElement, field = document.createElement('textarea')
  field.value = text; field.readOnly = true; field.style.position = 'fixed'; field.style.left = '-9999px'
  try { document.body.appendChild(field); field.focus(); field.select(); field.setSelectionRange(0, text.length); return document.execCommand('copy') === true }
  finally { field.remove(); try { if (active instanceof HTMLElement) active.focus({ preventScroll: true }) } catch { /* Copy outcome is independent of focus restoration. */ } }
}
export async function copyAspectText(text: string, current: () => boolean, port?: AspectClipboardPort): Promise<'copied' | 'failed' | 'stale'> {
  if (!current()) return 'stale'
  try {
    const write = port ? port.writeText : navigator.clipboard?.writeText ? (value: string) => navigator.clipboard.writeText(value) : undefined
    if (write) { await write(text); return current() ? 'copied' : 'stale' }
  } catch { /* A stale failure must never start a second system clipboard write. */ }
  if (!current()) return 'stale'
  try { const copied = port ? port.fallback(text) : legacyCopy(text); return current() ? copied === true ? 'copied' : 'failed' : 'stale' }
  catch { return current() ? 'failed' : 'stale' }
}
