import { checkQrImageSize, checkQrImageDimensions, qrImageDimensions, qrImageCanvasSize, QrImageError, QR_IMAGE_LIMITS } from '@/utils/qrImageBatch'
import { decodeQrInWorker } from './client'

type NativeDetector = { detect(source: HTMLCanvasElement): Promise<Array<{ rawValue: string; format: string }>> }
type NativeConstructor = { new(options: { formats: string[] }): NativeDetector; getSupportedFormats(): Promise<string[]> }
export function qrImageWait<T>(promise: Promise<T>, signal: AbortSignal, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { void promise.catch(() => {}); reject(new QrImageError('canceled')); return }
    let done = false
    const end = (error: unknown, value?: T) => {
      if (done) return
      done = true; clearTimeout(timer); signal.removeEventListener('abort', abort)
      if (error) reject(error); else resolve(value as T)
    }
    const abort = () => end(new QrImageError('canceled'))
    const timer = setTimeout(() => end(new QrImageError('timeout')), Math.max(1, ms))
    signal.addEventListener('abort', abort, { once: true })
    promise.then(value => end(null, value), error => end(error))
  })
}
async function nativeQr(canvas: HTMLCanvasElement, signal: AbortSignal, ms: number) {
  let active = true
  try {
    const Native = (globalThis as typeof globalThis & { BarcodeDetector?: NativeConstructor }).BarcodeDetector
    if (!Native || typeof Native.getSupportedFormats !== 'function') return null
    return await qrImageWait((async () => {
      if (!(await Native.getSupportedFormats()).includes('qr_code')) return null
      if (!active || signal.aborted) throw new QrImageError('canceled')
      const detector = new Native({ formats: ['qr_code'] })
      const results = (await detector.detect(canvas)).filter(item => item.format === 'qr_code' && typeof item.rawValue === 'string')
      return results.length ? { text: results[0].rawValue, multiple: results.length > 1 } : null
    })(), signal, ms)
  } catch (error) { if (signal.aborted) throw new QrImageError('canceled'); if (error instanceof QrImageError && error.code === 'canceled') throw error; return null }
  finally { active = false }
}
export async function readQrImage(file: File, signal: AbortSignal): Promise<{ text: string | null; scaled: boolean; multiple: boolean }> {
  const started = Date.now(), remaining = () => {
    if (signal.aborted) throw new QrImageError('canceled')
    const ms = QR_IMAGE_LIMITS.fileMs - (Date.now() - started)
    if (ms <= 0) throw new QrImageError('timeout')
    return ms
  }
  const readBudget = remaining()
  checkQrImageSize(file.size)
  const bytes = await qrImageWait(file.arrayBuffer(), signal, readBudget)
  qrImageDimensions(bytes)
  remaining()
  let objectUrl: string | undefined
  const picture = new Image(), canvas = document.createElement('canvas')
  try {
    objectUrl = URL.createObjectURL(file)
    const decoded = new Promise<void>((resolve, reject) => { picture.onload = () => resolve(); picture.onerror = () => reject(new QrImageError('read')); picture.src = objectUrl! })
    await qrImageWait(decoded, signal, remaining())
    checkQrImageDimensions(picture.naturalWidth, picture.naturalHeight)
    const size = qrImageCanvasSize(picture.naturalWidth, picture.naturalHeight)
    canvas.width = size.width; canvas.height = size.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new QrImageError('read')
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, size.width, size.height)
    context.drawImage(picture, 0, 0, size.width, size.height)
    picture.onload = null; picture.onerror = null; picture.src = ''
    URL.revokeObjectURL(objectUrl); objectUrl = undefined
    const native = await nativeQr(canvas, signal, Math.min(QR_IMAGE_LIMITS.nativeMs, remaining()))
    if (native) return { ...native, scaled: size.scaled }
    remaining()
    const rgba = context.getImageData(0, 0, size.width, size.height).data
    const text = await decodeQrInWorker(rgba, size.width, size.height, signal, Math.min(QR_IMAGE_LIMITS.workerMs, remaining()))
    return { text, scaled: size.scaled, multiple: false }
  } catch (error) { if (error instanceof QrImageError) throw error; throw new QrImageError(signal.aborted ? 'canceled' : 'read') }
  finally { picture.onload = null; picture.onerror = null; picture.src = ''; if (objectUrl) URL.revokeObjectURL(objectUrl); canvas.width = 0; canvas.height = 0 }
}
