import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import QRCode from 'qrcode'
import JSZip from 'jszip'
// Local wrapper only: transform import() into require() so VM dependency ports are exercised.
const hostPath = new URL('../2026-11-17-repeat-batch19/component-harness.cjs', import.meta.url)
let hostSource = fs.readFileSync(hostPath, 'utf8')
const compileAnchor = 'bundle: true, write: false, format:'
const cleanupAnchor = '    cleanup() { hooks.forEach(hook => hook?.cleanup?.()); timers.clear() },'
assert.ok(hostSource.includes(compileAnchor) && hostSource.includes(cleanupAnchor))
hostSource = hostSource.replace(compileAnchor, "bundle: true, write: false, supported: { 'dynamic-import': false }, format:")
hostSource = hostSource.replace(cleanupAnchor, `    replayEffects() { for (const [index] of effects) hooks[index].cleanup?.(); for (const [index, pending] of effects) hooks[index].cleanup = pending.effect(); return render() },\n${cleanupAnchor}`)
const hostModule = { exports: {} }
vm.runInThisContext('(function(require, module, exports) {\n' + hostSource + '\n})', { filename: 'qr-batch-parent-local-wrapper.cjs' })(createRequire(hostPath), hostModule, hostModule.exports)
const { componentHarness } = hostModule.exports
const bundled = await build({ stdin: { contents: "export * from './src/utils/qrBatchPrint'; export * from './src/utils/qrBatchPrintJob'; export * from './src/utils/qrBatch';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' })
export const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`)
export const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const fragment = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch55/translations-qr-batch-print.json', 'utf8'))
function translations(locale) {
  const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'))
  const patch = fragment[locale].qrGenerator.batch
  messages.qrGenerator.batch.print = patch.print
  Object.assign(messages.qrGenerator.batch.notices, patch.notices)
  return messages
}
export async function fixture() {
  const io = { locale: 'ko', generationGate: null, frames: [], payloads: [], downloads: [], revoked: [] }, messages = translations(io.locale), blobs = new Map()
  class PortURL extends URL {
    static createObjectURL(blob) { const id = `blob:qr-${blobs.size + 1}`; blobs.set(id, blob); return id }
    static revokeObjectURL(id) { io.revoked.push(id); blobs.delete(id) }
  }
  const h = await componentHarness('src/components/QrBatchGenerator.tsx', { messages, globals: { URL: PortURL }, modules: {
    '@/contexts/LanguageContext': { useOptionalLanguage: () => ({ language: io.locale }) },
    '@/utils/qrBatch': api, '@/utils/qrBatchPrint': api,
    '@/utils/qrBatchPrintJob': { startQrBatchPrint: (plan, labels, locale, current) => api.startQrBatchPrint(plan, labels, locale, current, html => {
      const frame = { html, decode: deferred(), prints: 0, disposed: 0, after: null }
      io.frames.push(frame)
      return { decode: () => frame.decode.promise, print: () => { frame.prints++ }, dispose: () => { frame.disposed++ }, onAfterPrint: callback => { frame.after = callback } }
    }) },
    qrcode: { __esModule: true, default: { async toDataURL(payload, options) { io.payloads.push(payload); if (io.generationGate) await io.generationGate.promise; return QRCode.toDataURL(payload, options) } } },
    jszip: { __esModule: true, default: JSZip },
  }, document: {
    body: { appendChild() {} },
    createElement(tag) {
      assert.equal(tag, 'a')
      return { href: '', download: '', click() { io.downloads.push({ filename: this.download, blob: blobs.get(this.href) }) }, remove() {} }
    },
  } })
  h.render()
  const settle = async () => { await new Promise(resolve => setImmediate(resolve)); h.render() }
  const wait = async predicate => { for (let index = 0; index < 200; index++) { await new Promise(resolve => setTimeout(resolve, 5)); h.render(); if (predicate()) return }; throw new Error('Parent did not settle') }
  const label = key => key.split('.').reduce((value, part) => value[part], messages.qrGenerator)
  const button = key => h.button(label(key))
  const click = key => { const node = button(key); assert.equal(!!node.props.disabled, false); node.props.onClick(); h.render() }
  const edit = value => { h.find(node => node.type === 'textarea').props.onChange({ target: { value } }); h.render() }
  const generate = async (source = '안내\tfirst payload\n안내\tsecond payload') => { edit(source); click('batch.generate'); await wait(() => !button('batch.print.button').props.disabled) }
  const print = async () => { click('batch.print.button'); await settle(); return io.frames.at(-1) }
  const localeTo = locale => { io.locale = locale; Object.assign(messages, translations(locale)); h.render() }
  return { h, io, settle, wait, label, button, click, edit, generate, print, localeTo, cleanup() { h.cleanup() } }
}
