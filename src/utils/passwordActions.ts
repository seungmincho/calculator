export type PasswordCopyTarget = number | 'all'
export type PasswordCopyOutcome = 'copied' | 'failed' | 'stale'
export interface PasswordClipboardPorts {
  writeText?: (text: string) => Promise<void>
  fallbackText: (text: string) => boolean
}

/** Call outside React state updaters: one valid position consumes exactly one generation. */
export function regeneratePasswordResult(results: string[], index: number, generate: () => string): string[] {
  if (!Number.isInteger(index) || index < 0 || index >= results.length) return results
  const value = generate()
  return results.map((previous, position) => position === index ? value : previous)
}

/** Individual and full-list copies share one request order and one results revision. */
export function createPasswordCopyGuard() {
  let revision = 0, request = 0
  type Token = { revision: number; request: number }
  return {
    begin(): Token { return { revision, request: ++request } },
    isCurrent(token: Token): boolean { return token.revision === revision && token.request === request },
    invalidate(): void { revision++ },
  }
}

function legacyCopy(text: string): boolean {
  const active = document.activeElement
  const field = document.createElement('textarea')
  field.value = text; field.readOnly = true
  field.style.position = 'fixed'; field.style.left = '-9999px'
  try {
    document.body.appendChild(field)
    field.focus(); field.select(); field.setSelectionRange(0, text.length)
    return document.execCommand('copy') === true
  } finally {
    field.remove()
    try { if (active instanceof HTMLElement) active.focus({ preventScroll: true }) } catch { /* Focus recovery does not change the copy outcome. */ }
  }
}

/** A late clipboard rejection cannot start a legacy copy for obsolete generated results. */
export async function copyPasswordText(
  text: string,
  isCurrent: () => boolean,
  ports?: PasswordClipboardPorts,
): Promise<PasswordCopyOutcome> {
  if (!isCurrent()) return 'stale'
  try {
    const write = ports ? ports.writeText : typeof navigator !== 'undefined' && navigator.clipboard?.writeText ? (value: string) => navigator.clipboard.writeText(value) : undefined
    if (write) {
      await write(text)
      return isCurrent() ? 'copied' : 'stale'
    }
  } catch { /* Only a current request may try the local fallback. */ }
  if (!isCurrent()) return 'stale'
  try {
    const copied = ports ? ports.fallbackText(text) : legacyCopy(text)
    return isCurrent() ? copied === true ? 'copied' : 'failed' : 'stale'
  } catch { return isCurrent() ? 'failed' : 'stale' }
}
