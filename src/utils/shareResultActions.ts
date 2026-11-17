import type { ShareCardData } from './shareCard.ts'

export interface ShareResultSnapshot {
  readonly card: ShareCardData
  readonly url: string
  readonly text: string
  readonly filename: string
}

/** Own the rows too: a parent's later edits cannot change an image being rendered. */
export function captureShareResult(card: ShareCardData, url: string, text: string | undefined, filename: string, cta: string): ShareResultSnapshot {
  const rows = card.rows?.map(row => Object.freeze({ label: row.label, value: row.value }))
  if (rows) Object.freeze(rows)
  return Object.freeze({
    card: Object.freeze({ tool: card.tool, label: card.label, headline: card.headline, sub: card.sub, cta: card.cta ?? cta, rows }),
    url, text: text ?? `${card.label} ${card.headline}`, filename,
  })
}

export interface ShareResultToken { readonly owner: symbol; readonly epoch: number; readonly request: number }

/** One committed result context; React effect replay gets a fresh activation epoch. */
export function createShareResultRequests(key: string) {
  const owner = Symbol('share-result')
  let active = false, epoch = 0, request = 0
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const clear = () => { for (const timer of timers) clearTimeout(timer); timers.clear() }
  const current = (token: ShareResultToken) => active && token.owner === owner && token.epoch === epoch && token.request === request
  return {
    key,
    activate() { active = true; epoch++ },
    begin(): ShareResultToken | null { if (!active) return null; clear(); return Object.freeze({ owner, epoch, request: ++request }) },
    current,
    invalidate() { request++; clear() },
    later(token: ShareResultToken, callback: () => void, delay: number) {
      if (!current(token)) return
      const timer = setTimeout(() => { timers.delete(timer); if (current(token)) callback() }, delay)
      timers.add(timer)
    },
    dispose() { active = false; epoch++; clear() },
  }
}

export interface ShareClipboardPorts {
  writeText?: (text: string) => Promise<void>
  fallback: (text: string, current: () => boolean) => boolean
}
export type ShareCopyOutcome = 'copied' | 'failed' | 'stale'

function legacyCopy(text: string, current: () => boolean): boolean {
  const previous = document.activeElement, field = document.createElement('textarea')
  field.value = text; field.readOnly = true
  field.style.position = 'fixed'; field.style.left = '-9999px'
  try {
    document.body.appendChild(field); field.focus(); field.select(); field.setSelectionRange(0, text.length)
    return current() && document.execCommand('copy') === true
  } finally {
    const restore = document.activeElement === field && current()
    field.remove()
    try { if (restore && typeof HTMLElement !== 'undefined' && previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true }) } catch { /* Selection cleanup does not change the copy outcome. */ }
  }
}

export async function copyShareResultLink(text: string, current: () => boolean, ports?: ShareClipboardPorts): Promise<ShareCopyOutcome> {
  if (!current()) return 'stale'
  try {
    const write = ports ? ports.writeText : typeof navigator !== 'undefined' && navigator.clipboard?.writeText
      ? (value: string) => navigator.clipboard.writeText(value) : undefined
    if (write) { await write(text); return current() ? 'copied' : 'stale' }
  } catch { /* A late rejection must not start a legacy copy for an old result. */ }
  if (!current()) return 'stale'
  try {
    const success = (ports?.fallback ?? legacyCopy)(text, current)
    return current() ? success === true ? 'copied' : 'failed' : 'stale'
  } catch { return current() ? 'failed' : 'stale' }
}

export interface ShareDownloadPorts {
  createUrl: (blob: Blob) => string
  revokeUrl: (url: string) => void
  click: (url: string, filename: string) => void
  schedule: (callback: () => void, delay: number) => unknown
  cancel: (timer: unknown) => void
}

/** URLs already submitted to the browser belong to the mount, not to a result edit. */
export function createShareResultDownloads(ports?: ShareDownloadPorts) {
  const io: ShareDownloadPorts = ports ?? {
    createUrl: blob => URL.createObjectURL(blob), revokeUrl: url => URL.revokeObjectURL(url),
    click(url, filename) {
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = filename
      try { document.body.appendChild(anchor); anchor.click() } finally { anchor.remove() }
    },
    schedule: (callback, delay) => setTimeout(callback, delay), cancel: timer => clearTimeout(timer as ReturnType<typeof setTimeout>),
  }
  let active = false
  const owned = new Map<string, { timer?: unknown; released: boolean }>()
  const release = (url: string) => {
    const entry = owned.get(url)
    if (!entry || entry.released) return
    entry.released = true; owned.delete(url)
    if (entry.timer !== undefined) { try { io.cancel(entry.timer) } catch { /* Still release the URL. */ } }
    try { io.revokeUrl(url) } catch { /* Cleanup is best effort and never reports a download success. */ }
  }
  return {
    activate() { active = true },
    download(blob: Blob, filename: string, current: () => boolean): 'started' | 'failed' | 'stale' {
      if (!active || !current()) return 'stale'
      let url: string | null = null
      try {
        url = io.createUrl(blob)
        const entry: { timer?: unknown; released: boolean } = { released: false }
        owned.set(url, entry)
        if (!active || !current()) { release(url); return 'stale' }
        io.click(url, filename)
        if (!entry.released) {
          const ownedUrl = url
          entry.timer = io.schedule(() => release(ownedUrl), 30_000)
          if (entry.released && entry.timer !== undefined) io.cancel(entry.timer)
        }
        return 'started'
      } catch { if (url !== null) release(url); return active && current() ? 'failed' : 'stale' }
    },
    dispose() { active = false; for (const url of [...owned.keys()]) release(url) },
  }
}
