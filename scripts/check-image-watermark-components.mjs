import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import * as domain from '../src/utils/imageWatermark.ts'
import * as queueModule from '../src/utils/imageWatermarkQueue.ts'
import * as zipModule from '../src/utils/imageWatermarkZip.ts'
import { createWatermarkBrowserAdapter } from '../src/lib/imageWatermark/browser.ts'
const require = createRequire(import.meta.url)
const { componentHarness } = require('../docs/verify/2026-11-17-repeat-batch19/component-harness.cjs')
const flush = () => new Promise(resolve => setImmediate(resolve))
const defer = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const catalog = language => {
  const messages = JSON.parse(fs.readFileSync(`messages/${language}.json`, 'utf8'))
  messages.imageWatermark.batch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch28/translations-watermark.json', 'utf8'))[language].imageWatermark.batch
  return messages
}
function image(name, width = 320, height = 200) {
  const bytes = new Uint8Array(33), view = new DataView(bytes.buffer)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]); view.setUint32(8, 13); bytes.set([73, 72, 68, 82], 12); view.setUint32(16, width); view.setUint32(20, height)
  return new File([bytes], name, { type: 'image/png' })
}
class Context {
  globalAlpha = 1; commands = []; stack = []; font = ''; fillStyle = ''
  save() { this.stack.push(this.globalAlpha) }
  restore() { this.globalAlpha = this.stack.pop() ?? 1 }
  scale(...v) { this.commands.push(['scale', ...v]) }
  translate(...v) { this.commands.push(['translate', ...v]) }
  rotate(...v) { this.commands.push(['rotate', ...v]) }
  drawImage(source, ...v) { this.commands.push(['image', source.name ?? 'preview', this.globalAlpha, ...v]) }
  fillText(...v) { this.commands.push(['text', this.globalAlpha, this.font, this.fillStyle, ...v]) }
  measureText(text) { return { width: Array.from(text).length * 12 } }
}
class Canvas { context = new Context(); constructor(width = 0, height = 0) { this.width = width; this.height = height } getContext() { return this.context } }
async function fixture(options = {}) {
  const messages = catalog(options.language ?? 'ko'), originals = { untouched: 'exact saved bytes' }, reads = [], decoded = [], closed = [], canvases = [], encoded = [], zipEntries = [], saved = [], urls = new Map(), revoked = []
  let readPort = file => file.arrayBuffer(), pngPort = async canvas => new Blob([JSON.stringify(canvas.context.commands)], { type: 'image/png' }), zipPort = async entries => new Blob([entries.map(entry => entry.name).join('\n')], { type: 'application/zip' }), saveFails = false, adapter
  class LocalURL extends URL {}
  LocalURL.createObjectURL = blob => { const url = `blob:download-${urls.size}`; urls.set(url, blob); return url }
  LocalURL.revokeObjectURL = url => revoked.push(url)
  const h = await componentHarness(options.entry ?? 'src/components/ImageWatermarkWorkspace.tsx', {
    props: {}, messages, url: 'https://toolhub.ai.kr/image-watermark/?keep=yes#untouched', storage: originals,
    globals: { File, AbortController, Set, URL: LocalURL },
    modules: {
      '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' }, '@/components/GuideSection': { __esModule: true, default: 'GuideSection' },
      '@/utils/imageWatermark': domain, '@/utils/imageWatermarkQueue': queueModule, '@/utils/imageWatermarkZip': zipModule,
      '@/lib/imageWatermark/browser': { createWatermarkBrowserAdapter() {
        adapter = createWatermarkBrowserAdapter({
          read(file) { reads.push(file.name); return readPort(file) },
          async decode(file) { const buffer = await file.arrayBuffer(), view = new DataView(buffer); decoded.push(file.name); return { src: { name: file.name }, width: view.getUint32(16), height: view.getUint32(20), close: () => closed.push(file.name) } },
          canvas(width, height) { const canvas = new Canvas(width, height); canvases.push(canvas); return canvas },
          png(canvas) { encoded.push({ width: canvas.width, height: canvas.height, commands: canvas.context.commands }); return pngPort(canvas) },
          url(blob) { const url = `blob:result-${urls.size}`; urls.set(url, blob); return url }, revoke(url) { revoked.push(url) },
        }); return adapter
      }, encodeWatermarkZip(entries) { zipEntries.push(entries); return zipPort(entries) } },
    },
    document: { body: { appendChild() {} }, createElement(tag) { assert.equal(tag, 'a'); return { click() { if (saveFails) throw new Error('download denied'); saved.push({ name: this.download, blob: urls.get(this.href) }) }, remove() {} } } },
    beforeEffects(tree) { const visit = value => { if (!value || typeof value !== 'object') return; if (Array.isArray(value)) return value.forEach(visit); if (value.type === 'canvas' && value.props.ref) value.props.ref.current ??= new Canvas(); if (value.type === 'input' && value.props.ref) value.props.ref.current ??= { value: '' }; visit(value.props?.children) }; visit(tree) },
  })
  const by = (key, value) => h.find(node => Object.hasOwn(node.props, key) && (value === undefined || node.props[key] === value))
  const settle = async () => { for (let index = 0; index < 8; index++) { await flush(); h.render() } }
  const change = (key, value, attribute) => { by(key, attribute).props.onChange({ target: { value, checked: value } }); h.render() }
  const click = (key, value) => { const node = by(key, value); assert.ok(!node.props.disabled, `disabled: ${key}=${value}`); const result = node.props.onClick(); h.render(); return result }
  const add = files => { by('data-watermark-files').props.onChange({ target: { files, value: 'synthetic' } }); h.render() }
  const logo = file => { by('data-watermark-logo').props.onChange({ target: { files: [file], value: 'synthetic' } }); h.render() }
  const rows = () => h.all().filter(node => Object.hasOwn(node.props, 'data-watermark-row'))
  const id = index => rows()[index].props['data-watermark-row']
  const statuses = () => rows().map(row => row.props['data-watermark-status'])
  h.render(); await settle()
  return { h, by, settle, change, click, add, logo, rows, id, statuses, messages, reads, decoded, closed, canvases, encoded, zipEntries, saved, urls, revoked,
    read(port) { readPort = port }, png(port) { pngPort = port }, zip(port) { zipPort = port }, failSave(value) { saveFails = value }, adapter: () => adapter,
    locale(language) { messages.imageWatermark = catalog(language).imageWatermark; h.render() },
  }
}
let groups = 0
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log('PASS', name) }

await check('actual workspace preserves the single-photo options; adding files only previews, explicit creation keeps failed rows and complete originals', async () => {
  const f = await fixture(); assert.equal(f.h.find(n => n.type === 'MobileResultLink').props.href, '#image-watermark-result')
  const first = image('same.png', 4000, 3000), second = image('same.png', 200, 400), bad = new File(['bad'], 'broken.png')
  f.add([first, bad, second]); await f.settle(); assert.equal(f.encoded.length, 0); assert.deepEqual(f.statuses(), ['pending', 'pending', 'pending'])
  assert.equal(f.by('data-watermark-preview').props.width, 800); assert.equal(f.by('data-watermark-preview').props.height, 600)
  f.click('data-watermark-down', f.id(0)); f.click('data-watermark-up', f.id(1)); f.click('data-watermark-action', 'start'); await f.settle()
  assert.deepEqual(f.statuses(), ['done', 'error', 'done']); assert.deepEqual(f.encoded.map(item => [item.width, item.height]), [[4000, 3000], [200, 400]])
  assert.match(f.h.text(), /선택 3개 중 현재 설정의 완료 결과 2개/)
  f.click('data-watermark-png', f.id(0)); assert.equal(f.saved[0].name, 'same_watermarked.png')
  f.click('data-watermark-action', 'zip'); await f.settle(); assert.deepEqual(f.zipEntries[0].map(entry => entry.name), ['same_watermarked.png', 'same_watermarked (2).png'])
  const successful = f.encoded.length; f.click('data-watermark-action', 'retry'); await f.settle(); assert.equal(f.encoded.length, successful); assert.deepEqual(f.statuses(), ['done', 'error', 'done'])
  f.h.cleanup(); assert.equal(new Set(f.revoked).size, f.revoked.length)
})

await check('all nine positions and strict text/color/active-mode options remain editable without hidden fallback or automatic PNG generation', async () => {
  const f = await fixture(); f.add([image('source.png')]); await f.settle()
  for (const position of domain.WATERMARK_POSITIONS) { f.click('data-watermark-position', position); await f.settle(); assert.equal(f.by('data-watermark-position', position).props['aria-pressed'], true) }
  f.change('data-watermark-text', '첫 줄\nsecond'); await f.settle(); assert.match(f.h.text(), /첫 줄 second/)
  f.change('data-watermark-color', 'invalid'); assert.equal(f.by('data-watermark-action', 'start').props.disabled, true); assert.equal(f.by('data-watermark-color').props.value, 'invalid')
  f.change('data-watermark-color', '#12abEF'); f.change('data-watermark-text', '😀'.repeat(201)); assert.equal(f.by('data-watermark-action', 'start').props.disabled, true)
  f.click('data-watermark-type', 'image'); f.logo(image('logo.png', 40, 20)); await f.settle(); assert.equal(f.by('data-watermark-action', 'start').props.disabled, false)
  f.click('data-watermark-action', 'start'); await f.settle(); assert.equal(f.encoded.length, 1)
  f.click('data-watermark-type', 'text'); assert.equal(f.by('data-watermark-text').props.value, '😀'.repeat(201)); assert.deepEqual(f.statuses(), ['pending'])
  f.change('data-watermark-text', 'valid'); f.change('data-watermark-option', 25, 'opacity'); f.change('data-watermark-option', -90, 'rotation'); f.change('data-watermark-option', true, 'bold')
  await f.settle(); assert.equal(f.encoded.length, 1); f.click('data-watermark-action', 'start'); await f.settle()
  const text = f.encoded[1].commands.find(command => command[0] === 'text'); assert.equal(text[1], 0.25); assert.match(text[2], /bold 48px/); assert.equal(text[3], '#12ABEF')
  f.h.cleanup()
})

await check('actual parent pause and continue hold native work until settlement; photos added after start wait for another explicit start', async () => {
  const f = await fixture(), pending = defer(); f.add([image('a.png'), image('b.png')]); await f.settle()
  let calls = 0; f.png(async () => ++calls === 1 ? pending.promise : new Blob(['new'], { type: 'image/png' }))
  f.click('data-watermark-action', 'start'); await f.settle(); assert.equal(f.encoded.length, 1)
  f.click('data-watermark-action', 'pause'); f.add([image('later.png')]); f.click('data-watermark-action', 'resume'); await f.settle(); assert.equal(f.encoded.length, 1)
  pending.resolve(new Blob(['stale'], { type: 'image/png' })); await f.settle(); assert.equal(f.encoded.length, 3); assert.deepEqual(f.statuses(), ['done', 'done', 'pending'])
  f.click('data-watermark-action', 'start'); await f.settle(); assert.equal(f.encoded.length, 4); assert.deepEqual(f.statuses(), ['done', 'done', 'done'])
  const late = defer(); f.change('data-watermark-text', 'new'); f.png(() => late.promise); f.click('data-watermark-action', 'start'); await f.settle()
  f.change('data-watermark-option', 60, 'opacity'); const count = f.encoded.length; late.resolve(new Blob(['obsolete'], { type: 'image/png' })); await f.settle()
  assert.equal(f.encoded.length, count); assert.deepEqual(f.statuses(), ['pending', 'pending', 'pending']); assert.ok(f.by('data-watermark-action', 'zip').props.disabled)
  f.h.cleanup()
})

await check('logo failures preserve the last valid file; clear/reset suppress late replacement and keep their distinct option contracts', async () => {
  const f = await fixture(); f.click('data-watermark-type', 'image'); const original = image('original-logo.png', 40, 20)
  f.logo(original); await f.settle(); f.logo(new File(['bad'], 'bad-logo.png')); await f.settle(); assert.match(f.h.text(), /현재 로고: original-logo.png/); assert.match(f.h.text(), /이전에 유효했던 로고/)
  f.change('data-watermark-option', 35, 'watermarkSize'); f.add([image('source.png')]); await f.settle()
  const delayed = defer(), incoming = image('late-logo.png'); f.read(file => file === incoming ? delayed.promise : file.arrayBuffer()); f.logo(incoming); await f.settle()
  f.click('data-watermark-action', 'clear'); delayed.resolve(await incoming.arrayBuffer()); await f.settle(); assert.equal(f.rows().length, 0); assert.match(f.h.text(), /현재 로고: original-logo.png/); assert.equal(f.by('data-watermark-option', 'watermarkSize').props.value, 35)
  f.click('data-watermark-action', 'reset'); assert.equal(f.by('data-watermark-text').props.value, '워터마크 예시'); f.click('data-watermark-type', 'image'); assert.ok(!f.h.text().includes('original-logo.png'))
  f.h.cleanup(); assert.ok(f.canvases.every(canvas => canvas.width === 0 && canvas.height === 0))
})

await check('ZIP captures current selected Blob references and names while settings cancellation keeps physical busy until real completion', async () => {
  const f = await fixture(); f.add([image('a.png'), image('a.png')]); await f.settle(); f.click('data-watermark-action', 'start'); await f.settle()
  const first = defer(); f.zip(() => first.promise); f.click('data-watermark-action', 'zip'); await f.settle(); const captured = f.zipEntries[0]
  f.click('data-watermark-remove', f.id(0)); f.click('data-watermark-action', 'deselect'); first.resolve(new Blob(['clicked zip'], { type: 'application/zip' })); await f.settle()
  assert.equal(f.saved.length, 1); assert.equal(captured.length, 2); assert.equal(await captured[0].blob.text(), await captured[1].blob.text())
  f.click('data-watermark-action', 'select-completed'); const old = defer(); f.zip(() => old.promise); f.click('data-watermark-action', 'zip'); await f.settle()
  f.change('data-watermark-option', 70, 'opacity'); assert.match(f.h.text(), /이전 ZIP 작업/); f.click('data-watermark-action', 'start'); await f.settle(); assert.ok(f.by('data-watermark-action', 'zip').props.disabled)
  const currentNotice = f.h.all().find(node => Object.hasOwn(node.props, 'data-watermark-notice'))?.props.children
  old.reject(new Error('old encode')); await f.settle(); assert.equal(f.saved.length, 1); assert.equal(f.h.all().find(node => Object.hasOwn(node.props, 'data-watermark-notice'))?.props.children, currentNotice); assert.ok(!f.h.text().includes('ZIP을 만들지 못했습니다'))
  f.zip(async () => new Blob(['current zip'])); f.click('data-watermark-action', 'zip'); await f.settle(); assert.equal(f.saved.length, 2)
  f.h.cleanup()
})

await check('download failure preserves exact completed results; locale does not edit private draft, files, URL or storage', async () => {
  const f = await fixture(); f.add([image('source.png')]); f.change('data-watermark-text', 'private 문구'); await f.settle(); f.click('data-watermark-action', 'start'); await f.settle()
  f.failSave(true); f.click('data-watermark-png', f.id(0)); assert.match(f.h.text(), /다운로드를 시작하지 못했습니다/); assert.deepEqual(f.statuses(), ['done'])
  const output = f.encoded.length; f.locale('en'); assert.equal(f.by('data-watermark-text').props.value, 'private 문구'); assert.deepEqual(f.statuses(), ['done']); assert.equal(f.encoded.length, output)
  f.failSave(false); f.click('data-watermark-png', f.id(0)); assert.equal(f.saved.length, 1); assert.equal(f.h.window.location.href, 'https://toolhub.ai.kr/image-watermark/?keep=yes#untouched'); assert.deepEqual([...f.h.stored], [['untouched', 'exact saved bytes']])
  const pending = defer(); f.zip(() => pending.promise); f.click('data-watermark-action', 'zip'); await f.settle(); f.h.cleanup(); pending.resolve(new Blob(['late'])); await flush(); assert.equal(f.saved.length, 1)
  assert.equal(new Set(f.revoked).size, f.revoked.length)
})

await check('aggregate limits preserve current rows and selection; late source reading cannot revive a cleared preview', async () => {
  const f = await fixture(); const first = image('first.png'); f.add([first]); await f.settle(); const id = f.id(0)
  f.add(Array.from({ length: 10 }, (_, i) => image(`more-${i}.png`))); assert.equal(f.rows().length, 1); assert.equal(f.id(0), id)
  const fake = { name: 'too-big.png', size: 40 * 1024 * 1024 }; f.add([fake]); assert.equal(f.rows().length, 1); assert.match(f.h.text(), /합계가 40 MiB/)
  const pending = defer(), next = image('next.png'); f.read(file => file === next ? pending.promise : file.arrayBuffer()); f.add([next]); f.click('data-watermark-select-preview', f.id(1)); await f.settle(); f.click('data-watermark-action', 'clear')
  pending.resolve(await next.arrayBuffer()); await f.settle(); assert.equal(f.rows().length, 0); assert.ok(!f.h.all().some(node => Object.hasOwn(node.props, 'data-watermark-preview')))
  f.h.cleanup()
})

await check('existing ImageWatermark parent renders the actual workspace and explicit PNG actions through the existing route export', async () => {
  const f = await fixture({ entry: 'src/components/ImageWatermark.tsx', language: 'en' })
  assert.equal(f.h.all().filter(node => Object.hasOwn(node.props, 'data-watermark-workspace')).length, 1)
  assert.equal(f.by('data-watermark-text').props.value, 'Sample Watermark')
  f.add([image('existing-route.png', 100, 50)]); await f.settle(); assert.equal(f.encoded.length, 0)
  f.click('data-watermark-action', 'start'); await f.settle(); f.click('data-watermark-png', f.id(0))
  assert.equal(f.saved[0].name, 'existing-route_watermarked.png'); assert.equal(f.encoded[0].width, 100); assert.equal(f.encoded[0].height, 50)
  f.h.cleanup()
})

console.log(`Watermark actual workspace: ${groups} groups passed; real queue/adapter, synthetic image and native-I/O ports (not real PNG pixels)`)
