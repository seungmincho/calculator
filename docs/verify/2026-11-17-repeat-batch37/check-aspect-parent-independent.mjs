import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import * as image from '../../../src/utils/aspectRatioImage.ts'
import { createAspectImageAdapter } from '../../../src/lib/aspectRatioImage/browser.ts'
import { imagePorts, sourceFile, deferred, flush } from './check-aspect-independent.mjs'

const nodes = value => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)]
async function fixture(query = '') {
  const ports = imagePorts(), adapters = [], timers = [], microtasks = [], files = [], urls = new Map(), revoked = [], clipboard = [], legacy = [], copyJobs = []
  const messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8')), io = { locale: 'ko', copyMode: 'resolve', fallback: false }
  let serial = 0, selected = null
  const input = new EventTarget(); input.value = ''; input.click = () => {}
  const previewHost = { children: [], replaceChildren(...children) { this.children = children } }
  class PortURL extends URL { static createObjectURL(blob) { const url = `blob:aspect-independent-${++serial}`; urls.set(url, blob); return url } static revokeObjectURL(url) { revoked.push(url); urls.delete(url) } }
  const globals = { AbortController, URL: PortURL, queueMicrotask: callback => microtasks.push(callback),
    setTimeout(callback, delay) { const timer = { id: ++serial, callback, delay, canceled: false, fired: false }; timers.push(timer); return timer.id },
    clearTimeout(id) { const timer = timers.find(item => item.id === id); if (timer) timer.canceled = true } }
  const document = { activeElement: null, body: { appendChild() {} }, createElement(tag) {
    if (tag === 'a') return { href: '', download: '', click() { files.push({ name: this.download, blob: urls.get(this.href) }) }, remove() {} }
    if (tag !== 'textarea') throw new Error(`Unexpected DOM ${tag}`)
    selected = { value: '', style: {}, focus() {}, select() {}, setSelectionRange() {}, remove() {} }; return selected
  }, execCommand() { legacy.push(selected.value); return io.fallback } }
  const navigator = { clipboard: { writeText(text) { clipboard.push(text); if (io.copyMode === 'reject') return Promise.reject(new Error('denied')); if (io.copyMode === 'wait') { const pending = deferred(); copyJobs.push(pending); return pending.promise } return Promise.resolve() } } }
  const parent = await componentHarness('src/components/AspectRatio.tsx', { url: `https://toolhub.ai.kr/aspect-ratio/?keep=one&keep=two${query ? '&' + query : ''}#section`, props: {}, messages, globals, document, navigator,
    modules: { '@/components/AspectRatioImagePanel': { __esModule: true, default: 'IndependentImagePanel' }, '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' }, '@/contexts/LanguageContext': { useOptionalLanguage: () => ({ language: io.locale }) } } })
  const marker = { tree: 'preserved' }, replacements = []; parent.window.history.state = marker
  const replace = parent.window.history.replaceState
  parent.window.history.replaceState = (state, title, url) => { replacements.push({ state, url }); parent.window.history.state = state; replace(state, title, url) }
  parent.render()
  const panelProps = () => parent.find(node => node.type === 'IndependentImagePanel').props
  const panel = await componentHarness('src/components/AspectRatioImagePanel.tsx', { props: panelProps(), messages, globals, document, navigator,
    modules: { '@/lib/aspectRatioImage/browser': { createAspectImageAdapter() { const adapter = createAspectImageAdapter(ports.ports); adapters.push(adapter); return adapter } }, '@/utils/aspectRatioImage': image },
    beforeEffects(tree) { for (const node of nodes(tree)) { if (Object.hasOwn(node.props, 'data-aspect-image-file')) node.props.ref.current = input; if (Object.hasOwn(node.props, 'data-aspect-image-preview')) node.props.ref.current = previewHost } } })
  panel.render()
  const settle = async () => { for (let count = 0; count < 4; count++) { for (const work of microtasks.splice(0)) work(); await flush(); parent.render(); panel.setProps(panelProps()) } }
  const attr = (host, key, value = '') => host.find(node => node.props[key] === value)
  const tick = async delay => { for (const timer of timers.filter(item => item.delay === delay && !item.canceled && !item.fired)) { timer.fired = true; timer.callback() } await settle() }
  const edit = async (id, value) => { attr(parent, 'id', id).props.onChange({ target: { value } }); await settle() }
  const click = async (host, key, value = '') => { attr(host, key, value).props.onClick(); await settle() }
  const load = async file => { attr(panel, 'data-aspect-image-file').props.onChange({ target: { files: [file], value: file.name } }); await settle() }
  const crop = async (x, y) => { panel.find(node => typeof node.type === 'function' && Object.hasOwn(node.props, 'canMoveX')).props.onChange(x, y); await settle() }
  const locale = async value => { io.locale = value; Object.assign(messages, JSON.parse(fs.readFileSync(`messages/${value}.json`, 'utf8'))); await settle() }
  const cleanup = () => { panel.cleanup(); parent.cleanup() }
  return { parent, panel, ports, adapters, io, clipboard, legacy, copyJobs, files, urls, revoked, timers, microtasks, input, previewHost, marker, replacements,
    settle, attr, tick, edit, click, load, crop, locale, cleanup, source: () => attr(panel, 'data-aspect-image-panel').props }
}
const tests = [], test = (name, run) => tests.push({ name, run })
test('actual initial finite URL restoration, early editing and later URL sync preserve unrelated state', async () => {
  const f = await fixture('w=1080&h=1920&lock=1&zone=reels')
  assert.equal(f.attr(f.parent, 'id', 'ar-w').props.value, '1920'); await f.settle()
  assert.equal(f.attr(f.parent, 'id', 'ar-w').props.value, '1080'); assert.equal(f.attr(f.parent, 'id', 'ar-h').props.value, '1920'); assert.equal(f.replacements.length, 0)
  await f.edit('ar-w', '540'); assert.equal(f.attr(f.parent, 'id', 'ar-h').props.value, '960'); await f.tick(300)
  const url = new URL(f.parent.window.location.href); assert.equal(url.searchParams.get('w'), '540'); assert.deepEqual(url.searchParams.getAll('keep'), ['one', 'two']); assert.equal(url.hash, '#section'); assert.ok(f.replacements.every(item => item.state === f.marker)); f.cleanup()
  const early = await fixture('w=1&h=2'); early.attr(early.parent, 'id', 'ar-w').props.onChange({ target: { value: '777' } }); await early.settle(); assert.equal(early.attr(early.parent, 'id', 'ar-w').props.value, '777'); early.cleanup()
  const bad = await fixture('w=Infinity&h=0&lock=1'); await bad.settle(); assert.equal(bad.attr(bad.parent, 'id', 'ar-w').props.value, 'Infinity'); assert.equal(bad.attr(bad.parent, 'data-aspect-lock', true).props['aria-pressed'], false); assert.equal(bad.replacements.length, 0); bad.cleanup()
})
test('actual source replacement failure keeps old source and position; only successful replacement recenters', async () => {
  const f = await fixture('w=400&h=400'); await f.settle(); f.parent.replayEffects(); f.panel.replayEffects(); await f.settle()
  await f.load(sourceFile('A.png')); await f.crop(73, 19); await f.tick(60)
  assert.equal(f.source()['data-aspect-image-source'], 'A.png'); assert.equal(f.source()['data-aspect-image-x'], 73)
  f.ports.io.readFailure = true; await f.load(sourceFile('B.png')); await f.tick(60)
  assert.equal(f.source()['data-aspect-image-source'], 'A.png'); assert.equal(f.source()['data-aspect-image-x'], 73); assert.equal(f.source()['data-aspect-image-y'], 19)
  assert.equal(f.ports.closes.includes('A.png'), false); assert.equal(f.attr(f.panel, 'data-aspect-image-error', 'read').props.role, 'alert')
  f.ports.io.readFailure = false; await f.load(sourceFile('C.png')); assert.equal(f.source()['data-aspect-image-source'], 'C.png'); assert.equal(f.source()['data-aspect-image-x'], 50); assert.equal(f.source()['data-aspect-image-y'], 50); assert.deepEqual(f.ports.closes, ['A.png'])
  f.cleanup(); assert.deepEqual(f.ports.closes, ['A.png', 'C.png'])
})
test('actual accepted thin source produces bounded preview frame and options preserve position', async () => {
  const f = await fixture('w=1&h=8192'); await f.settle(); await f.load(sourceFile('thin.png', 1, 8192)); await f.tick(60)
  const frame = f.attr(f.panel, 'data-aspect-image-frame').props.style
  assert.ok(parseFloat(frame.width) > 0 && parseFloat(frame.width) <= 100); assert.equal(frame.height, '100%')
  assert.ok(f.attr(f.panel, 'data-aspect-preview-bounds').props.className.includes('aspect-square'))
  assert.deepEqual(f.previewHost.children.map(c => [c.width, c.height]), [[1, 320]])
  await f.load(sourceFile('wide.png')); await f.crop(100, 0); await f.click(f.panel, 'data-aspect-image-fit', 'pad'); await f.click(f.panel, 'data-aspect-image-fit', 'crop'); await f.edit('ar-w', '2')
  assert.equal(f.source()['data-aspect-image-x'], 100); assert.equal(f.source()['data-aspect-image-y'], 0); f.cleanup()
})
test('actual late decode after clear/unmount releases itself and cannot revive removed source', async () => {
  const f = await fixture(); await f.settle(); await f.load(sourceFile('A.png')); const waiting = deferred(); f.ports.io.decodeWait = waiting
  await f.load(sourceFile('late.png')); await f.click(f.panel, 'data-aspect-image-clear'); assert.equal(f.source()['data-aspect-image-source'], '')
  f.ports.io.decodeWait = null; waiting.resolve(); await f.settle(); assert.equal(f.source()['data-aspect-image-source'], ''); assert.deepEqual(f.ports.closes, ['A.png', 'late.png'])
  const last = deferred(); f.ports.io.decodeWait = last; await f.load(sourceFile('unmounted.png')); f.cleanup(); last.resolve(); await flush(); await flush()
  assert.deepEqual(f.ports.closes, ['A.png', 'late.png', 'unmounted.png']); assert.equal(f.files.length, 0)
})
test('actual canceled export retains native slot, suppresses old download and allows explicit current retry with URL cleanup', async () => {
  const f = await fixture('w=400&h=400'); await f.settle(); await f.load(sourceFile('A.png')); await f.tick(60)
  const pending = deferred(); f.ports.io.encodeWait = pending; await f.click(f.panel, 'data-aspect-image-download'); assert.equal(f.ports.encodes.length, 1)
  const oldCanvas = f.ports.encodes[0].canvas; await f.crop(0, 100); await f.tick(60); await f.click(f.panel, 'data-aspect-image-download')
  assert.equal(f.ports.encodes.length, 1); assert.ok(oldCanvas.width > 0); assert.equal(f.files.length, 0)
  f.ports.io.encodeWait = null; pending.resolve(); await f.settle(); assert.equal(f.ports.encodes.length, 2); assert.equal(f.files.length, 1)
  assert.equal(f.files[0].name, 'A-400x400-crop.png'); assert.equal(f.files[0].blob.type, 'image/png'); assert.deepEqual([oldCanvas.width, oldCanvas.height], [0, 0])
  assert.equal(f.urls.size, 1); f.cleanup(); assert.equal(f.urls.size, 0); assert.equal(f.revoked.length, 1)
  for (const timer of f.timers.filter(item => item.delay === 1000)) timer.callback(); assert.equal(f.revoked.length, 1)
})
test('actual copy input ABA/locale ABA/new target reject old fallback; current failure permits full-text recovery', async () => {
  const f = await fixture(); await f.settle(); const first = f.parent.all().find(node => Object.hasOwn(node.props, 'data-aspect-copy')); const id = first.props['data-aspect-copy']
  f.io.copyMode = 'wait'; await f.click(f.parent, 'data-aspect-copy', id); await f.edit('ar-w', '777'); await f.edit('ar-w', '1920'); f.copyJobs.shift().reject(new Error('old')); await f.settle(); assert.equal(f.legacy.length, 0)
  await f.click(f.parent, 'data-aspect-copy', id); await f.locale('en'); await f.locale('ko'); f.copyJobs.shift().reject(new Error('old locale')); await f.settle(); assert.equal(f.legacy.length, 0)
  await f.click(f.parent, 'data-aspect-copy', id); const old = f.copyJobs.shift(); const otherId = f.parent.all().find(node => Object.hasOwn(node.props, 'data-aspect-copy') && node.props['data-aspect-copy'] !== id).props['data-aspect-copy']
  f.io.copyMode = 'resolve'; await f.click(f.parent, 'data-aspect-copy', otherId); old.reject(new Error('old target')); await f.settle(); assert.equal(f.legacy.length, 0); assert.equal(f.attr(f.parent, 'data-aspect-copy', otherId).props['data-aspect-copied'], true)
  f.io.copyMode = 'reject'; await f.click(f.parent, 'data-aspect-copy', id); assert.equal(f.legacy.length, 1)
  const recovery = f.parent.find(node => typeof node.type === 'function' && Object.hasOwn(node.props, 'onRetry')); assert.equal(recovery.props.text, f.clipboard.at(-1))
  f.io.fallback = true; recovery.props.onRetry(); await f.settle(); assert.equal(f.attr(f.parent, 'data-aspect-copy', id).props['data-aspect-copied'], true)
  f.io.copyMode = 'wait'; await f.click(f.parent, 'data-aspect-copy', otherId); const ended = f.copyJobs.shift(); f.cleanup(); ended.reject(new Error('unmounted')); await flush(); assert.equal(f.legacy.length, 2)
})

for (const { name, run } of tests) { await run(); console.log('PASS', name) }
console.log(`Aspect independent actual parent: ${tests.length} groups passed`)
