import { PNG } from 'pngjs'
import JSZip from 'jszip'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

export function conversionImage(name = 'sample.png', rgba = [220, 30, 40, 255], width = 160, height = 96) {
  const png = new PNG({ width, height })
  for (let i = 0; i < width * height; i++) png.data.set(rgba, i * 4)
  return { name, mimeType: 'image/png', buffer: PNG.sync.write(png) }
}

// ZIP is independently parsed with CRC checking; raster is decoded by the real browser.
export async function inspectConversionZip(page, bytes) {
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true }), entries = []
  for (const file of Object.values(zip.files).filter(file => !file.dir)) {
    const data = await file.async('nodebuffer')
    entries.push({ name: file.name, bytes: data.length, hash: createHash('sha256').update(data).digest('hex'), ...(await rasterInfo(page, data)) })
  }
  assert.equal(new Set(entries.map(entry => entry.name.toLowerCase())).size, entries.length)
  return entries
}
export async function rasterInfo(page, bytes) {
  return page.evaluate(async data => {
    const blob = new Blob([new Uint8Array(data)]), bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height
    const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0)
    const result = { width: bitmap.width, height: bitmap.height, pixel: [...ctx.getImageData(Math.floor(bitmap.width / 2), Math.floor(bitmap.height / 2), 1, 1).data] }
    bitmap.close(); return result
  }, [...bytes])
}

export async function installConversionPorts(context, holdRestore = false) {
  await context.addInitScript(holdRestore => {
    window.__conversionHeaders = []; window.__conversionHeaderModes = {}; window.__conversionHeldHeaders = []
    const slice = File.prototype.slice, read = Blob.prototype.arrayBuffer, fileSizes = Object.create(null)
    window.__conversionSizeOverrides = fileSizes
    File.prototype.slice = function (...args) { const blob = slice.apply(this, args); Object.defineProperty(blob, '__conversionFileName', { value: this.name }); return blob }
    Blob.prototype.arrayBuffer = async function () {
      const name = this.__conversionFileName
      if (!name) return read.call(this)
      const mode = window.__conversionHeaderModes[name] ?? 'native', entry = { name, bytes: this.size, mode }; window.__conversionHeaders.push(entry)
      const bytes = await read.call(this)
      if (mode === 'hold') await new Promise(resolve => window.__conversionHeldHeaders.push({ name, resolve }))
      if (mode === 'fail') throw new DOMException('Synthetic header read failure', 'NotReadableError')
      return bytes
    }
    window.__releaseConversionHeaders = name => { const release = window.__conversionHeldHeaders.filter(item => !name || item.name === name); window.__conversionHeldHeaders = window.__conversionHeldHeaders.filter(item => name && item.name !== name); for (const item of release) item.resolve() }
    const size = Object.getOwnPropertyDescriptor(Blob.prototype, 'size')
    Object.defineProperty(File.prototype, 'size', { configurable: true, get() { return fileSizes[this.name] ?? size.get.call(this) } })
    const nativeRead = FileReader.prototype.readAsArrayBuffer
    window.__zipMode = 'normal'; window.__zipReads = []
    FileReader.prototype.readAsArrayBuffer = function (blob) {
      if (!(blob instanceof File) && /^image\//.test(blob.type) && window.__zipMode !== 'normal') {
        const task = { type: blob.type, bytes: blob.size, mode: window.__zipMode }; window.__zipReads.push(task)
        if (task.mode === 'fail') { Object.defineProperty(this, 'error', { configurable: true, value: new DOMException('Synthetic ZIP read error', 'NotReadableError') }); queueMicrotask(() => this.dispatchEvent(new ProgressEvent('error'))); return }
        task.release = () => nativeRead.call(this, blob); return
      }
      return nativeRead.call(this, blob)
    }
    window.__releaseZip = () => { window.__zipMode = 'normal'; for (const item of window.__zipReads) if (item.release) { item.release(); delete item.release } }
    const timeout = window.setTimeout.bind(window), clear = window.clearTimeout.bind(window), replace = history.replaceState.bind(history)
    window.__conversionRestore = []; window.__conversionHistoryFailure = false
    window.setTimeout = (callback, delay, ...args) => {
      if (!holdRestore || callback?.name !== 'restoreInitialImageConversion') return timeout(callback, delay, ...args)
      const task = { callback: () => callback(...args), canceled: false }; task.id = timeout(() => {}, 0); window.__conversionRestore.push(task); return task.id
    }
    window.clearTimeout = id => { const task = window.__conversionRestore.find(item => item.id === id); if (task) task.canceled = true; return clear(id) }
    window.__releaseConversionRestore = () => { for (const task of window.__conversionRestore) if (!task.canceled && !task.fired) { task.fired = true; task.callback() } }
    history.replaceState = (...args) => { if (window.__conversionHistoryFailure) throw new DOMException('Synthetic history failure', 'SecurityError'); return replace(...args) }
  }, holdRestore)
}
