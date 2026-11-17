export type GpaCopyTarget = 'result' | 'link'
export type GpaCopyOutcome = 'copied' | 'failed' | 'stale'
export type GpaScale = '4.5' | '4.3' | '4.0' | '100'
export interface GpaClipboard {
  writeText?: (text: string) => Promise<void>
  fallback: (text: string) => boolean
}

export function readGpaCopyQuery(params: URLSearchParams): { scale: GpaScale; inputValue: string } {
  const scale = params.get('scale')
  return { scale: scale === '4.5' || scale === '4.3' || scale === '4.0' || scale === '100' ? scale : '4.5', inputValue: params.get('v') ?? '' }
}

/** Derive the copied URL from current inputs, even before the URL-sync effect runs. */
export function gpaShareUrl(currentUrl: string, scale: GpaScale, inputValue: string): string {
  const url = new URL(currentUrl)
  url.searchParams.delete('scale')
  url.searchParams.delete('v')
  if (scale !== '4.5') url.searchParams.set('scale', scale)
  if (inputValue) url.searchParams.set('v', inputValue)
  return url.toString()
}

export function createGpaCopyGuard() {
  let revision = 0
  let latestRequest = 0
  const requests = { result: 0, link: 0 }
  type Token = { target: GpaCopyTarget; revision: number; request: number; globalRequest: number }
  return {
    begin(target: GpaCopyTarget): Token { return { target, revision, request: ++requests[target], globalRequest: ++latestRequest } },
    isCurrent(token: Token): boolean { return token.revision === revision && token.request === requests[token.target] && token.globalRequest === latestRequest },
    invalidate(): void { revision++ },
  }
}

function legacyCopy(text: string): boolean {
  const active = document.activeElement
  const field = document.createElement('textarea')
  field.value = text
  field.readOnly = true
  field.style.position = 'fixed'
  field.style.left = '-999999px'
  document.body.appendChild(field)
  try {
    field.focus()
    field.select()
    field.setSelectionRange(0, text.length)
    return document.execCommand('copy') === true
  } finally {
    field.remove()
    if (active instanceof HTMLElement) active.focus({ preventScroll: true })
  }
}

/** A stale rejection must not fall back and overwrite the clipboard after a newer request. */
export async function copyGpaText(text: string, isCurrent: () => boolean = () => true, clipboard?: GpaClipboard): Promise<GpaCopyOutcome> {
  if (!isCurrent()) return 'stale'
  try {
    const write = clipboard ? clipboard.writeText : typeof navigator !== 'undefined' && navigator.clipboard?.writeText ? (value: string) => navigator.clipboard.writeText(value) : undefined
    if (write) {
      await write(text)
      return isCurrent() ? 'copied' : 'stale'
    }
  } catch { /* Try the legacy path only for the still-current request. */ }
  if (!isCurrent()) return 'stale'
  try {
    const copied = clipboard ? clipboard.fallback(text) : legacyCopy(text)
    return isCurrent() ? copied === true ? 'copied' : 'failed' : 'stale'
  } catch { return isCurrent() ? 'failed' : 'stale' }
}
