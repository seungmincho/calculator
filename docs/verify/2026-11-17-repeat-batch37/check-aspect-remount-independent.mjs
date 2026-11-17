import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createAspectImageAdapter } from '../../../src/lib/aspectRatioImage/browser.ts'
import { imagePorts, sourceFile, deferred, flush, settings } from './check-aspect-independent.mjs'

// A real adapter is disposed while its controlled native callback remains outstanding.
// A second adapter models leaving/revisiting the tool without a document reload.
const first = imagePorts(), second = imagePorts(), pending = deferred()
let active = 0, maximum = 0
first.ports.encode = async (_canvas, mime) => { active++; maximum = Math.max(maximum, active); await pending.promise; active--; return new Blob(['A'], { type: mime }) }
second.ports.encode = async (_canvas, mime) => { active++; maximum = Math.max(maximum, active); active--; return new Blob(['B'], { type: mime }) }
const old = createAspectImageAdapter(first.ports), a = await old.loadSource(sourceFile('old.png'), () => true)
const oldResult = old.export(a, settings(), () => true).catch(error => error.code)
await flush(); old.dispose()
const fresh = createAspectImageAdapter(second.ports)
let currentFinished = false
const next = fresh.loadSource(sourceFile('new.png'), () => true).then(source => fresh.export(source, settings(), () => true)).then(result => { currentFinished = true; return result })
await flush(); await flush()
const whileOldPending = { reads: second.reads.length, decoded: second.decodes.length, currentFinished, maximum, active }
pending.resolve(); assert.equal(await oldResult, 'canceled'); const result = await next
assert.equal(result.blob.type, 'image/png'); fresh.dispose()
const observed = { whileOldPending, maximum, oldCanvasReleased: first.canvases.every(canvas => canvas.width === 0 && canvas.height === 0), oldSourceClosed: first.closes.length, newSourceClosed: second.closes.length }
if (process.argv.includes('--reproduce')) {
  fs.writeFileSync('docs/verify/2026-11-17-repeat-batch37/remount-before-fix.json', JSON.stringify(observed, null, 2) + '\n'); console.log(JSON.stringify(observed, null, 2))
} else {
  assert.equal(whileOldPending.reads, 0); assert.equal(whileOldPending.decoded, 0); assert.equal(whileOldPending.currentFinished, false); assert.equal(maximum, 1)
  assert.equal(observed.oldCanvasReleased, true); assert.equal(observed.oldSourceClosed, 1); assert.equal(observed.newSourceClosed, 1)
  console.log('PASS remounted adapter waits for disposed adapter native finally; maximum active encode 1')
}
