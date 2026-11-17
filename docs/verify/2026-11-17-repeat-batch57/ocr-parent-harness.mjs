import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'

// Local test wrapper only: let the existing VM invoke a mock createWorker without downloading models.
const hostPath = new URL('../2026-11-17-repeat-batch19/component-harness.cjs', import.meta.url)
const source = fs.readFileSync(hostPath, 'utf8'), anchor = 'bundle: true, write: false, format:'
if (!source.includes(anchor)) throw Error('Host compile anchor changed')
const hostSource = source.replace(anchor, "bundle: true, write: false, supported: { 'dynamic-import': false }, format:")
const hostModule = { exports: {} }
vm.runInThisContext('(function(require,module,exports){\n' + hostSource + '\n})', { filename: 'ocr-baseline-local-host.cjs' })(createRequire(hostPath), hostModule, hostModule.exports)
export const { componentHarness } = hostModule.exports
export const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
export const result = (text = 'recognized text') => ({ data: { text, confidence: 88, blocks: [{ paragraphs: [{ lines: [{ words: [
  { text: '검토', confidence: 45, bbox: { x0: 1, y0: 2, x1: 3, y1: 4 } }, { text: ' ', confidence: 0, bbox: { x0: 0, y0: 0, x1: 0, y1: 0 } },
] }] }] }] } })
export async function fixture({ holdCreate = false, holdReinitialize = false, holdTerminate = false } = {}) {
  const io = { holdCreate, holdReinitialize, holdTerminate, holdDecode: false, holdPreview: false, create: [], recognize: [], reinitialize: [], terminate: 0, revoked: [], urls: new Map(), decoded: [], previews: [], downloads: [], copies: [], routes: [], copyReject: false, legacyCalls: 0 }
  const creation = deferred(), termination = deferred(), worker = { async recognize(canvas, options, output, jobId) { const pending = deferred(); io.recognize.push({ canvas, options, output, jobId, ...pending }); return pending.promise }, async reinitialize(langs, oem, config, jobId) { const pending = deferred(); io.reinitialize.push({ langs, oem, config, jobId, ...pending }); if (io.holdReinitialize) await pending.promise }, async terminate() { io.terminate++; if (io.holdTerminate) await termination.promise } }
  class PortURL extends URL { static createObjectURL(object) { const key = `blob:ocr-${io.urls.size + 1}`; io.urls.set(key, object); return key } static revokeObjectURL(value) { io.revoked.push(value) } }
  class PortImage { naturalWidth = 2; naturalHeight = 2; async decode() { const pending = deferred(); io.decoded.push({ src: this.src, ...pending }); if (io.holdDecode) await pending.promise } }
  const document = { body: { appendChild() {}, removeChild() {} }, execCommand() { io.legacyCalls++; return false }, createElement(tag) {
    if (tag === 'canvas') return { width: 0, height: 0, getContext: () => ({ translate() {}, rotate() {}, drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(64).fill(255) }), putImageData() {} }), toBlob(callback) { io.previews.push(callback); if (!io.holdPreview) callback(new Blob(['synthetic-preview'], { type: 'image/png' })) } }
    return { style: {}, value: '', select() {}, remove() {}, click() { io.downloads.push({ blob: io.urls.get(this.href), filename: this.download }) } }
  } }
  const messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8'))
  messages.imageOcr.jobs = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch57/translations-ocr.json', 'utf8')).ko.imageOcr.jobs
  const navigator = { clipboard: { async writeText(value) { io.copies.push(value); if (io.copyReject) throw Error('denied') } } }
  const h = await componentHarness('src/components/ImageOcr.tsx', { messages, document, globals: { URL: PortURL, Image: PortImage }, navigator, modules: {
    'tesseract.js': { async createWorker(langs, oem, options) { io.create.push({ langs, oem, options }); if (io.holdCreate) await creation.promise; return worker } },
  } })
  h.render(); h.window.location.assign = value => io.routes.push(value)
  const flush = async () => { for (let n = 0; n < 12; n++) { await Promise.resolve(); await Promise.resolve() } }
  const settle = async () => { for (let n = 0; n < 5; n++) { await flush(); h.render() } }
  const label = key => key.split('.').reduce((parent, key) => parent[key], messages.imageOcr)
  const field = () => h.find(node => node.type === 'textarea')
  const find = (key, value) => h.find(node => Object.hasOwn(node.props ?? {}, `data-ocr-${key}`) && (value === undefined || node.props[`data-ocr-${key}`] === value))
  return { h, io, worker, creation, termination, label, field, settle, flush, navigator, find,
    async action(key, value) { const node = find(key, value); if (node.props.disabled) throw Error('Disabled: ' + key); node.props.onClick(); h.render(); await settle() },
    async add(count = 1) { const files = Array.from({ length: count }, (_, n) => ({ name: `synthetic-${n + 1}.png`, type: 'image/png', size: 128 })); h.find(node => node.type === 'input' && node.props.type === 'file' && node.props.multiple).props.onChange({ target: { files, value: '' } }); h.render(); await settle() },
    async click(key) { const node = h.button(label(key)); if (node.props.disabled) throw Error('Disabled: ' + key); node.props.onClick(); h.render(); await settle() },
    async edit(value) { field().props.onChange({ target: { value } }); h.render(); await settle() },
    async complete(index, value) { io.recognize[index].resolve(result(value)); await settle() },
    cleanup() { h.cleanup() },
  }
}
