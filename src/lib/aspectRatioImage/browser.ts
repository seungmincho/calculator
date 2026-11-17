import { decodeImage } from '../../utils/imageCompress.ts'
import { qrImageDimensions, QrImageError } from '../../utils/qrImageBatch.ts'
import { AspectImageError, checkAspectImageBytes, checkAspectImageDimensions, createAspectImageSettings, aspectOutputSize, aspectImageGeometry, aspectPreviewSize, type AspectImageSettings, type AspectGeometry } from '../../utils/aspectRatioImage.ts'

export interface AspectDecoded { src: CanvasImageSource; width: number; height: number; still: boolean; close: () => void }
export interface AspectSourceAsset { readonly source: CanvasImageSource; readonly width: number; readonly height: number; readonly format: 'png' | 'jpeg' | 'webp' | 'gif'; readonly name: string; release: () => void }
export interface AspectPreviewAsset { readonly canvas: HTMLCanvasElement; readonly aspectRatio: number; release: () => void }
export interface AspectImageOutput { readonly blob: Blob; readonly width: number; readonly height: number; readonly mime: 'image/png' | 'image/jpeg' }
export interface AspectImagePorts {
  read: (file: Blob) => Promise<ArrayBuffer>
  decode: (file: Blob, signal?: AbortSignal) => Promise<AspectDecoded>
  canvas: (width: number, height: number) => HTMLCanvasElement
  encode: (canvas: HTMLCanvasElement, mime: 'image/png' | 'image/jpeg') => Promise<Blob | null>
}
const defaults: AspectImagePorts = {
  read: file => file.arrayBuffer(),
  decode: async (file, signal) => { const decoded = await decodeImage(file, signal); return { ...decoded, still: typeof ImageBitmap !== 'undefined' && decoded.src instanceof ImageBitmap } },
  canvas: (width, height) => { const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas },
  encode: (canvas, mime) => new Promise(resolve => canvas.toBlob(resolve, mime, mime === 'image/jpeg' ? 0.92 : undefined)),
}

/** One source rectangle/output-space pad layout, scaled only at the destination. */
export function drawAspectImage(context: CanvasRenderingContext2D, source: CanvasImageSource, geometry: AspectGeometry, settings: AspectImageSettings, outputWidth: number, outputHeight: number, drawingWidth = outputWidth, drawingHeight = outputHeight): void {
  if (![outputWidth, outputHeight, drawingWidth, drawingHeight].every(value => Number.isSafeInteger(value) && value > 0)) throw new AspectImageError('canvas')
  context.save()
  try {
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high'
    context.clearRect(0, 0, drawingWidth, drawingHeight)
    if (settings.fit === 'crop') {
      const r = geometry.crop
      context.drawImage(source, r.x, r.y, r.w, r.h, 0, 0, drawingWidth, drawingHeight)
    } else {
      context.fillStyle = settings.padColor; context.fillRect(0, 0, drawingWidth, drawingHeight)
      const r = geometry.pad, scaleX = drawingWidth / outputWidth, scaleY = drawingHeight / outputHeight
      context.drawImage(source, r.x * scaleX, r.y * scaleY, r.w * scaleX, r.h * scaleY)
    }
  } finally { context.restore() }
}

// A remounted panel must also wait for a disposed owner's outstanding native work.
// Disposal invalidates results; it cannot finish a browser decode/toBlob callback early.
let physicalWorkTail: Promise<void> = Promise.resolve()

/** Only public work methods acquire the shared gate. Native work retains its slot until its real finally. */
export function createAspectImageAdapter(overrides: Partial<AspectImagePorts> = {}) {
  const ports = { ...defaults, ...overrides }, sources = new Map<AspectSourceAsset, () => void>(), previews = new Set<HTMLCanvasElement>()
  let alive = true, active = false, pending = 0
  const closeCanvas = (canvas: HTMLCanvasElement) => { try { canvas.width = canvas.height = 0 } catch { /* Continue other cleanup. */ } }
  const closeDecoded = (decoded: AspectDecoded | null) => { try { decoded?.close() } catch { /* Invalidated work cannot revive from cleanup errors. */ } }
  const check = (current: () => boolean, signal?: AbortSignal) => { if (!alive || signal?.aborted || !current()) throw new AspectImageError('canceled') }
  const run = <T>(current: () => boolean, work: () => Promise<T>, signal?: AbortSignal): Promise<T> => {
    pending++
    const job = physicalWorkTail.then(async () => { pending--; check(current, signal); active = true; try { return await work() } finally { active = false } })
    physicalWorkTail = job.then(() => {}, () => {}); return job
  }
  const canvasFor = (width: number, height: number) => {
    let canvas: HTMLCanvasElement
    try { canvas = ports.canvas(width, height) } catch { throw new AspectImageError('canvas') }
    if (canvas.width !== width || canvas.height !== height) { closeCanvas(canvas); throw new AspectImageError('canvas') }
    return canvas
  }
  const contextFor = (canvas: HTMLCanvasElement) => { const context = canvas.getContext('2d'); if (!context) throw new AspectImageError('canvas'); return context }
  const releaseSource = (asset: AspectSourceAsset) => { const close = sources.get(asset); if (close) { sources.delete(asset); close() } }
  const releasePreview = (canvas: HTMLCanvasElement) => { if (previews.delete(canvas)) closeCanvas(canvas) }
  const snapshot = (source: AspectSourceAsset, draft: AspectImageSettings) => {
    const settings = createAspectImageSettings(draft), output = aspectOutputSize(settings.width, settings.height)
    if (!output.ok) throw new AspectImageError(output.reason)
    return { settings, output, geometry: aspectImageGeometry(source.width, source.height, output.width, output.height, settings.x, settings.y) }
  }
  const assertSource = (source: AspectSourceAsset) => { if (!sources.has(source)) throw new AspectImageError('canceled') }
  return {
    getWorkState: () => ({ active, pending }),
    async loadSource(file: File, current: () => boolean, signal?: AbortSignal): Promise<AspectSourceAsset> {
      return run(current, async () => {
        let decoded: AspectDecoded | null = null, frozen: HTMLCanvasElement | null = null
        try {
          check(current, signal); checkAspectImageBytes(file.size)
          let bytes: ArrayBuffer
          try { bytes = await ports.read(file) } catch { check(current, signal); throw new AspectImageError('read') }
          check(current, signal); checkAspectImageBytes(bytes.byteLength)
          let header: ReturnType<typeof qrImageDimensions>
          try { header = qrImageDimensions(bytes); checkAspectImageDimensions(header.width, header.height) }
          catch (error) { if (error instanceof AspectImageError) throw error; if (error instanceof QrImageError) throw new AspectImageError(error.code === 'dimensions' ? 'dimensions' : error.code === 'format' ? 'format' : 'read'); throw new AspectImageError('read') }
          check(current, signal)
          try { decoded = await ports.decode(file, signal) } catch { check(current, signal); throw new AspectImageError('decode') }
          check(current, signal); checkAspectImageDimensions(decoded.width, decoded.height)
          const { width, height } = decoded
          if (!decoded.still) { frozen = canvasFor(width, height); contextFor(frozen).drawImage(decoded.src, 0, 0, width, height); check(current, signal) }
          const retainedDecoded = frozen ? null : decoded, retainedCanvas = frozen
          const source = retainedCanvas ?? decoded.src
          const asset: AspectSourceAsset = Object.freeze({ source, width, height, format: header.format, name: file.name, release: () => releaseSource(asset) })
          sources.set(asset, () => { if (retainedCanvas) closeCanvas(retainedCanvas); closeDecoded(retainedDecoded) })
          frozen = null
          if (retainedDecoded) decoded = null
          return asset
        } finally { closeDecoded(decoded); if (frozen) closeCanvas(frozen) }
      }, signal)
    },
    async preview(source: AspectSourceAsset, draft: AspectImageSettings, current: () => boolean): Promise<AspectPreviewAsset> {
      const captured = snapshot(source, draft)
      return run(current, async () => {
        check(current); assertSource(source)
        let canvas: HTMLCanvasElement | null = null
        try {
          const { settings, output, geometry } = captured, size = aspectPreviewSize(output.width, output.height)
          canvas = canvasFor(size.width, size.height)
          drawAspectImage(contextFor(canvas), source.source, geometry, settings, output.width, output.height, size.width, size.height)
          check(current); const retained = canvas; previews.add(retained); canvas = null
          return { canvas: retained, aspectRatio: output.width / output.height, release: () => releasePreview(retained) }
        } finally { if (canvas) closeCanvas(canvas) }
      })
    },
    async export(source: AspectSourceAsset, draft: AspectImageSettings, current: () => boolean): Promise<AspectImageOutput> {
      const captured = snapshot(source, draft)
      return run(current, async () => {
        check(current); assertSource(source)
        let canvas: HTMLCanvasElement | null = null
        try {
          const { settings, output, geometry } = captured, mime = source.format === 'png' ? 'image/png' : 'image/jpeg'
          canvas = canvasFor(output.width, output.height)
          drawAspectImage(contextFor(canvas), source.source, geometry, settings, output.width, output.height)
          check(current)
          let blob: Blob | null
          try { blob = await ports.encode(canvas, mime) } catch { check(current); throw new AspectImageError('output') }
          check(current)
          if (!blob || blob.size < 1 || blob.type.toLowerCase() !== mime) throw new AspectImageError('output')
          return { blob, width: output.width, height: output.height, mime }
        } finally { if (canvas) closeCanvas(canvas) }
      })
    },
    dispose() { alive = false; for (const asset of [...sources.keys()]) releaseSource(asset); for (const canvas of [...previews]) releasePreview(canvas) },
  }
}
