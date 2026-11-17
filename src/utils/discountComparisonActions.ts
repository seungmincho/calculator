export interface DiscountActionToken { readonly revision: number; readonly request: number }
export function createDiscountComparisonGuard() {
  let revision = 0, request = 0
  return {
    begin(): DiscountActionToken { return Object.freeze({ revision, request: ++request }) },
    current(token: DiscountActionToken): boolean { return token.revision === revision && token.request === request },
    invalidate() { revision++ },
  }
}
export interface DiscountClipboardPorts { writeText?: (text: string) => Promise<void>; fallback: (text: string) => boolean }
export type DiscountCopyOutcome = 'copied' | 'failed' | 'stale'
function legacyCopy(text: string): boolean {
  const previous = document.activeElement, field = document.createElement('textarea')
  field.value = text; field.readOnly = true; field.style.position = 'fixed'; field.style.left = '-9999px'
  try { document.body.appendChild(field); field.focus(); field.select(); field.setSelectionRange(0, text.length); return document.execCommand('copy') === true }
  finally { field.remove(); try { if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true }) } catch { /* Focus is not a copy-success signal. */ } }
}
export async function copyDiscountComparison(text: string, current: () => boolean, ports?: DiscountClipboardPorts): Promise<DiscountCopyOutcome> {
  if (!current()) return 'stale'
  try {
    const write = ports ? ports.writeText : typeof navigator !== 'undefined' && navigator.clipboard?.writeText ? (value: string) => navigator.clipboard.writeText(value) : undefined
    if (write) { await write(text); return current() ? 'copied' : 'stale' }
  } catch { /* Only the current request may attempt a legacy clipboard operation. */ }
  if (!current()) return 'stale'
  try { const copied = ports ? ports.fallback(text) : legacyCopy(text); return current() ? copied === true ? 'copied' : 'failed' : 'stale' }
  catch { return current() ? 'failed' : 'stale' }
}
export interface DiscountDownloadPorts {
  createUrl: (blob: Blob) => string; revokeUrl: (url: string) => void; download: (url: string, filename: string) => void
  schedule: (callback: () => void) => unknown; cancel: (timer: unknown) => void
}
export function createDiscountComparisonDownloads(ports?: DiscountDownloadPorts) {
  const io: DiscountDownloadPorts = ports ?? {
    createUrl: blob => URL.createObjectURL(blob), revokeUrl: url => URL.revokeObjectURL(url),
    download(url, filename) { const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; try { document.body.appendChild(anchor); anchor.click() } finally { anchor.remove() } },
    schedule: callback => setTimeout(callback, 1000), cancel: timer => clearTimeout(timer as ReturnType<typeof setTimeout>),
  }
  const pending = new Map<string, { timer?: unknown }>()
  let disposed = false
  const release = (url: string) => {
    const entry = pending.get(url); if (!entry) return
    pending.delete(url)
    if (entry.timer !== undefined) { try { io.cancel(entry.timer) } catch { /* Continue URL cleanup. */ } }
    try { io.revokeUrl(url) } catch { /* Cleanup cannot change success into another download. */ }
  }
  return {
    download(text: string, current: () => boolean): 'started' | 'failed' | 'stale' {
      if (disposed || !current()) return 'stale'
      let url: string | null = null
      try {
        url = io.createUrl(new Blob([text], { type: 'text/plain;charset=utf-8' })); const entry: { timer?: unknown } = {}; pending.set(url, entry)
        if (disposed || !current()) { release(url); return 'stale' }
        io.download(url, 'discount-comparison.txt')
        if (pending.has(url)) { const owned = url; entry.timer = io.schedule(() => release(owned)); if (!pending.has(url)) io.cancel(entry.timer) }
        return current() ? 'started' : 'stale'
      } catch { if (url !== null) release(url); return current() ? 'failed' : 'stale' }
    },
    dispose() { disposed = true; for (const url of [...pending.keys()]) release(url) },
  }
}
