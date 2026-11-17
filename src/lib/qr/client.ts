import { QrImageError, QR_IMAGE_LIMITS } from '@/utils/qrImageBatch'
import type { QrDecodeResponse } from './protocol'

let sequence = 0
export function decodeQrInWorker(pixels: Uint8ClampedArray<ArrayBuffer>, width: number, height: number, signal: AbortSignal, timeoutMs: number = QR_IMAGE_LIMITS.workerMs): Promise<string | null> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new QrImageError('canceled')); return }
    let worker: Worker
    try { worker = new Worker(new URL('./qrImage.worker.ts', import.meta.url), { type: 'module' }) }
    catch { reject(new QrImageError('worker')); return }
    const requestId = ++sequence
    let settled = false
    const finish = (error: QrImageError | null, value: string | null = null) => {
      if (settled) return
      settled = true; clearTimeout(timer); signal.removeEventListener('abort', abort)
      worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null; worker.terminate()
      if (error) reject(error); else resolve(value)
    }
    const abort = () => finish(new QrImageError('canceled'))
    const timer = setTimeout(() => finish(new QrImageError('timeout')), Math.max(1, timeoutMs))
    signal.addEventListener('abort', abort, { once: true })
    worker.onmessage = event => {
      const data = event.data as QrDecodeResponse | null
      if (!data || typeof data !== 'object' || data.requestId !== requestId) return
      if (data.type === 'found' && typeof data.text === 'string') finish(null, data.text)
      else if (data.type === 'notFound') finish(null)
      else finish(new QrImageError('worker'))
    }
    worker.onerror = event => { event.preventDefault(); finish(new QrImageError('worker')) }
    worker.onmessageerror = () => finish(new QrImageError('worker'))
    try { worker.postMessage({ requestId, width, height, pixels: pixels.buffer }, [pixels.buffer]) }
    catch { finish(new QrImageError('worker')) }
  })
}
