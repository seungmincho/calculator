import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch19/component-harness.cjs'

const has = (node, key) => Object.hasOwn(node.props, key)
const flush = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch26/translations-base64.json', 'utf8'))
const messagesFor = locale => {
  const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'))
  Object.assign(messages.base64Converter, patch[locale].base64Converter)
  return messages
}
const pngHeader = (w = 1, h = 1) => {
  const bytes = new Uint8Array(33), view = new DataView(bytes.buffer)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]); view.setUint32(8, 13); bytes.set([73, 72, 68, 82], 12)
  view.setUint32(16, w); view.setUint32(20, h); return bytes
}
let groups = 0
async function check(name, run) { await run(); groups++; console.log('PASS', name) }

async function fixture(locale = 'ko') {
  const messages = messagesFor(locale), urls = new Map(), revoked = [], downloaded = [], clipboard = [], jobs = [], images = []
  let sequence = 0, stored = 0, copyMode = 'success', legacy = false, legacyCalls = 0, clickFailure = false
  class Url extends URL {
    static createObjectURL(blob) { const url = `blob:base64-${++sequence}`; urls.set(url, blob); return url }
    static revokeObjectURL(url) { revoked.push(url) }
  }
  class Host {
    constructor(kind = '') { this.kind = kind; this.style = {} }
    focus() {} select() {} setSelectionRange() {} remove() {}
    click() { if (clickFailure) throw new Error('download unavailable'); downloaded.push({ blob: urls.get(this.href), name: this.download, url: this.href }) }
  }
  class Raster {
    constructor() { images.push(this); this.naturalWidth = 1; this.naturalHeight = 1 }
    set src(value) { this.source = value }
    get src() { return this.source }
  }
  const h = await componentHarness('src/components/Base64Converter.tsx', {
    props: {}, messages, url: 'https://toolhub.ai.kr/base64-converter/?kept=yes#unchanged',
    modules: { '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' } },
    globals: { URL: Url, Image: Raster, AbortController, atob, btoa, File, HTMLElement: Host, fetch() { throw new Error('Unexpected data network request') } },
    storagePort: { getItem() { stored++; return null }, setItem() { stored++ }, removeItem() { stored++ } },
    navigator: { clipboard: { writeText(text) {
      clipboard.push(text)
      if (copyMode === 'failure') return Promise.reject(new Error('clipboard denied'))
      if (copyMode === 'pending') { const task = deferred(); jobs.push(task); return task.promise }
      return Promise.resolve()
    } } },
    document: { activeElement: new Host(), body: { appendChild() {} }, createElement: kind => new Host(kind), execCommand() { legacyCalls++; return legacy } },
  })
  h.render(); await flush(); h.render()
  const node = (name, value = '') => h.find(item => item.props[`data-base64-${name}`] === value)
  const optional = name => h.all().find(item => has(item, `data-base64-${name}`))
  const recovery = () => h.all().find(item => typeof item.type === 'function' && item.type.name === 'Base64CopyRecovery')
  const settle = async () => { await flush(); h.render() }
  return { h, node, optional, recovery, clipboard, jobs, images, urls, revoked, downloaded, stored: () => stored, legacyCalls: () => legacyCalls,
    output: () => optional('output')?.props.value, input: () => optional('input')?.props.value,
    edit(value) { node('input').props.onChange({ target: { value } }); h.render() },
    click(name, value = '') { node(name, value).props.onClick(); h.render() },
    format(value) { node('format').props.onChange({ target: { value } }); h.render() },
    async upload(file) { const event = { target: { files: file ? [file] : [], value: 'chosen' } }; const pending = node('upload').props.onChange(event); h.render(); assert.equal(event.target.value, ''); await pending; await settle() },
    async convert() { node('convert').props.onClick(); h.render(); await settle() },
    copyMode(value, fallback = false) { copyMode = value; legacy = fallback },
    async copy() { node('copy').props.onClick(); await settle() },
    clickFailure(value) { clickFailure = value },
    locale(value) { messages.base64Converter = messagesFor(value).base64Converter; h.render() },
    settle, cleanup() { h.cleanup() },
  }
}

await check('Translated initial example, Unicode/whitespace, strict format/padding and opposite-input round trip', async () => {
  for (const locale of ['ko', 'en']) {
    const f = await fixture(locale), example = patch[locale].base64Converter.flow.sample
    assert.equal(f.input(), example); assert.equal(f.output(), Buffer.from(example).toString('base64'))
    for (const input of ['한글 😀\n ', ' \t\r\n', '\uFEFFbom', '\u0000byte']) {
      f.edit(input); assert.equal(f.node('download').props.disabled, true)
      await f.convert(); assert.equal(f.output(), Buffer.from(input).toString('base64'))
      f.click('swap'); assert.equal(f.node('mode', 'decode').props['aria-pressed'], true)
      await f.convert(); assert.equal(f.output(), input)
      f.click('swap'); assert.equal(f.input(), input)
    }
    f.edit('f'); f.format('url'); await f.convert(); assert.equal(f.output(), 'Zg')
    f.node('padding').props.onChange({ target: { checked: true } }); f.h.render(); await f.convert(); assert.equal(f.output(), 'Zg==')
    f.click('mode', 'decode'); f.edit('Zh=='); await f.convert(); assert.ok(f.optional('error')); assert.equal(f.node('download').props.disabled, true)
    f.edit('-_8'); await f.convert(); assert.equal(f.optional('utf8').props['data-base64-utf8'], false)
    f.format('standard'); await f.convert(); assert.ok(f.optional('error'))
    f.edit(' Z\tg\r\n=\f= '); await f.convert(); assert.equal(f.output(), 'f')
    f.cleanup()
  }
})

await check('Actual File bytes remain the source on repeat encode; raw/data URL downloads and binary decode are exact', async () => {
  const f = await fixture(), bytes = new Uint8Array([0, 255, 17, 128, 251, 255])
  await f.upload(new File([bytes], '../../payload.html', { type: 'text/html' }))
  const raw = Buffer.from(bytes).toString('base64')
  assert.ok(f.optional('file-source')); assert.equal(f.output(), raw)
  await f.convert(); assert.equal(f.output(), raw)
  f.click('download'); assert.equal(await f.downloaded.at(-1).blob.text(), raw); assert.equal(f.downloaded.at(-1).name, 'payload.txt')
  f.click('output-view', 'dataUrl'); assert.equal(f.output(), 'data:text/html;base64,' + raw)
  await f.copy(); assert.equal(f.clipboard.at(-1), f.output())
  f.click('download'); assert.equal(await f.downloaded.at(-1).blob.text(), f.output())
  f.click('swap'); await f.convert(); assert.equal(f.optional('utf8').props['data-base64-utf8'], false)
  assert.equal(f.output(), undefined); assert.equal(f.node('copy').props.disabled, true); assert.equal(f.node('swap').props.disabled, true)
  f.click('download'); const download = f.downloaded.at(-1)
  assert.equal(download.name, 'converted.bin'); assert.equal(download.blob.type, 'application/octet-stream')
  assert.deepEqual(new Uint8Array(await download.blob.arrayBuffer()), bytes)
  f.h.tick(1000); assert.equal(f.revoked.length, 3)
  f.cleanup()
})

await check('Decode file uploads read UTF-8 text/BOM once; invalid files retain source; empty files and limits stay explicit', async () => {
  const f = await fixture(); f.click('mode', 'decode')
  const raw = Buffer.from('원본😀').toString('base64')
  await f.upload(new File(['\uFEFF' + raw], 'source.base64')); assert.equal(f.input(), raw); assert.equal(f.output(), '')
  await f.convert(); assert.equal(f.output(), '원본😀')
  f.click('download'); assert.equal(await f.downloaded.at(-1).blob.text(), '원본😀'); assert.equal(f.downloaded.at(-1).name, 'source.txt')
  for (const file of [new File([new Uint8Array([255])], 'bad.txt'), new File([new Uint8Array([255])], 'bad.bin')]) {
    await f.upload(file); assert.equal(f.input(), raw); assert.ok(f.optional('error'))
  }
  await f.upload(null); assert.equal(f.input(), raw)
  await f.upload(new File(['QQ=='], 'source.custom', { type: 'application/octet-stream' })); assert.equal(f.input(), 'QQ==')
  await f.convert(); assert.equal(f.output(), 'A')
  f.click('mode', 'encode'); await f.upload(new File([], 'empty.bin')); assert.equal(f.output(), ''); assert.equal(f.node('download').props.disabled, false)
  f.click('download'); assert.equal(f.downloaded.at(-1).blob.size, 0)
  let reads = 0
  await f.upload({ name: 'large.bin', type: '', size: 4 * 1024 * 1024 + 1, arrayBuffer() { reads++; throw new Error('must not read') } })
  assert.equal(reads, 0); assert.ok(f.optional('file-source'))
  f.click('use-text'); f.edit('가'.repeat(Math.floor(4 * 1024 * 1024 / 3) + 1)); await f.convert()
  assert.ok(f.optional('error')); assert.ok(f.input().length > 1000000); assert.equal(f.node('download').props.disabled, true)
  f.cleanup()
})

await check('Late file success/failure cannot replace edited input, new selection, mode, format, clear or unmounted state', async () => {
  for (const change of ['input', 'mode', 'format', 'clear', 'new', 'unmount']) for (const failed of [false, true]) {
    const f = await fixture(), task = deferred()
    const pending = f.upload({ name: 'old.bin', type: '', size: 1, arrayBuffer: () => task.promise })
    if (change === 'input') f.edit('latest')
    if (change === 'mode') f.click('mode', 'decode')
    if (change === 'format') f.format('url')
    if (change === 'clear') f.click('clear')
    if (change === 'new') await f.upload(new File(['new'], 'new.bin'))
    if (change === 'unmount') f.cleanup()
    if (failed) task.reject(new Error('late read')); else task.resolve(new Uint8Array([255]).buffer)
    await pending
    assert.equal(f.optional('error'), undefined)
    if (change === 'input') assert.equal(f.input(), 'latest')
    if (change === 'clear') assert.equal(f.input(), '')
    if (change === 'new') assert.equal(f.output(), Buffer.from('new').toString('base64'))
    else assert.equal(f.optional('file-source'), undefined)
    if (change !== 'unmount') f.cleanup()
  }
})

await check('Current true/false clipboard outcomes, recovery retry/close and late copy responses follow result generations', async () => {
  const f = await fixture(); await f.copy(); assert.equal(f.node('copy').props['data-base64-copied'], true)
  f.h.tick(2000); assert.equal(f.node('copy').props['data-base64-copied'], false)
  f.copyMode('failure'); await f.copy(); assert.equal(f.node('copy').props['data-base64-copied'], false)
  assert.equal(f.recovery().props.text, f.output()); assert.equal(f.legacyCalls(), 1)
  f.copyMode('success'); f.recovery().props.onRetry(); await f.settle(); assert.equal(f.recovery(), undefined)
  f.copyMode('failure', true); await f.copy(); assert.equal(f.node('copy').props['data-base64-copied'], true)
  f.cleanup()
  for (const change of ['input', 'mode', 'format', 'view', 'clear', 'close', 'unmount']) for (const failed of [false, true]) {
    const f = await fixture(); f.copyMode('failure'); await f.copy()
    f.copyMode('pending'); f.recovery().props.onRetry(); f.h.render()
    const before = f.legacyCalls()
    if (change === 'input') f.edit('latest')
    if (change === 'mode') f.click('mode', 'decode')
    if (change === 'format') f.format('url')
    if (change === 'view') f.click('output-view', 'dataUrl')
    if (change === 'clear') f.click('clear')
    if (change === 'close') { f.recovery().props.onClose(); f.h.render() }
    if (change === 'unmount') f.cleanup()
    if (failed) f.jobs[0].reject(new Error('late clipboard')); else f.jobs[0].resolve()
    await f.settle(); assert.equal(f.legacyCalls(), before)
    if (change !== 'unmount') { assert.equal(f.recovery(), undefined); assert.equal(f.node('copy').props['data-base64-copied'], false); f.cleanup() }
  }
})

await check('Preview header/load gates and URL cleanup keep MIME-only SVG, broken headers, huge raster and late images separate', async () => {
  const f = await fixture(); f.click('mode', 'decode')
  const source = bytes => 'data:image/png;base64,' + Buffer.from(bytes).toString('base64')
  for (const bytes of [Buffer.from('<svg onload="alert(1)"></svg>'), pngHeader(4097, 4096), pngHeader().slice(0, 16)]) {
    f.edit(source(bytes)); await f.convert(); assert.equal(f.images.length, 0); assert.equal(f.optional('preview'), undefined)
    f.click('download'); assert.deepEqual(Buffer.from(await f.downloaded.at(-1).blob.arrayBuffer()), Buffer.from(bytes))
  }
  f.edit(source(pngHeader())); await f.convert(); assert.equal(f.images.length, 1)
  f.images.at(-1).onload(); await f.settle(); const ready = f.optional('preview').props.src
  f.click('download'); assert.equal(f.downloaded.at(-1).name, 'converted.png'); assert.equal(f.downloaded.at(-1).blob.type, 'image/png')
  f.edit('Zg=='); assert.equal(f.revoked.filter(url => url === ready).length, 1)
  f.edit(source(pngHeader())); await f.convert(); const image = f.images.at(-1), late = image.onload, oldUrl = image.src
  f.click('clear'); late(); await f.settle(); assert.equal(f.optional('preview'), undefined)
  assert.equal(f.revoked.filter(url => url === oldUrl).length, 1)
  f.edit(source(pngHeader())); await f.convert(); f.images.at(-1).onerror(); await f.settle(); assert.ok(f.optional('preview-failed'))
  f.cleanup(); for (const url of f.urls.keys()) assert.equal(f.revoked.filter(value => value === url).length, 1)
})

await check('Download failure retains bytes, stale download handlers do nothing, locale and privacy preserve content', async () => {
  const f = await fixture(), original = f.output(), input = f.input(), before = f.h.window.location.href
  f.locale('en'); assert.equal(f.input(), input); assert.equal(f.output(), original)
  const oldDownload = f.node('download').props.onClick
  f.clickFailure(true); f.click('download'); assert.ok(f.optional('error')); assert.equal(f.output(), original)
  assert.equal(f.revoked.length, 1)
  f.clickFailure(false); f.click('download'); assert.equal(await f.downloaded.at(-1).blob.text(), original)
  f.edit('private new source'); const urls = f.urls.size; oldDownload(); assert.equal(f.urls.size, urls)
  f.locale('ko'); assert.equal(f.input(), 'private new source')
  assert.equal(f.stored(), 0); assert.equal(f.h.window.location.href, before)
  assert.ok(f.node('input').props.className.includes('text-base'))
  assert.ok(f.h.all().filter(node => node.type === 'button').every(node => node.props.className.includes('min-h-11')))
  f.cleanup(); assert.equal(f.revoked.length, f.urls.size)
})

await check('Actual recovery child supports manual selection/error, retry/busy/close in KO and EN', async () => {
  for (const locale of ['ko', 'en']) {
    let selected = 0, retried = 0, closed = 0, fail = false
    const props = { text: '한글\ncopy', busy: false, onRetry() { retried++ }, onClose() { closed++ } }
    const h = await componentHarness('src/components/Base64CopyRecovery.tsx', { props, messages: messagesFor(locale), beforeEffects(tree) {
      const visit = node => {
        if (!node || typeof node !== 'object') return
        if (Array.isArray(node)) { node.forEach(visit); return }
        if (node.type === 'textarea') node.props.ref.current = { focus() {}, select() { if (fail) throw new Error('denied'); selected++ }, setSelectionRange(start, end) { assert.equal(start, 0); assert.equal(end, props.text.length) } }
        visit(node.props?.children)
      }; visit(tree)
    } })
    h.render(); const select = () => h.find(node => has(node, 'data-base64-select')).props.onClick()
    assert.equal(h.find(node => node.type === 'textarea').props.readOnly, true)
    select(); assert.equal(selected, 1); fail = true; select(); h.render()
    assert.ok(h.text().includes(patch[locale].base64Converter.copyRecovery.selectionFailed))
    h.find(node => has(node, 'data-base64-copy-retry')).props.onClick(); assert.equal(retried, 1)
    h.setProps({ ...props, busy: true }); assert.equal(h.find(node => has(node, 'data-base64-copy-retry')).props.disabled, true)
    h.find(node => has(node, 'data-base64-copy-close')).props.onClick(); assert.equal(closed, 1); h.cleanup()
  }
})

console.log(`Base64 parent/recovery: ${groups} groups passed (actual components, File/Blob; controlled clipboard/image/DOM ports)`)
