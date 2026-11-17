import { qrBatchPrintHtml, type QrBatchPrintLabels, type QrBatchPrintPlan } from './qrBatchPrint'

export const QR_BATCH_PRINT_DECODE_TIMEOUT = 15_000
const AFTER_PRINT_CLEANUP_TIMEOUT = 120_000
export type QrBatchPrintOutcome = 'opened' | 'cancelled' | 'failed'
export interface QrBatchPrintDocument {
  decode: () => Promise<void>
  print: () => void
  onAfterPrint: (callback: () => void) => void
  dispose: () => void
}
export interface QrBatchPrintJob {
  done: Promise<QrBatchPrintOutcome>
  cancel: () => void
}

function mountPrintDocument(html: string): QrBatchPrintDocument {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.setAttribute('data-qr-batch-print-frame', '')
  frame.tabIndex = -1
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0'
  document.body.appendChild(frame)
  const win = frame.contentWindow
  if (!win) { frame.remove(); throw new Error('Print frame unavailable') }
  let afterPrint: (() => void) | undefined
  try {
    win.document.open()
    win.document.write(html)
    win.document.close()
  } catch (error) { frame.remove(); throw error }
  return {
    decode: async () => {
      const images = Array.from(win.document.images)
      if (!images.length) throw new Error('No printable images')
      await Promise.all(images.map(async image => {
        await image.decode()
        if (image.naturalWidth !== 512 || image.naturalHeight !== 512) throw new Error('Invalid QR image')
      }))
    },
    print: () => { win.focus(); win.print() },
    onAfterPrint: callback => { afterPrint = callback; win.addEventListener('afterprint', callback, { once: true }) },
    dispose: () => { if (afterPrint) win.removeEventListener('afterprint', afterPrint); frame.remove() },
  }
}

/** Each job owns its frame, timers and callback. Cancellation also settles a hung decode. */
export function startQrBatchPrint(
  plan: QrBatchPrintPlan,
  labels: QrBatchPrintLabels,
  locale: string,
  isCurrent: () => boolean,
  mount: (html: string) => QrBatchPrintDocument = mountPrintDocument,
): QrBatchPrintJob {
  let cancelled = false
  let frame: QrBatchPrintDocument | undefined
  let decodeTimer: ReturnType<typeof setTimeout> | undefined
  let cleanupTimer: ReturnType<typeof setTimeout> | undefined
  let settleCancel: (() => void) | undefined
  const cancellation = new Promise<'cancelled'>(resolve => { settleCancel = () => resolve('cancelled') })
  const cleanup = () => {
    if (decodeTimer !== undefined) clearTimeout(decodeTimer)
    if (cleanupTimer !== undefined) clearTimeout(cleanupTimer)
    frame?.dispose()
    frame = undefined
  }
  const cancel = () => { cancelled = true; settleCancel?.(); cleanup() }
  const current = () => !cancelled && isCurrent()
  const done = Promise.resolve().then(async (): Promise<QrBatchPrintOutcome> => {
    try {
      if (!current()) return 'cancelled'
      frame = mount(qrBatchPrintHtml(plan, labels, locale))
      if (!current()) { cleanup(); return 'cancelled' }
      const timeout = new Promise<'failed'>(resolve => { decodeTimer = setTimeout(() => resolve('failed'), QR_BATCH_PRINT_DECODE_TIMEOUT) })
      const decoded = await Promise.race([frame.decode().then(() => 'decoded' as const), cancellation, timeout])
      if (decodeTimer !== undefined) clearTimeout(decodeTimer)
      if (decoded === 'cancelled' || !current()) { cleanup(); return 'cancelled' }
      if (decoded !== 'decoded') { cleanup(); return 'failed' }
      frame?.onAfterPrint(cleanup)
      cleanupTimer = setTimeout(cleanup, AFTER_PRINT_CLEANUP_TIMEOUT)
      // afterprint may run synchronously while print() owns the browser dialog.
      frame?.print()
      return 'opened'
    } catch {
      const outcome = current() ? 'failed' : 'cancelled'
      cleanup()
      return outcome
    }
  })
  return { done, cancel }
}
