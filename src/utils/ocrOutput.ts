export type OcrDownloadOutcome = 'started' | 'empty' | 'failed' | 'stale'

/** Dispatch the exact current text; success describes dispatch, never a confirmed disk write. */
export function downloadOcrText(text: string, isCurrent: () => boolean): OcrDownloadOutcome {
  if (!isCurrent()) return 'stale'
  if (!text) return 'empty'
  let link: HTMLAnchorElement | undefined, url: string | undefined, dispatched = false
  try {
    link = document.createElement('a')
    url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    link.href = url
    link.download = 'ocr-result.txt'
    document.body.appendChild(link)
    if (!isCurrent()) return 'stale'
    link.click()
    dispatched = true
    return isCurrent() ? 'started' : 'stale'
  } catch { return isCurrent() ? 'failed' : 'stale' }
  finally {
    try { link?.remove() } catch { /* URL cleanup still runs if removing a detached anchor fails. */ }
    if (url !== undefined) {
      const ownedUrl = url
      const revoke = () => { try { URL.revokeObjectURL(ownedUrl) } catch { /* Cleanup cannot turn a failed request into success. */ } }
      if (dispatched) { try { setTimeout(revoke, 1000) } catch { revoke() } }
      else revoke()
    }
  }
}
