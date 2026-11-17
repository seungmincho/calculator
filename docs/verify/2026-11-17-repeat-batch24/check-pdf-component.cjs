/* eslint-disable @typescript-eslint/no-require-imports -- Actual parent event runner with controlled DOM and real pdf-lib output. */
const assert = require('node:assert/strict')
const pdfLib = require('pdf-lib')
const { PDFDocument, degrees, PDFArray, PDFRawStream, decodePDFRawStream } = pdfLib
const { componentHarness } = require('../2026-11-17-repeat-batch19/component-harness.cjs')
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const nextTurn = () => new Promise(resolve => setImmediate(resolve))

async function source() {
  const pdf = await PDFDocument.create()
  for (let i = 0; i < 3; i++) { const page = pdf.addPage([200 + i * 10, 300 + i * 10]); page.setRotation(degrees(90 + 90 * i)); page.drawText(`PAGE-${i}`) }
  return pdf.save()
}
function file(name, bytes, type = 'application/pdf') {
  let delayed = null
  return { name, size: bytes.length, type, arrayBuffer: () => delayed ? delayed.promise : Promise.resolve(Uint8Array.from(bytes).buffer),
    hold() { delayed = deferred(); return delayed }, release() { delayed?.resolve(Uint8Array.from(bytes).buffer); delayed = null } }
}
async function setup(tab = 'organize') {
  const urls = new Map(), downloads = [], revoked = [], focused = []
  let serial = 0
  class LocalURL extends URL {}
  LocalURL.createObjectURL = blob => { const url = `blob:pdf-${++serial}`; urls.set(url, blob); return url }
  LocalURL.revokeObjectURL = url => revoked.push(url)
  // pdf-lib uses instanceof Array; bridge VM arrays at this test-only module boundary.
  const bridge = doc => {
    const copy = doc.copyPages.bind(doc), add = doc.addPage.bind(doc)
    doc.copyPages = (source, indices) => copy(source, Array.isArray(indices) ? Array.from(indices) : indices)
    doc.addPage = page => add(Array.isArray(page) ? Array.from(page) : page)
    return doc
  }
  class RealmPdfDocument extends PDFDocument {
    static async create(...args) { return bridge(await PDFDocument.create(...args)) }
    static async load(...args) { return bridge(await PDFDocument.load(...args)) }
  }
  const h = await componentHarness('src/components/PdfTools.tsx', { props: {}, url: `https://toolhub.ai.kr/pdf-tools/?tab=${tab}`,
    modules: { 'pdf-lib': { ...pdfLib, PDFDocument: RealmPdfDocument }, jszip: require('jszip'), '@/components/GuideSection': { __esModule: true, default: () => null }, '@/utils/imageCompress': { formatBytes: value => String(value), uniqueNames: value => value } },
    globals: { URL: LocalURL, Uint8Array, ArrayBuffer, requestAnimationFrame: callback => { callback(); return 1 } },
    document: { getElementById: id => ({ focus() { focused.push(id) } }), body: { appendChild() {} }, createElement: () => ({ click() { downloads.push({ href: this.href, name: this.download }) }, remove() {} }) },
  })
  h.render()
  const panel = () => h.find(node => node.props.id === 'pdf-panel')
  const history = () => h.find(node => typeof node.type === 'function' && node.type.name === 'PdfHistoryControls')
  const drop = () => h.find(node => typeof node.type === 'function' && node.type.name === 'DropZone')
  const pages = () => h.all().filter(node => node.props['data-pdf-page'])
  const tabTo = name => { h.find(node => node.props.id === `pdf-tab-${name}`).props.onClick(); h.render() }
  async function settle(promise) {
    let done = false, error, value
    Promise.resolve(promise).then(result => { done = true; value = result }, reason => { done = true; error = reason })
    for (let i = 0; i < 160 && !done; i++) { h.tick(undefined); await nextTurn(); h.render() }
    assert.ok(done, 'parent operation settled'); if (error) throw error; return value
  }
  const clickId = id => { h.find(node => node.props.id === id).props.onClick(); h.render() }
  const rotate = page => { h.find(node => node.type === 'button' && node.props['aria-label'] === `a11y.pageRotateRight${JSON.stringify({ n: page })}`).props.onClick(); h.render() }
  const run = name => h.button(`${name}.button`).props.onClick()
  const load = async files => settle(drop().props.onFiles(files))
  return { h, urls, downloads, revoked, focused, panel, history, drop, pages, tabTo, settle, clickId, rotate, run, load }
}
async function parsedDownload(f) { const latest = f.downloads.at(-1); assert.ok(latest); return PDFDocument.load(await f.urls.get(latest.href).arrayBuffer()) }
function pageContent(pdf, index) {
  const contents = pdf.getPage(index).node.Contents()
  const streams = contents instanceof PDFArray ? contents.asArray().map(ref => pdf.context.lookup(ref)) : [contents]
  return streams.map(stream => { assert.ok(stream instanceof PDFRawStream); return Buffer.from(decodePDFRawStream(stream).decode()).toString() }).join('\n').toLowerCase()
}
async function main() {
  const bytes = await source(); let groups = 0
  const check = async (name, run) => { await run(); groups++; console.log('PASS', name) }
  await check('actual parent history: cap, redo branch, reset, all-delete focus, editable and IME shortcuts', async () => {
    const f = await setup(); await f.load([file('original.pdf', bytes)])
    for (let i = 0; i < 35; i++) f.rotate(1)
    assert.equal(f.history().props.undoCount, 30)
    f.history().props.onUndo(); f.h.render(); assert.equal(f.history().props.redoCount, 1)
    f.rotate(2); assert.equal(f.history().props.redoCount, 0)
    f.clickId('pdf-org-reset'); assert.ok(f.pages().every(page => page.props['data-pdf-rotation'] === 0))
    f.history().props.onUndo(); f.h.render(); assert.ok(f.pages().some(page => page.props['data-pdf-rotation'] !== 0))
    let prevented = 0
    const event = { key: 'z', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, nativeEvent: { isComposing: false }, preventDefault() { prevented++ }, target: { closest: () => true } }
    const before = f.history().props.undoCount
    f.panel().props.onKeyDown(event); f.h.render(); assert.equal(f.history().props.undoCount, before)
    f.panel().props.onKeyDown({ ...event, target: { closest: () => false }, nativeEvent: { isComposing: true } }); assert.equal(prevented, 0)
    f.panel().props.onKeyDown({ ...event, target: { closest: () => false } }); f.h.render(); assert.equal(prevented, 1)
    for (const key of ['0', '1', '2']) f.clickId(`pdf-pg-del-${key}`)
    assert.equal(f.pages().length, 0); assert.equal(f.focused.at(-1), 'pdf-org-undo')
    f.history().props.onUndo(); f.h.render(); assert.equal(f.pages().length, 1); assert.equal(f.focused.at(-1), 'pdf-pg-del-2')
    f.h.cleanup()
  })
  await check('actual parent export: stable page content/order, original plus added rotation, edit clears completed result', async () => {
    const f = await setup(); await f.load([file('ordered.pdf', bytes)])
    f.clickId('pdf-pg-back-2'); f.clickId('pdf-pg-back-2'); f.rotate(3); f.rotate(3); f.clickId('pdf-pg-del-1')
    await f.settle(f.run('organize'))
    const pdf = await parsedDownload(f)
    assert.deepEqual(pdf.getPages().map(page => page.getSize().width), [220, 200])
    assert.deepEqual(pdf.getPages().map(page => page.getRotation().angle), [90, 90])
    for (const [i, text] of ['PAGE-2', 'PAGE-0'].entries()) assert.ok(pageContent(pdf, i).includes(Buffer.from(text).toString('hex')))
    const url = f.downloads[0].href; f.rotate(1)
    assert.ok(f.revoked.includes(url)); assert.equal(f.h.all().filter(node => node.type === 'a' && node.props.download).length, 0)
    f.h.cleanup()
  })
  await check('failed/new/late file reads preserve current edits and only latest successful document resets history', async () => {
    const f = await setup(); await f.load([file('kept.pdf', bytes)]); f.rotate(1)
    await f.load([file('broken.pdf', Buffer.from('invalid PDF'))])
    assert.equal(f.pages().length, 3); assert.equal(f.pages()[0].props['data-pdf-rotation'], 90); assert.equal(f.history().props.undoCount, 1)
    const slow = file('slow.pdf', bytes); slow.hold()
    const pending = f.drop().props.onFiles([slow]); f.h.tick(undefined); await nextTurn()
    await f.load([file('latest.pdf', bytes)]); slow.release(); await f.settle(pending)
    assert.ok(f.h.text().includes('latest.pdf')); assert.ok(!f.h.text().includes('slow.pdf')); assert.equal(f.history().props.undoCount, 0)
    const later = file('later.pdf', bytes); later.hold(); const loading = f.drop().props.onFiles([later]); f.h.tick(undefined); await nextTurn()
    f.rotate(2); later.release(); await f.settle(loading)
    assert.ok(f.h.text().includes('latest.pdf')); assert.equal(f.pages()[1].props['data-pdf-rotation'], 90)
    f.h.cleanup()
  })
  await check('all four tabs reject late export completion after tab change and retain prior tab inputs', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lV8AAAAASUVORK5CYII=', 'base64')
    for (const tab of ['organize', 'merge', 'split', 'imageToPdf']) {
      const f = await setup(tab), input = file(tab === 'imageToPdf' ? 'pixel.png' : 'held.pdf', tab === 'imageToPdf' ? png : bytes, tab === 'imageToPdf' ? 'image/png' : 'application/pdf')
      await f.load(tab === 'merge' ? [input, file('second.pdf', bytes)] : [input])
      if (tab === 'split') { f.h.find(node => node.props.id === 'pdf-range').props.onChange({ target: { value: '1-2' } }); f.h.render() }
      input.hold(); const operation = f.run(tab)
      for (let i = 0; i < 3; i++) { f.h.tick(undefined); await nextTurn() }
      f.tabTo(tab === 'merge' ? 'organize' : 'merge'); input.release(); await f.settle(operation)
      assert.equal(f.downloads.length, 0, tab); assert.equal(f.urls.size, tab === 'imageToPdf' ? 1 : 0, tab)
      assert.ok(!f.h.text().includes(`${tab}.success`), tab)
      f.tabTo(tab); assert.ok(f.h.text().includes(input.name), tab); f.h.cleanup()
    }
  })
  await check('merge, split and PNG-to-PDF still produce readable exports from the current inputs', async () => {
    const f = await setup('merge'); await f.load([file('first.pdf', bytes), file('second.pdf', bytes)])
    await f.settle(f.run('merge')); assert.equal((await parsedDownload(f)).getPageCount(), 6)
    f.tabTo('split'); await f.load([file('split.pdf', bytes)])
    f.h.find(node => node.props.id === 'pdf-range').props.onChange({ target: { value: '3,1' } }); f.h.render()
    await f.settle(f.run('split')); assert.equal(f.downloads.length, 2, f.h.text()); const split = await parsedDownload(f)
    assert.deepEqual(split.getPages().map(page => page.getSize().width), [220, 200])
    f.tabTo('imageToPdf')
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lV8AAAAASUVORK5CYII=', 'base64')
    await f.load([file('pixel.png', png, 'image/png')]); await f.settle(f.run('imageToPdf'))
    assert.equal(f.downloads.length, 3, f.h.text()); assert.equal((await parsedDownload(f)).getPageCount(), 1); f.h.cleanup()
  })
  await check('edit during delayed final save and unmount during read cannot publish output or stale errors', async () => {
    const f = await setup(), input = file('document.pdf', bytes); await f.load([input])
    const save = PDFDocument.prototype.save, gate = deferred(); let saving = false
    try {
      PDFDocument.prototype.save = async function(options) { const output = await save.call(this, options); saving = true; await gate.promise; return output }
      const exporting = f.run('organize')
      for (let i = 0; i < 60 && !saving; i++) { f.h.tick(undefined); await nextTurn() }
      assert.ok(saving); f.rotate(1); gate.resolve(); await f.settle(exporting)
      assert.equal(f.downloads.length, 0); assert.equal(f.urls.size, 0)
    } finally { PDFDocument.prototype.save = save; gate.resolve() }
    const late = file('late.pdf', bytes), pending = late.hold(), reading = f.drop().props.onFiles([late])
    f.h.tick(undefined); await nextTurn(); f.h.cleanup(); pending.reject(new Error('late read failure'))
    await reading; assert.equal(f.downloads.length, 0)
  })
  console.log(`PDF actual parent: ${groups} groups passed; no browser`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
