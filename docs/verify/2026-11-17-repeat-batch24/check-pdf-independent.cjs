/* eslint-disable @typescript-eslint/no-require-imports -- Independent Node oracle and controlled component runner. */
const assert = require('node:assert/strict')
const { PDFDocument, PDFArray, PDFRawStream, decodePDFRawStream, degrees } = require('pdf-lib')
const { PNG } = require('pngjs')
const { componentHarness } = require('../2026-11-17-repeat-batch19/component-harness.cjs')
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const originalCards = () => [0, 1, 2, 3].map(src => ({ key: `k${src}`, src, rot: 0, w: 200 + src * 20, h: 300 }))
async function makePdf(name = 'oracle.pdf') {
  const doc = await PDFDocument.create()
  for (let index = 0; index < 4; index++) { const page = doc.addPage([200 + 20 * index, 300]); page.setRotation(degrees(index * 90)); page.drawText(`ORACLE-${index}`) }
  return new File([await doc.save()], name, { type: 'application/pdf' })
}
function pageText(pdf, index) {
  const content = pdf.getPage(index).node.Contents()
  const streams = content instanceof PDFArray ? content.asArray().map(ref => pdf.context.lookup(ref)) : [content]
  return streams.map(stream => { assert.ok(stream instanceof PDFRawStream); return Buffer.from(decodePDFRawStream(stream).decode()).toString() }).join('\n').toLowerCase()
}
async function parentFixture() {
  const downloads = [], urls = new Map(), revoked = [], frames = [], focus = []
  let serial = 0, h
  class PortURL extends URL { static createObjectURL(blob) { const url = `blob:pdf-independent-${++serial}`; urls.set(url, blob); return url } static revokeObjectURL(url) { revoked.push(url) } }
  // Only bridge realm identity for pdf-lib's instanceof checks; PDF content work stays native to pdf-lib.
  const bridge = doc => {
    const copy = doc.copyPages.bind(doc), add = doc.addPage.bind(doc)
    doc.copyPages = (source, indices) => copy(source, Array.from(indices))
    doc.addPage = page => add(Array.isArray(page) ? Array.from(page) : page)
    return doc
  }
  class RealmDocument extends PDFDocument {
    static async create(...args) { return bridge(await PDFDocument.create(...args)) }
    static async load(...args) { return bridge(await PDFDocument.load(...args)) }
  }
  h = await componentHarness('src/components/PdfTools.tsx', { props: {}, globals: { URL: PortURL, Uint8Array, ArrayBuffer, requestAnimationFrame: callback => { frames.push(callback); return frames.length } }, modules: { 'pdf-lib': { ...require('pdf-lib'), PDFDocument: RealmDocument }, '@/components/GuideSection': { __esModule: true, default: 'GuideSection' } }, document: {
    body: { appendChild() {} }, createElement() { return { click() { downloads.push({ href: this.href, name: this.download }) }, remove() {} } },
    getElementById(id) {
      const node = h.all().find(element => element.props.id === id)
      const controls = h.all().find(element => typeof element.type === 'function' && element.type.name === 'PdfHistoryControls')
      const available = node ? !node.props.disabled : id === 'pdf-org-undo' ? controls?.props.undoCount > 0 : id === 'pdf-org-redo' && controls?.props.redoCount > 0
      return available ? { focus() { focus.push(id) } } : null
    },
  } })
  h.render()
  const settle = async () => { for (let i = 0; i < 12; i++) { h.tick(undefined); await new Promise(setImmediate); h.render() } }
  return { h, downloads, urls, revoked, focus, settle,
    async tab(id) { h.find(node => node.props.id === `pdf-tab-${id}`).props.onClick(); await settle() },
    async load(...files) { const node = h.find(node => typeof node.type === 'function' && node.type.name === 'DropZone'); const pending = node.props.onFiles(files); await settle(); return pending },
    async click(label) { const node = h.button(label); const pending = node.props.onClick(); await settle(); return pending },
    cards() { return h.all().filter(node => Object.hasOwn(node.props, 'data-pdf-page')).map(node => ({ page: node.props['data-pdf-page'], rotation: node.props['data-pdf-rotation'] })) },
    controls() { return h.find(node => typeof node.type === 'function' && node.type.name === 'PdfHistoryControls').props },
    frames() { frames.splice(0).forEach(callback => callback()) }, cleanup() { h.cleanup() },
  }
}
async function main() {
  const history = await import('../../../src/utils/pdfEditHistory.ts')
  const { createOrganizedPdf, snapshotPdfOrganize } = await import('../../../src/utils/pdfOrganizeExport.ts')
  let groups = 0
  const check = async (name, run) => { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log('PASS', name) }
  await check('independent timeline oracle matches 600 mixed edits/undo/redo and a total of at most 30 transitions', () => {
    let value = history.createPdfPageHistory(originalCards()), states = [originalCards()], cursor = 0, seed = 927
    const rand = n => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % n }
    for (let step = 0; step < 600; step++) {
      const action = rand(7), current = states[cursor], from = rand(Math.max(1, current.length)), to = rand(Math.max(1, current.length))
      if (action === 0) { value = history.undoPdfPageEdit(value); if (cursor) cursor-- }
      else if (action === 1) { value = history.redoPdfPageEdit(value); if (cursor + 1 < states.length) cursor++ }
      else {
        let next = current.map(card => ({ ...card })), edit
        if (action === 2) { edit = { kind: 'move', from, to }; if (next.length) { const moved = next.splice(from, 1)[0]; next.splice(to, 0, moved) } }
        if (action === 3) { edit = { kind: 'remove', index: from }; next = next.filter((_card, index) => index !== from) }
        if (action === 4) { edit = { kind: 'reset' }; next = originalCards() }
        if (action === 5 || action === 6) {
          const quarter = rand(6) - 2, rotation = quarter * 90
          edit = action === 5 ? { kind: 'rotate', index: from, degrees: rotation } : { kind: 'rotateAll', degrees: rotation }
          next.forEach((card, index) => { if (action === 6 || index === from) card.rot = ((card.rot / 90 + quarter + 8) % 4) * 90 })
        }
        value = history.editPdfPages(value, edit)
        if (JSON.stringify(next) !== JSON.stringify(current)) { states = [...states.slice(0, cursor + 1), next]; if (states.length > 31) states.shift(); cursor = states.length - 1 }
      }
      assert.deepEqual(value.present, states[cursor], `step ${step}`)
      assert.equal(value.past.length, cursor); assert.equal(value.future.length, states.length - cursor - 1)
      assert.ok(value.past.length + value.future.length <= 30); assert.deepEqual(value.initial, originalCards())
    }
  })
  await check('actual PDF content oracle covers every original/additional quarter-turn and reordered page identity', async () => {
    const file = await makePdf()
    for (let extra = 0; extra < 4; extra++) {
      const order = [3, 0, 2, 1], cards = order.map(src => ({ ...originalCards()[src], rot: extra * 90 }))
      const bytes = await createOrganizedPdf(snapshotPdfOrganize(file, cards)), output = await PDFDocument.load(bytes)
      assert.equal(output.getPageCount(), 4)
      order.forEach((src, index) => { assert.equal(output.getPage(index).getRotation().angle, ((src + extra) % 4) * 90); assert.equal(output.getPage(index).getWidth(), 200 + src * 20); assert.ok(pageText(output, index).includes(Buffer.from(`ORACLE-${src}`).toString('hex').toLowerCase())) })
    }
  })
  await check('history focus/shortcut choices exclude native editing and composition, while total deletion restores exact card', () => {
    let value = history.createPdfPageHistory(originalCards())
    for (let i = 0; i < 4; i++) value = history.editPdfPages(value, { kind: 'remove', index: 0 })
    assert.equal(history.pdfPageFocusKey(originalCards(), value.present), null)
    const before = value.present; value = history.undoPdfPageEdit(value); assert.equal(history.pdfPageFocusKey(before, value.present), 'k3')
    const event = { key: 'Z', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false }
    for (const extra of [{ editable: true }, { isComposing: true }, { altKey: true }]) assert.equal(history.pdfHistoryShortcut({ ...event, ...extra }), null)
    assert.equal(history.pdfHistoryShortcut(event), 'undo'); assert.equal(history.pdfHistoryShortcut({ ...event, shiftKey: true }), 'redo')
  })
  await check('actual parent keeps document and all edits after failed replacement and ignores an older reversed file read', async () => {
    const f = await parentFixture(), file = await makePdf()
    try {
      await f.tab('organize'); await f.load(file)
      f.h.find(node => node.props['aria-label'] === 'a11y.pageRotateRight{"n":1}').props.onClick(); f.h.render()
      f.h.find(node => node.props.id === 'pdf-pg-del-1').props.onClick(); f.h.render()
      const cards = f.cards(), count = f.controls().undoCount
      await f.load(new File(['not a PDF'], 'bad.pdf', { type: 'application/pdf' }))
      assert.deepEqual(f.cards(), cards); assert.equal(f.controls().undoCount, count)
      const pending = deferred(), slow = new File([], 'slow.pdf', { type: 'application/pdf' }); slow.arrayBuffer = () => pending.promise
      const zone = () => f.h.find(node => typeof node.type === 'function' && node.type.name === 'DropZone')
      const old = zone().props.onFiles([slow]); await f.settle()
      await f.load(await makePdf('fresh.pdf')); const fresh = f.cards(); assert.equal(f.controls().undoCount, 0)
      pending.resolve(await file.arrayBuffer()); await old; await f.settle(); assert.deepEqual(f.cards(), fresh); assert.ok(f.h.text().includes('fresh.pdf')); assert.equal(f.downloads.length, 0)
    } finally { f.cleanup() }
  })
  await check('actual parent deletion/undo/redo keeps a usable focus and Ctrl+Z does not affect an input', async () => {
    const f = await parentFixture()
    try {
      await f.tab('organize'); await f.load(await makePdf())
      for (let index = 0; index < 4; index++) { f.h.find(node => node.props.id === `pdf-pg-del-${index}`).props.onClick(); f.h.render(); f.frames() }
      assert.equal(f.cards().length, 0); assert.equal(f.focus.at(-1), 'pdf-org-undo')
      f.controls().onUndo(); f.h.render(); f.frames(); assert.equal(f.focus.at(-1), 'pdf-pg-del-3')
      const event = { key: 'z', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, nativeEvent: { isComposing: false }, target: { closest: () => ({}) }, preventDefault() { throw new Error('native undo was intercepted') } }
      f.h.find(node => node.props.id === 'pdf-panel').props.onKeyDown(event); assert.equal(f.cards().length, 1)
      f.controls().onRedo(); f.h.render(); f.frames(); assert.equal(f.cards().length, 0); assert.equal(f.focus.at(-1), 'pdf-org-undo')
    } finally { f.cleanup() }
  })
  for (const tab of ['merge', 'split', 'organize', 'imageToPdf']) await check(`actual ${tab} export save finishes after tab change without download or input loss`, async () => {
    const f = await parentFixture(), file = await makePdf(), saved = PDFDocument.prototype.save, gate = deferred()
    let held = false, bytes
    try {
      await f.tab(tab)
      if (tab === 'imageToPdf') { const png = new PNG({ width: 2, height: 2 }); png.data.fill(255); await f.load(new File([PNG.sync.write(png)], 'pixels.png', { type: 'image/png' })) }
      else await f.load(file, ...(tab === 'merge' ? [await makePdf('second.pdf')] : []))
      if (tab === 'split') { f.h.find(node => node.props.id === 'pdf-range').props.onChange({ target: { value: '1-2' } }); f.h.render() }
      PDFDocument.prototype.save = async function(options) { const output = await saved.call(this, options); held = true; bytes = output; return gate.promise }
      const pending = f.h.button(`${tab}.button`).props.onClick(); await f.settle(); assert.equal(held, true, f.h.text())
      await f.tab(tab === 'merge' ? 'organize' : 'merge'); gate.resolve(bytes); await pending; await f.settle()
      assert.equal(f.downloads.length, 0); assert.ok(f.h.all().filter(node => node.props.role === 'alert').every(node => !node.props.children))
      await f.tab(tab); assert.ok(f.h.text().includes(tab === 'imageToPdf' ? 'pixels.png' : 'oracle.pdf'))
      if (tab === 'split') assert.equal(f.h.find(node => node.props.id === 'pdf-range').props.value, '1-2')
    } finally { PDFDocument.prototype.save = saved; f.cleanup() }
  })
  console.log(`PDF independent: ${groups} groups passed; actual PDF bytes, controlled parent DOM/download ports`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
