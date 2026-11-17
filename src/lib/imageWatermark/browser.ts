import { decodeImage } from '../../utils/imageCompress.ts'
import { qrImageDimensions, QrImageError } from '../../utils/qrImageBatch.ts'
import { createWatermarkWorkGate } from '../../utils/imageWatermarkWorkGate.ts'
import { WatermarkError, WATERMARK_LIMITS, checkWatermarkDimensions, checkWatermarkSize, watermarkLayout, watermarkPreviewSize, type WatermarkLogo, type WatermarkOutput, type WatermarkSnapshot } from '../../utils/imageWatermark.ts'
import type { ImageZipEntry } from '../../utils/imageZipSnapshot.ts'

export interface WatermarkDecoded { src: CanvasImageSource; width: number; height: number; close: () => void }
export interface WatermarkPreviewAsset { readonly canvas: HTMLCanvasElement; readonly width: number; readonly height: number; release: () => void }
export interface WatermarkLogoAsset extends WatermarkLogo { readonly thumbnail: HTMLCanvasElement; release: () => void }
export interface WatermarkBrowserPorts {
  read: (file: Blob) => Promise<ArrayBuffer>
  decode: (file: Blob) => Promise<WatermarkDecoded>
  canvas: (width: number, height: number) => HTMLCanvasElement
  png: (canvas: HTMLCanvasElement) => Promise<Blob | null>
  url: (blob: Blob) => string
  revoke: (url: string) => void
}
const defaultPorts: WatermarkBrowserPorts = {
  read: file => file.arrayBuffer(), decode: file => decodeImage(file),
  canvas: (width, height) => { const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas },
  png: canvas => new Promise(resolve => canvas.toBlob(resolve, 'image/png')),
  url: blob => URL.createObjectURL(blob), revoke: url => URL.revokeObjectURL(url),
}

/** Shared logical source-pixel drawing for PNG and small preview; no second scaled-font algorithm. */
export function drawWatermarkCanvas(
  context: CanvasRenderingContext2D, source: CanvasImageSource, width: number, height: number,
  snapshot: WatermarkSnapshot, logo: CanvasImageSource | null, targetWidth = width, targetHeight = height,
): void {
  checkWatermarkDimensions(width, height)
  if (!Number.isInteger(targetWidth) || !Number.isInteger(targetHeight) || targetWidth < 1 || targetHeight < 1) throw new WatermarkError('canvas')
  const settings = snapshot.settings
  if (settings.watermarkType === 'image' && !logo) throw new WatermarkError('logoRequired')
  context.save()
  try {
    context.scale(targetWidth / width, targetHeight / height)
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high'; context.globalAlpha = 1
    context.drawImage(source, 0, 0, width, height)
    let measured = 0
    if (settings.watermarkType === 'text') {
      context.font = `${settings.bold ? 'bold ' : ''}${settings.fontSize}px ${settings.fontFamily}`
      context.fillStyle = settings.fontColor; context.textAlign = 'center'; context.textBaseline = 'middle'
      measured = context.measureText(settings.text).width
    }
    const layout = watermarkLayout(width, height, snapshot, measured)
    context.globalAlpha = layout.alpha
    const draw = (x: number, y: number) => {
      if (settings.watermarkType === 'text') context.fillText(settings.text, x, y)
      else context.drawImage(logo!, x - layout.width / 2, y - layout.height / 2, layout.width, layout.height)
    }
    if (layout.tile) {
      context.translate(width / 2, height / 2); context.rotate(layout.rotationRadians)
      for (let row = 0; row < layout.tile.rows; row++) for (let column = 0; column < layout.tile.columns; column++) draw(layout.tile.origin + column * layout.tile.stepX, layout.tile.origin + row * layout.tile.stepY)
    } else { context.translate(layout.center.x, layout.center.y); context.rotate(layout.rotationRadians); draw(0, 0) }
  } finally { context.restore() }
}

/** A single instance belongs to one mounted workspace. Only these public jobs acquire its shared gate. */
export function createWatermarkBrowserAdapter(overrides: Partial<WatermarkBrowserPorts> = {}) {
  const ports = { ...defaultPorts, ...overrides }, gate = createWatermarkWorkGate()
  const outputs = new Set<string>(), retainedCanvases = new Set<HTMLCanvasElement>()
  let alive = true
  const check = (current: () => boolean) => { if (!alive || !current()) throw new WatermarkError('canceled') }
  const closeCanvas = (canvas: HTMLCanvasElement) => { try { canvas.width = canvas.height = 0 } catch { /* Continue releasing the other owned assets. */ } }
  const closeDecoded = (decoded: WatermarkDecoded | null) => { try { decoded?.close() } catch { /* Cleanup cannot revive an invalidated job. */ } }
  const revoke = (url: string) => { try { ports.revoke(url) } catch { /* Ownership is removed even if browser cleanup fails. */ } }
  const releaseCanvas = (canvas: HTMLCanvasElement) => { if (retainedCanvases.delete(canvas)) closeCanvas(canvas) }
  const createCanvas = (width: number, height: number) => {
    let canvas: HTMLCanvasElement
    try { canvas = ports.canvas(width, height) } catch { throw new WatermarkError('canvas') }
    if (canvas.width !== width || canvas.height !== height) { closeCanvas(canvas); throw new WatermarkError('canvas') }
    return canvas
  }
  const contextOf = (canvas: HTMLCanvasElement) => { const context = canvas.getContext('2d'); if (!context) throw new WatermarkError('canvas'); return context }
  const decodeValidated = async (file: File, current: () => boolean, logo = false): Promise<WatermarkDecoded> => {
    check(current); checkWatermarkSize(file.size, logo)
    let bytes: ArrayBuffer
    try { bytes = await ports.read(file) } catch { check(current); throw new WatermarkError('read') }
    check(current); checkWatermarkSize(bytes.byteLength, logo)
    try { const header = qrImageDimensions(bytes); checkWatermarkDimensions(header.width, header.height, logo) }
    catch (cause) {
      if (cause instanceof WatermarkError) throw cause
      if (cause instanceof QrImageError) throw new WatermarkError(cause.code === 'format' ? 'format' : cause.code === 'dimensions' ? logo ? 'logoDimensions' : 'dimensions' : 'read')
      throw new WatermarkError('read')
    }
    check(current)
    let decoded: WatermarkDecoded
    try { decoded = await ports.decode(file) } catch { check(current); throw new WatermarkError('decode') }
    try { check(current); checkWatermarkDimensions(decoded.width, decoded.height, logo); return decoded }
    catch (cause) { closeDecoded(decoded); throw cause }
  }
  const run = <T>(current: () => boolean, work: () => Promise<T>) => gate.run(work, () => alive && current())
  return {
    getWorkState: () => gate.getSnapshot(),
    async sourcePreview(file: File, current: () => boolean): Promise<WatermarkPreviewAsset> {
      return run(current, async () => {
        let decoded: WatermarkDecoded | null = null, canvas: HTMLCanvasElement | null = null
        try {
          decoded = await decodeValidated(file, current)
          const size = watermarkPreviewSize(decoded.width, decoded.height)
          canvas = createCanvas(size.width, size.height); contextOf(canvas).drawImage(decoded.src, 0, 0, size.width, size.height)
          check(current)
          const retained = canvas, width = decoded.width, height = decoded.height
          retainedCanvases.add(retained); canvas = null
          return { canvas: retained, width, height, release: () => releaseCanvas(retained) }
        } finally { closeDecoded(decoded); if (canvas) closeCanvas(canvas) }
      })
    },
    async logo(file: File, id: string, current: () => boolean): Promise<WatermarkLogoAsset> {
      return run(current, async () => {
        if (!id || id.length > 128) throw new WatermarkError('logoRequired')
        let decoded: WatermarkDecoded | null = null, canvas: HTMLCanvasElement | null = null
        try {
          decoded = await decodeValidated(file, current, true)
          const size = watermarkPreviewSize(decoded.width, decoded.height, 384, 384)
          canvas = createCanvas(size.width, size.height); contextOf(canvas).drawImage(decoded.src, 0, 0, size.width, size.height)
          check(current)
          const retained = canvas, width = decoded.width, height = decoded.height
          retainedCanvases.add(retained); canvas = null
          return { id, file, width, height, thumbnail: retained, release: () => releaseCanvas(retained) }
        } finally { closeDecoded(decoded); if (canvas) closeCanvas(canvas) }
      })
    },
    async preview(base: WatermarkPreviewAsset, snapshot: WatermarkSnapshot, logo: WatermarkLogoAsset | null, current: () => boolean): Promise<WatermarkPreviewAsset> {
      return run(current, async () => {
        check(current)
        if (!retainedCanvases.has(base.canvas)) throw new WatermarkError('canceled')
        if (snapshot.settings.watermarkType === 'image' && (!snapshot.logo || !logo || !retainedCanvases.has(logo.thumbnail) || logo.id !== snapshot.logo.id || logo.file !== snapshot.logo.file)) throw new WatermarkError('logoRequired')
        let canvas: HTMLCanvasElement | null = null
        try {
          canvas = createCanvas(base.canvas.width, base.canvas.height)
          drawWatermarkCanvas(contextOf(canvas), base.canvas, base.width, base.height, snapshot, logo?.thumbnail ?? null, canvas.width, canvas.height)
          check(current)
          const retained = canvas; retainedCanvases.add(retained); canvas = null
          return { canvas: retained, width: base.width, height: base.height, release: () => releaseCanvas(retained) }
        } finally { if (canvas) closeCanvas(canvas) }
      })
    },
    async process(file: File, snapshot: WatermarkSnapshot, current: () => boolean): Promise<WatermarkOutput> {
      return run(current, async () => {
        let source: WatermarkDecoded | null = null, logo: WatermarkDecoded | null = null, canvas: HTMLCanvasElement | null = null, url: string | null = null
        try {
          source = await decodeValidated(file, current)
          // This internal decode intentionally does not acquire the public gate a second time.
          if (snapshot.settings.watermarkType === 'image') {
            if (!snapshot.logo) throw new WatermarkError('logoRequired')
            logo = await decodeValidated(snapshot.logo.file, current, true)
            if (logo.width !== snapshot.logo.width || logo.height !== snapshot.logo.height) throw new WatermarkError('logoDimensions')
          }
          check(current); canvas = createCanvas(source.width, source.height)
          drawWatermarkCanvas(contextOf(canvas), source.src, source.width, source.height, snapshot, logo?.src ?? null)
          check(current)
          let blob: Blob | null
          try { blob = await ports.png(canvas) } catch { check(current); throw new WatermarkError('output') }
          check(current)
          if (!blob || blob.size < 1 || blob.type.toLowerCase() !== 'image/png') throw new WatermarkError('output')
          if (blob.size > WATERMARK_LIMITS.outputBytes) throw new WatermarkError('outputLimit')
          url = ports.url(blob); check(current); outputs.add(url)
          const out = { blob, width: source.width, height: source.height, url }; url = null
          return out
        } finally { closeDecoded(source); closeDecoded(logo); if (canvas) closeCanvas(canvas); if (url) revoke(url) }
      })
    },
    release(output: WatermarkOutput) { if (outputs.delete(output.url)) revoke(output.url) },
    dispose() {
      alive = false
      for (const url of outputs) revoke(url)
      outputs.clear()
      for (const canvas of retainedCanvases) closeCanvas(canvas)
      retainedCanvases.clear()
      // Active local canvases/bitmaps belong to their job's finally, not this retained-assets list.
    },
  }
}

/** Existing installed JSZip; each entry stays a Blob reference, without base64/ArrayBuffer copies here. */
export async function encodeWatermarkZip(entries: readonly ImageZipEntry[]): Promise<Blob> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  for (const entry of entries) zip.file(entry.name, entry.blob)
  return zip.generateAsync({ type: 'blob', compression: 'STORE' })
}
