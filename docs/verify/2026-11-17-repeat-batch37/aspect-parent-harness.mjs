import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { createAspectImageAdapter } from '../../../src/lib/aspectRatioImage/browser.ts'
export const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)]
export const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
export function photo(name, width = 400, height = 300) { const bytes = new Uint8Array(33), view = new DataView(bytes.buffer); bytes.set([137, 80, 78, 71, 13, 10, 26, 10]); view.setUint32(8, 13); bytes.set([73, 72, 68, 82], 12); view.setUint32(16, width); view.setUint32(20, height); return new File([bytes], name, { type: 'image/png' }) }
const messagesFor = locale => { const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')), patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch37/translations-aspect.json', 'utf8')); Object.assign(messages.aspectRatio, patch[locale].aspectRatio); return messages }
class Canvas {
  constructor(width, height) { this.width = width; this.height = height; this.style = {}; this.images = []; this.fills = []; this.attrs = {} }
  setAttribute(key, value) { this.attrs[key] = value }
  getContext() { return { save() {}, restore() {}, clearRect() {}, drawImage: (...values) => { this.images.push(values) }, fillRect: (...values) => { this.fills.push(values) } } }
}
export async function fixture(query = '', hydrated = true) {
  const messages = messagesFor('ko'), io = { language: 'ko', native: 'success', legacy: false, decode: null, encode: null }, jobs = [], writes = [], fallback = [], decoded = [], closed = [], encoded = [], canvases = [], downloads = [], revoked = [], replacements = [], microtasks = [], timers = [], urls = new Map()
  let sequence = 0, legacyField = null
  class OwnedURL extends URL { static createObjectURL(blob) { const url = 'blob:aspect-' + ++sequence; urls.set(url, blob); return url } static revokeObjectURL(url) { revoked.push(url); urls.delete(url) } }
  class Element { constructor() { this.style = {}; this.value = '' } focus() {} select() {} setSelectionRange() {} remove() {} }
  const document = { activeElement: new Element(), body: { appendChild() {} }, createElement(tag) {
    if (tag === 'textarea') { legacyField = new Element(); return legacyField }
    if (tag === 'a') return { href: '', download: '', click() { downloads.push({ filename: this.download, blob: urls.get(this.href) }) }, remove() {} }
    throw new Error('Unexpected document element: ' + tag)
  }, execCommand() { fallback.push(legacyField.value); if (io.legacy === 'throw') throw new Error('legacy'); return io.legacy } }
  const globals = { URL: OwnedURL, AbortController, HTMLElement: Element, queueMicrotask: fn => microtasks.push(fn), setTimeout: (fn, delay) => { const timer = { id: ++sequence, fn, delay, canceled: false }; timers.push(timer); return timer.id }, clearTimeout: id => { const timer = timers.find(item => item.id === id); if (timer) timer.canceled = true } }
  const navigator = { clipboard: { writeText: text => { writes.push(text); if (io.native === 'reject') return Promise.reject(new Error('denied')); if (io.native === 'wait') { const job = deferred(); jobs.push(job); return job.promise } return Promise.resolve() } } }
  const common = { messages, document, globals, navigator, modules: { '@/contexts/LanguageContext': { useOptionalLanguage: () => ({ language: io.language }) }, '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' } } }
  const h = await componentHarness('src/components/AspectRatio.tsx', { ...common, props: {}, url: 'https://toolhub.ai.kr/aspect-ratio/?keep=one&keep=two' + (query ? '&' + query : '') + '#photo', hydrated,
    modules: { ...common.modules, '@/components/AspectRatioImagePanel': { __esModule: true, default: 'AspectRatioImagePanel' } } })
  const history = { framework: 'keep' }; h.window.history.state = history; const replace = h.window.history.replaceState
  h.window.history.replaceState = (state, title, url) => { replacements.push({ state, url: String(url) }); replace(state, title, url) }
  h.render()
  const childProps = () => h.find(node => node.type === 'AspectRatioImagePanel').props
  const fileInput = new EventTarget(), host = { children: [], replaceChildren(...children) { this.children = children } }
  const adapterInstances = []
  const createAdapter = () => {
    const adapter = createAspectImageAdapter({ read: file => file.arrayBuffer(), decode: async file => {
      decoded.push(file.name); if (io.decode) return io.decode(file)
      const view = new DataView(await file.arrayBuffer()); return { src: { name: file.name }, width: view.getUint32(16), height: view.getUint32(20), still: true, close: () => closed.push(file.name) }
    }, canvas: (width, height) => { const canvas = new Canvas(width, height); canvases.push(canvas); return canvas }, encode: (canvas, mime) => {
      encoded.push({ width: canvas.width, height: canvas.height, mime }); return io.encode ? io.encode(canvas, mime) : Promise.resolve(new Blob(['synthetic image'], { type: mime }))
    } }); adapterInstances.push(adapter); return adapter
  }
  const p = await componentHarness('src/components/AspectRatioImagePanel.tsx', { ...common, props: childProps(), modules: { ...common.modules, '@/lib/aspectRatioImage/browser': { createAspectImageAdapter: createAdapter } }, beforeEffects(tree) {
    for (const node of all(tree)) { if (Object.hasOwn(node.props, 'data-aspect-image-file')) node.props.ref.current = fileInput; if (Object.hasOwn(node.props, 'data-aspect-image-preview')) node.props.ref.current = host }
  } }); p.render()
  const settle = async () => { for (let i = 0; i < 10; i++) { for (const fn of microtasks.splice(0)) fn(); await new Promise(resolve => setImmediate(resolve)); h.render(); p.setProps(childProps()) } }
  const find = (target, attr, value = '') => target.find(node => node.props[attr] === value)
  const change = async (id, value) => { find(h, 'id', id).props.onChange({ target: { value } }); await settle() }
  const click = async (attr, value = '', target = p) => { find(target, attr, value).props.onClick(); await settle() }
  const upload = async file => { find(p, 'data-aspect-image-file').props.onChange({ target: { files: file ? [file] : [], value: 'file' } }); await settle() }
  const fire = async delay => { const pending = timers.filter(timer => timer.delay === delay && !timer.canceled); for (const timer of pending) { timer.canceled = true; timer.fn() }; await settle() }
  const crop = async (x, y) => { const control = p.find(node => typeof node.type === 'function' && Object.hasOwn(node.props, 'canMoveX')); control.props.onChange(x, y); await settle() }
  const recovery = () => h.all().find(node => typeof node.type === 'function' && Object.hasOwn(node.props, 'onRetry'))
  return { h, p, io, jobs, writes, fallback, decoded, closed, encoded, canvases, downloads, revoked, replacements, history, timers, fileInput, host, adapterInstances, messages, childProps, find, change, click, upload, fire, crop, recovery, settle,
    async locale(value) { io.language = value; messages.aspectRatio = messagesFor(value).aspectRatio; await settle() }, cleanup() { p.cleanup(); h.cleanup() } }
}
