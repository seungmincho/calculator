import assert from 'node:assert/strict'
import { PNG } from 'pngjs'

// Block interiors allow exact pixel comparisons without relying on resampling-edge behavior.
export function syntheticPng(width = 240, height = 120, alpha = 255) {
  const png = new PNG({ width, height })
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) png.data.set([30 + Math.floor(x / (width / 4)) * 60, 25 + Math.floor(y / (height / 3)) * 80, 100, alpha], (y * width + x) * 4)
  return PNG.sync.write(png)
}
export function coverOracle(sourceWidth, sourceHeight, width, height, x = 50, y = 50) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight), cropWidth = width / scale, cropHeight = height / scale
  return { x: (sourceWidth - cropWidth) * x / 100, y: (sourceHeight - cropHeight) * y / 100, width: cropWidth, height: cropHeight }
}
export function pngPixel(png, x, y) { return [...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 4)] }
export function withExifOrientation(jpeg, orientation = 6) {
  assert.equal(jpeg.readUInt16BE(0), 0xffd8)
  const payload = Buffer.from([0x45, 0x78, 0x69, 0x66, 0, 0, 0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 1, 0, 0x12, 1, 3, 0, 1, 0, 0, 0, orientation, 0, 0, 0, 0, 0, 0, 0])
  const marker = Buffer.alloc(4); marker.writeUInt16BE(0xffe1); marker.writeUInt16BE(payload.length + 2, 2)
  return Buffer.concat([jpeg.subarray(0, 2), marker, payload, jpeg.subarray(2)])
}
export async function observeAspectNativeIo(context) {
  await context.addInitScript(() => {
    window.__aspectReads = []; window.__aspectDecodes = []; window.__aspectEncodes = []; window.__aspectUrls = []; window.__aspectHeld = []; window.__aspectReadModes = {}; window.__aspectEncodeMode = 'native'; window.__aspectDecodeMode = 'native'; window.__aspectActiveEncode = 0; window.__aspectMaxEncode = 0
    const read = File.prototype.arrayBuffer, decode = window.createImageBitmap?.bind(window), encode = HTMLCanvasElement.prototype.toBlob, create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL)
    File.prototype.arrayBuffer = async function () { const mode = window.__aspectReadModes[this.name] ?? 'native'; window.__aspectReads.push({ name: this.name, bytes: this.size, mode }); const result = await read.call(this); if (mode === 'fail') throw new DOMException('Synthetic read failure', 'NotReadableError'); if (mode === 'hold') await new Promise(resolve => window.__aspectHeld.push({ type: 'read', resolve })); return result }
    if (decode) window.createImageBitmap = async (...args) => { const event = { bytes: args[0]?.size ?? null, closed: 0, mode: window.__aspectDecodeMode }; window.__aspectDecodes.push(event); const bitmap = await decode(...args); event.width = bitmap.width; event.height = bitmap.height; const close = bitmap.close.bind(bitmap); bitmap.close = () => { event.closed++; return close() }; if(event.mode==='hold')await new Promise(resolve=>window.__aspectHeld.push({type:'decode',resolve})); return bitmap }
    HTMLCanvasElement.prototype.toBlob = function (callback, mime, quality) {
      const event = { width: this.width, height: this.height, mime, mode: window.__aspectEncodeMode, delivered: false }; window.__aspectEncodes.push(event); window.__aspectActiveEncode++; window.__aspectMaxEncode = Math.max(window.__aspectMaxEncode, window.__aspectActiveEncode)
      return encode.call(this, blob => { event.bytes = blob?.size; const deliver = () => { if (event.delivered) return; event.delivered = true; window.__aspectActiveEncode--; callback(event.mode === 'null' ? null : blob) }; if (event.mode === 'hold') window.__aspectHeld.push({ type: 'encode', resolve: deliver }); else deliver() }, mime, quality)
    }
    URL.createObjectURL = blob => { const url = create(blob); window.__aspectUrls.push({ url, bytes: blob.size, type: blob.type, revoked: false }); return url }
    URL.revokeObjectURL = url => { const item = window.__aspectUrls.find(item => item.url === url); if (item) item.revoked = true; return revoke(url) }
    window.__releaseAspect = type => { const release = window.__aspectHeld.filter(item => !type || item.type === type); window.__aspectHeld = window.__aspectHeld.filter(item => type && item.type !== type); for (const item of release) item.resolve() }
  })
}

if (process.argv.includes('--self-test')) {
  const png = PNG.sync.read(syntheticPng()); assert.deepEqual([png.width, png.height], [240, 120]); assert.deepEqual(pngPixel(png, 30, 20), [30, 25, 100, 255]); assert.deepEqual(pngPixel(png, 210, 100), [210, 185, 100, 255])
  assert.deepEqual(coverOracle(240, 120, 120, 120, 100, 50), { x: 120, y: 0, width: 120, height: 120 })
  assert.deepEqual(coverOracle(120, 240, 120, 120, 50, 100), { x: 0, y: 120, width: 120, height: 120 })
  assert.equal(withExifOrientation(Buffer.from([0xff, 0xd8, 0xff, 0xd9])).readUInt16BE(2), 0xffe1)
  console.log('PASS Aspect browser PNG/cover/EXIF fixture preparation; no browser/product execution')
}
