export async function installOcrOutputPorts(context) {
  await context.addInitScript(() => {
    const clipboard = navigator.clipboard, nativeWrite = clipboard?.writeText.bind(clipboard), nativeRead = clipboard?.readText.bind(clipboard), legacy = document.execCommand.bind(document)
    window.__ocrClipboardMode = 'native'; window.__ocrLegacyMode = 'false'; window.__ocrClipboardCalls = []; window.__ocrClipboardPending = []; window.__ocrLegacyCalls = []; window.__ocrNativeRead = nativeRead
    const api = { writeText(text) {
      window.__ocrClipboardCalls.push(String(text))
      if (window.__ocrClipboardMode === 'reject') return Promise.reject(new DOMException('Synthetic clipboard denied', 'NotAllowedError'))
      if (window.__ocrClipboardMode === 'hold') return new Promise((resolve, reject) => window.__ocrClipboardPending.push({ text, resolve, reject }))
      return nativeWrite(text)
    } }
    window.__setOcrClipboard = mode => { window.__ocrClipboardMode = mode; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: mode === 'absent' ? undefined : api }) }
    window.__setOcrClipboard('native')
    document.execCommand = (command, ...args) => { if (command !== 'copy') return legacy(command, ...args); window.__ocrLegacyCalls.push(document.activeElement?.value ?? ''); if (window.__ocrLegacyMode === 'throw') throw new Error('Synthetic legacy copy failure'); if (window.__ocrLegacyMode === 'native') return legacy(command, ...args); return window.__ocrLegacyMode === 'true' }
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL), click = HTMLAnchorElement.prototype.click, select = HTMLTextAreaElement.prototype.select
    window.__ocrOutputFailure = ''; window.__ocrOutputUrls = []; window.__ocrSelectionFailure = false
    URL.createObjectURL = blob => { if (blob.type.startsWith('text/plain') && window.__ocrOutputFailure === 'url') throw new Error('Synthetic text URL failure'); const url = create(blob); if (blob.type.startsWith('text/plain')) window.__ocrOutputUrls.push({ url, bytes: blob.size, type: blob.type, revoked: false }); return url }
    URL.revokeObjectURL = url => { const item = window.__ocrOutputUrls.find(item => item.url === url); if (item) item.revoked = true; return revoke(url) }
    HTMLAnchorElement.prototype.click = function () { if (this.download === 'ocr-result.txt' && window.__ocrOutputFailure === 'anchor') throw new Error('Synthetic text anchor failure'); return click.call(this) }
    HTMLTextAreaElement.prototype.select = function () { if (this.hasAttribute('data-ocr-copy-manual') && window.__ocrSelectionFailure) throw new Error('Synthetic selection failure'); return select.call(this) }
  })
}
