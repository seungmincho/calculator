import assert from 'node:assert/strict'
import fs from 'node:fs'

const authorUrl = new URL('../../../scripts/check-image-watermark-components.mjs', import.meta.url)
const source = fs.readFileSync(authorUrl, 'utf8')
assert.ok(source.includes('let groups = 0'))
const prefix = source.slice(0, source.indexOf('let groups = 0'))
  .replace('createRequire(import.meta.url)', `createRequire(${JSON.stringify(authorUrl.href)})`)
  .replace(/from '(\.\.\/src\/[^']+)'/g, (_all, path) => `from ${JSON.stringify(new URL(path, authorUrl).href)}`)
const { fixture, image, defer } = await import(`data:text/javascript;base64,${Buffer.from(prefix + '\nexport { fixture, image, defer };').toString('base64')}`)
let groups = 0
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log('PASS', name) }

await check('Parent paused retry acts only on failed rows, then explicit Make all continues pending photos', async () => {
  const f = await fixture(), held = defer(); let calls = 0
  f.add([image('a.png'), image('b.png'), image('c.png')]); await f.settle()
  f.png(async () => { calls++; if (calls === 1) throw new Error('a encoder failed'); if (calls === 2) return held.promise; return new Blob(['current'], { type: 'image/png' }) })
  f.click('data-watermark-action', 'start'); await f.settle(); assert.deepEqual(f.statuses(), ['error', 'processing', 'pending'])
  f.click('data-watermark-action', 'pause'); held.resolve(new Blob(['obsolete b'], { type: 'image/png' })); await f.settle()
  assert.deepEqual(f.statuses(), ['error', 'pending', 'pending'])
  f.click('data-watermark-action', 'retry'); await f.settle(); assert.deepEqual(f.statuses(), ['done', 'pending', 'pending']); assert.equal(calls, 3)
  f.click('data-watermark-action', 'start'); await f.settle(); assert.deepEqual(f.statuses(), ['done', 'done', 'done']); assert.equal(calls, 5)
  f.h.cleanup()
})

await check('Parent setting round trip never revalidates an old PNG; current output needs a new explicit request', async () => {
  const f = await fixture(), held = defer(); f.add([image('roundtrip.png')]); f.change('data-watermark-text', 'Original setting'); await f.settle()
  f.png(() => held.promise); f.click('data-watermark-action', 'start'); await f.settle()
  f.change('data-watermark-text', 'Other setting'); f.change('data-watermark-text', 'Original setting'); await f.settle()
  assert.equal(f.encoded.length, 1); assert.equal(f.by('data-watermark-action', 'start').props.disabled, true)
  held.resolve(new Blob(['old exact-key result'], { type: 'image/png' })); await f.settle()
  assert.deepEqual(f.statuses(), ['pending']); assert.equal(f.by('data-watermark-action', 'zip').props.disabled, true); assert.equal(f.saved.length, 0)
  f.png(async () => new Blob(['new exact-key result'], { type: 'image/png' })); f.click('data-watermark-action', 'start'); await f.settle()
  f.click('data-watermark-png', f.id(0)); assert.equal(await f.saved[0].blob.text(), 'new exact-key result'); f.h.cleanup()
})

await check('Parent ZIP selection and Blob snapshot survive subsequent row deletion, while settings invalidate late download', async () => {
  const f = await fixture(); f.add([image('A.png'), image('A.png'), image('C.png')]); await f.settle(); f.click('data-watermark-action', 'start'); await f.settle()
  const ids = [f.id(0), f.id(1), f.id(2)], held = defer(); f.change('data-watermark-select', false, ids[2]); f.zip(() => held.promise)
  f.click('data-watermark-action', 'zip'); await f.settle(); assert.equal(f.zipEntries[0].length, 2)
  const captured = f.zipEntries[0], contents = await Promise.all(captured.map(entry => entry.blob.text()))
  f.click('data-watermark-remove', ids[0]); f.click('data-watermark-action', 'deselect'); await f.settle()
  assert.equal(f.rows().length, 2); assert.equal(f.by('data-watermark-action', 'zip').props.disabled, true)
  assert.deepEqual(await Promise.all(captured.map(entry => entry.blob.text())), contents)
  held.resolve(new Blob(['captured zip'], { type: 'application/zip' })); await f.settle(); assert.equal(f.saved.length, 1)
  f.click('data-watermark-action', 'select-completed'); const old = defer(); f.zip(() => old.promise); f.click('data-watermark-action', 'zip'); await f.settle()
  f.change('data-watermark-option', 25, 'opacity'); old.resolve(new Blob(['stale zip'])); await f.settle(); assert.equal(f.saved.length, 1)
  assert.deepEqual(f.statuses(), ['pending', 'pending']); f.h.cleanup()
})

await check('Parent logo replacement ordering keeps the previous valid logo when the latest selection fails', async () => {
  const f = await fixture(); f.click('data-watermark-type', 'image'); const original = image('original.png', 30, 10)
  f.logo(original); f.add([image('photo.png')]); await f.settle(); const held = defer(), late = image('old-request.png', 80, 20)
  f.read(file => file === late ? held.promise : file.arrayBuffer()); f.logo(late); await f.settle()
  f.logo(new File(['not an image'], 'newest-invalid.png')); await f.settle(); assert.equal(f.by('data-watermark-action', 'start').props.disabled, true)
  held.resolve(await late.arrayBuffer()); await f.settle()
  assert.ok(f.h.text().includes('original.png')); assert.equal(f.decoded.includes('old-request.png'), false)
  assert.equal(f.by('data-watermark-action', 'start').props.disabled, false)
  f.click('data-watermark-action', 'start'); await f.settle()
  assert.equal(f.encoded[0].commands.filter(command => command[0] === 'image').at(-1)[1], 'original.png')
  f.change('data-watermark-option', 35, 'watermarkSize'); f.click('data-watermark-action', 'clear'); assert.equal(f.by('data-watermark-option', 'watermarkSize').props.value, 35)
  assert.ok(f.h.text().includes('original.png')); f.click('data-watermark-action', 'reset'); assert.equal(f.h.all().some(n => Object.hasOwn(n.props, 'data-watermark-logo-name')), false)
  f.h.cleanup()
})

await check('Parent preview source replacement does not decode a stale header or restore a removed row', async () => {
  const f = await fixture(), held = defer(), first = image('slow.png', 100, 10), latest = image('latest.png', 20, 40)
  f.read(file => file === first ? held.promise : file.arrayBuffer()); f.add([first, latest]); await f.settle()
  const oldId = f.id(0), newId = f.id(1); f.click('data-watermark-select-preview', newId); f.click('data-watermark-remove', oldId)
  held.resolve(await first.arrayBuffer()); await f.settle()
  assert.equal(f.rows().length, 1); assert.equal(f.id(0), newId); assert.equal(f.decoded.includes('slow.png'), false)
  const preview = f.by('data-watermark-preview'); assert.equal(preview.props.width, 20); assert.equal(preview.props.height, 40); assert.equal(f.encoded.length, 0)
  f.h.cleanup(); assert.ok(f.canvases.every(canvas => canvas.width === 0))
})

await check('Parent unmount cancels held ZIP download and releases current results, preserving source URL/storage', async () => {
  const f = await fixture(); f.add([image('source.png')]); await f.settle(); f.click('data-watermark-action', 'start'); await f.settle()
  const originalUrl = f.h.window.location.href, originalStorage = [...f.h.stored], held = defer()
  f.zip(() => held.promise); f.click('data-watermark-action', 'zip'); await f.settle(); f.h.cleanup()
  held.resolve(new Blob(['late zip'])); await f.settle(); assert.equal(f.saved.length, 0)
  assert.equal(new Set(f.revoked).size, f.revoked.length); assert.equal(f.revoked.length, f.urls.size)
  assert.equal(f.h.window.location.href, originalUrl); assert.deepEqual([...f.h.stored], originalStorage)
})

console.log(`Watermark actual-parent independent review: ${groups} groups passed; controlled host ports, native pixels/download UI separate.`)
