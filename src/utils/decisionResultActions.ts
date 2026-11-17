import { canExportOrder, type OrderRevealSnapshot } from './orderReveal.ts'

export const ORDER_RESULT_FILENAME = 'presentation-order.txt'
export interface DecisionResultSnapshot {
  readonly target: 'order' | 'roulette'
  readonly runId: number
  readonly text: string
}
export function createOrderResultSnapshot(state: OrderRevealSnapshot, line: (rank: number, name: string) => string): DecisionResultSnapshot | null {
  if (!canExportOrder(state)) return null
  return Object.freeze({ target: 'order', runId: state.runId, text: state.items.map((name, index) => line(index + 1, name)).join('\n') })
}
export function createRouletteResultSnapshot(result: string | null, runId: number): DecisionResultSnapshot | null {
  return result === null ? null : Object.freeze({ target: 'roulette', runId, text: result })
}
export function createDecisionResultGuard() {
  let revision = 0, request = 0
  return {
    begin() { return Object.freeze({ revision, request: ++request }) },
    isCurrent(token: { readonly revision: number; readonly request: number }): boolean { return token.revision === revision && token.request === request },
    invalidate(): void { revision++ },
  }
}
export interface DecisionClipboardPorts { writeText?: (text: string) => Promise<void>; fallback: (text: string) => boolean }
export type DecisionCopyOutcome = 'copied' | 'failed' | 'stale'
function legacyCopy(text: string): boolean {
  const active = document.activeElement, field = document.createElement('textarea')
  field.value = text; field.readOnly = true; field.style.position = 'fixed'; field.style.left = '-9999px'
  try {
    document.body.appendChild(field); field.focus(); field.select(); field.setSelectionRange(0, text.length)
    return document.execCommand('copy') === true
  } finally {
    field.remove()
    try { if (active instanceof HTMLElement && active.isConnected) active.focus({ preventScroll: true }) } catch { /* Copy does not depend on focus recovery. */ }
  }
}
export async function copyDecisionResult(snapshot: DecisionResultSnapshot, current: () => boolean, ports?: DecisionClipboardPorts): Promise<DecisionCopyOutcome> {
  if (!current()) return 'stale'
  try {
    const write = ports ? ports.writeText : typeof navigator !== 'undefined' && navigator.clipboard?.writeText ? (text: string) => navigator.clipboard.writeText(text) : undefined
    if (write) { await write(snapshot.text); return current() ? 'copied' : 'stale' }
  } catch { /* A late rejection must not start an obsolete legacy clipboard operation. */ }
  if (!current()) return 'stale'
  try {
    const copied = ports ? ports.fallback(snapshot.text) : legacyCopy(snapshot.text)
    return current() ? copied === true ? 'copied' : 'failed' : 'stale'
  } catch { return current() ? 'failed' : 'stale' }
}
export interface DecisionDownloadPorts {
  createUrl: (blob: Blob) => string
  revokeUrl: (url: string) => void
  download: (url: string, filename: string) => void
  schedule: (callback: () => void, delay: number) => unknown
  cancel: (timer: unknown) => void
}
export function createDecisionResultDownloads(ports?: DecisionDownloadPorts) {
  const io: DecisionDownloadPorts = ports ?? {
    createUrl: blob => URL.createObjectURL(blob), revokeUrl: url => URL.revokeObjectURL(url),
    download(url, filename) {
      const link = document.createElement('a')
      link.href = url; link.download = filename
      try { document.body.appendChild(link); link.click() } finally { link.remove() }
    },
    schedule: (callback, delay) => setTimeout(callback, delay), cancel: timer => clearTimeout(timer as ReturnType<typeof setTimeout>),
  }
  const pending = new Map<string, { timer?: unknown }>()
  let disposed = false
  const release = (url: string) => {
    const entry = pending.get(url)
    if (!entry) return
    pending.delete(url)
    if (entry.timer !== undefined) { try { io.cancel(entry.timer) } catch { /* Still release the URL. */ } }
    try { io.revokeUrl(url) } catch { /* Cleanup cannot claim download completion. */ }
  }
  return {
    download(snapshot: DecisionResultSnapshot, current: () => boolean): 'started' | 'failed' | 'stale' {
      if (disposed || snapshot.target !== 'order' || !current()) return 'stale'
      let url: string | null = null
      try {
        url = io.createUrl(new Blob([snapshot.text], { type: 'text/plain;charset=utf-8' }))
        const entry: { timer?: unknown } = {}
        pending.set(url, entry)
        if (disposed || !current()) { release(url); return 'stale' }
        io.download(url, ORDER_RESULT_FILENAME)
        if (pending.has(url)) {
          const ownedUrl = url
          entry.timer = io.schedule(() => release(ownedUrl), 1000)
          if (!pending.has(url)) io.cancel(entry.timer)
        }
        return 'started'
      } catch { if (url !== null) release(url); return 'failed' }
    },
    dispose(): void { disposed = true; for (const url of [...pending.keys()]) release(url) },
  }
}
