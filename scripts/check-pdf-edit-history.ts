import assert from 'node:assert/strict'
import { PDFArray, PDFDocument, PDFRawStream, decodePDFRawStream, degrees } from 'pdf-lib'
import {
  PDF_EDIT_HISTORY_LIMIT, createPdfPageHistory, commitPdfPageCards, editPdfPages, undoPdfPageEdit, redoPdfPageEdit,
  pdfPageFocusKey, pdfHistoryShortcut,
} from '../src/utils/pdfEditHistory.ts'
import { createPdfTaskGuard, snapshotPdfItems } from '../src/utils/pdfTaskGuard.ts'
import { createOrganizedPdf, snapshotPdfOrganize } from '../src/utils/pdfOrganizeExport.ts'

const cards = () => [0, 1, 2].map(src => ({ key: `page-${src}`, src, rot: 0, w: 200 + src * 10, h: 300 }))
let groups = 0
async function check(name: string, run: () => void | Promise<void>) { await run(); groups++; console.log(`PASS ${name}`) }
const encode = (text: string) => Buffer.from(text).toString('hex')
async function sourcePdf() {
  const pdf = await PDFDocument.create()
  for (let index = 0; index < 3; index++) {
    const page = pdf.addPage([200 + index * 10, 300]); page.setRotation(degrees(90 * (index + 1))); page.drawText(`PAGE-${index}`, { x: 20, y: 100, size: 12 })
  }
  const bytes = await pdf.save()
  return { bytes, file: { async arrayBuffer() { return Uint8Array.from(bytes).buffer } } }
}

await check('Move, rotate and delete undo/redo preserve stable keys and original page metadata', () => {
  const original = cards(); let history = createPdfPageHistory(original)
  history = editPdfPages(history, { kind: 'move', from: 0, to: 2 })
  history = editPdfPages(history, { kind: 'rotate', index: 0, degrees: 90 })
  history = editPdfPages(history, { kind: 'remove', index: 1 })
  const final = history.present
  assert.deepEqual(final.map(card => [card.src, card.rot]), [[1, 90], [0, 0]])
  const undone = undoPdfPageEdit(history)
  assert.equal(pdfPageFocusKey(history.present, undone.present), 'page-2')
  history = undoPdfPageEdit(undoPdfPageEdit(undone)); assert.deepEqual(history.present, original)
  history = redoPdfPageEdit(redoPdfPageEdit(redoPdfPageEdit(history))); assert.deepEqual(history.present, final)
  assert.deepEqual(original, cards())
})
await check('No-op edits create no history and do not discard an existing redo branch', () => {
  let history = createPdfPageHistory(cards())
  history = undoPdfPageEdit(editPdfPages(history, { kind: 'remove', index: 1 }))
  for (const action of [
    { kind: 'move' as const, from: 0, to: 0 }, { kind: 'move' as const, from: -1, to: 2 },
    { kind: 'remove' as const, index: 4 }, { kind: 'rotate' as const, index: 0, degrees: 360 },
    { kind: 'rotateAll' as const, degrees: 0 }, { kind: 'rotateAll' as const, degrees: NaN },
    { kind: 'reset' as const },
  ]) assert.equal(editPdfPages(history, action), history)
  assert.equal(commitPdfPageCards(history, cards()), history)
  assert.equal(history.future.length, 1)
  assert.equal(editPdfPages(history, { kind: 'rotate', index: 0, degrees: -90 }).future.length, 0)
})
await check('Thirty transitions are retained, and the original reset baseline survives the history cap', () => {
  let history = createPdfPageHistory(cards())
  for (let index = 0; index < 35; index++) history = editPdfPages(history, { kind: 'rotate', index: 0, degrees: 90 })
  assert.equal(history.past.length, PDF_EDIT_HISTORY_LIMIT)
  const last = history.present
  for (let index = 0; index < 30; index++) history = undoPdfPageEdit(history)
  assert.equal(history.present[0].rot, 90); assert.equal(history.past.length, 0); assert.equal(history.future.length, 30)
  assert.equal(undoPdfPageEdit(history), history)
  for (let index = 0; index < 30; index++) history = redoPdfPageEdit(history)
  assert.deepEqual(history.present, last)
  const reset = editPdfPages(history, { kind: 'reset' })
  assert.deepEqual(reset.present, cards()); assert.deepEqual(undoPdfPageEdit(reset).present, last)
})
await check('All-delete is undoable, resets are edits, and focus never points to a removed page', () => {
  let history = createPdfPageHistory(cards())
  while (history.present.length) history = editPdfPages(history, { kind: 'remove', index: 0 })
  assert.equal(pdfPageFocusKey(cards(), history.present), null)
  history = undoPdfPageEdit(history); assert.equal(history.present[0].key, 'page-2')
  const reset = editPdfPages(history, { kind: 'reset' })
  assert.deepEqual(reset.present, cards()); assert.deepEqual(undoPdfPageEdit(reset).present, history.present)
  assert.equal(pdfPageFocusKey(history.present, reset.present, 'page-2'), 'page-2')
  assert.equal(pdfPageFocusKey(cards(), [cards()[2]], 'page-0'), 'page-2')
})
await check('History copies only metadata; file references and original bytes stay outside snapshots', () => {
  let reads = 0
  const file = { arrayBuffer() { reads++; throw Error('unexpected byte read') } }
  const input = cards().map(card => ({ ...card, file, bytes: new Uint8Array([1, 2, 3]) }))
  const history = createPdfPageHistory(input)
  assert.deepEqual(Object.keys(history.present[0]).sort(), ['h', 'key', 'rot', 'src', 'w'])
  input[0].rot = 180; assert.equal(history.present[0].rot, 0); assert.equal(history.initial[0].rot, 0)
  const list = [{ id: 'file-one', file }], snapshot = snapshotPdfItems(list)
  list[0].id = 'edited'; assert.equal(snapshot[0].id, 'file-one'); assert.equal(snapshot[0].file, file)
  const job = snapshotPdfOrganize(file, history.present); assert.equal(job.file, file); assert.equal(reads, 0)
  const replacement = createPdfPageHistory([{ key: 'new-document', src: 0, rot: 0, w: 400, h: 500 }])
  assert.equal(replacement.past.length, 0); assert.equal(replacement.future.length, 0); assert.equal(history.present.length, 3)
})
await check('History keyboard shortcuts leave editable fields, IME and unrelated modifiers alone', () => {
  const base = { key: 'z', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }
  assert.equal(pdfHistoryShortcut(base), 'undo'); assert.equal(pdfHistoryShortcut({ ...base, shiftKey: true }), 'redo')
  assert.equal(pdfHistoryShortcut({ ...base, key: 'y' }), 'redo')
  assert.equal(pdfHistoryShortcut({ ...base, ctrlKey: false, metaKey: true }), 'undo')
  for (const extra of [{ editable: true }, { isComposing: true }, { altKey: true }, { ctrlKey: false }, { key: 'ArrowLeft' }]) assert.equal(pdfHistoryShortcut({ ...base, ...extra }), null)
})
await check('One task generation invalidates reads and exports across tabs, edits, new operations and unmount', () => {
  const guard = createPdfTaskGuard()
  for (const boundary of ['merge', 'split', 'organize', 'imageToPdf', 'edit', 'unmount']) {
    const old = guard.begin(); guard.invalidate(); assert.equal(guard.isCurrent(old), false, boundary)
    const next = guard.begin(); assert.equal(guard.isCurrent(next), true); assert.equal(guard.isCurrent(old), false)
  }
})
await check('Actual exported PDF preserves clicked order/content and adds original plus additional rotation', async () => {
  const source = await sourcePdf()
  const selection = [ { ...cards()[2], rot: 180 }, { ...cards()[0], rot: 270 } ]
  const snapshot = snapshotPdfOrganize(source.file, selection)
  const operation = createOrganizedPdf(snapshot)
  selection.reverse(); snapshot.cards.reverse()
  const bytes = await operation; assert.ok(bytes)
  const pdf = await PDFDocument.load(bytes)
  assert.equal(pdf.getPageCount(), 2)
  assert.deepEqual(pdf.getPages().map(page => page.getSize().width), [220, 200])
  assert.deepEqual(pdf.getPages().map(page => page.getRotation().angle), [90, 0])
  for (const [index, expected] of ['PAGE-2', 'PAGE-0'].entries()) {
    const contents = pdf.getPage(index).node.Contents()
    const streams = contents instanceof PDFArray ? contents.asArray().map(ref => pdf.context.lookup(ref)) : [contents]
    const decoded = streams.map(stream => { assert.ok(stream instanceof PDFRawStream); return Buffer.from(decodePDFRawStream(stream).decode()).toString() }).join('\n')
    assert.ok(decoded.toLowerCase().includes(encode(expected)), `content ${index}`)
  }
})
await check('Empty or invalid page selections fail without silently inventing or dropping pages', async () => {
  const source = await sourcePdf()
  await assert.rejects(createOrganizedPdf(snapshotPdfOrganize(source.file, [])), /emptyPages/)
  for (const card of [{ ...cards()[0], src: 3 }, { ...cards()[0], rot: 45 }]) await assert.rejects(createOrganizedPdf(snapshotPdfOrganize(source.file, [card])), /invalidPage/)
})
await check('Superseded file reads and saved bytes return no output for a stale caller', async () => {
  const source = await sourcePdf(), guard = createPdfTaskGuard()
  let finish!: (value: ArrayBuffer) => void
  const delayed = { arrayBuffer: () => new Promise<ArrayBuffer>(resolve => { finish = resolve }) }
  const token = guard.begin(), pending = createOrganizedPdf(snapshotPdfOrganize(delayed, cards()), () => guard.isCurrent(token))
  guard.invalidate(); finish(Uint8Array.from(source.bytes).buffer); assert.equal(await pending, null)
  let reads = 0
  assert.equal(await createOrganizedPdf(snapshotPdfOrganize({ async arrayBuffer() { reads++; return Uint8Array.from(source.bytes).buffer } }, cards()), () => false), null)
  assert.equal(reads, 0)
  const save = PDFDocument.prototype.save
  try {
    PDFDocument.prototype.save = async function(options) { const bytes = await save.call(this, options); guard.invalidate(); return bytes }
    const latest = guard.begin()
    assert.equal(await createOrganizedPdf(snapshotPdfOrganize(source.file, cards()), () => guard.isCurrent(latest)), null)
  } finally { PDFDocument.prototype.save = save }
})
console.log(`${groups} PDF history/export preparation groups passed`)
