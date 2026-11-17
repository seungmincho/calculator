export interface RegexActionToken { revision: number; request: number }
export function createRegexActionGuard() {
  let revision = 0, request = 0, context = '', alive = false
  return {
    activate() { alive = true },
    dispose() { alive = false; revision++ },
    invalidate() { revision++ },
    context(value: string) { if (value !== context) { context = value; revision++ } },
    begin(): RegexActionToken { return { revision, request: ++request } },
    current(token: RegexActionToken) { return alive && token.revision === revision && token.request === request },
  }
}
export async function copyRegexText(text: string, current: () => boolean): Promise<'copied' | 'failed' | 'stale'> {
  if (!current()) return 'stale'
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return current() ? 'copied' : 'stale' } } catch { /* Only the current request may fall back. */ }
  if (!current()) return 'stale'
  const previous = document.activeElement
  let field: HTMLTextAreaElement | null = null
  try {
    field = document.createElement('textarea'); field.value = text; field.readOnly = true
    field.style.position = 'fixed'; field.style.left = '-9999px'
    document.body.appendChild(field); field.focus(); field.select(); field.setSelectionRange(0, text.length)
    const success = current() && document.execCommand('copy') === true
    return current() ? success ? 'copied' : 'failed' : 'stale'
  } catch { return current() ? 'failed' : 'stale' }
  finally { try { field?.remove() } catch { /* Cleanup cannot turn a handled copy failure into a rejected promise. */ } try { if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true }) } catch { /* Selection is not copy success. */ } }
}
