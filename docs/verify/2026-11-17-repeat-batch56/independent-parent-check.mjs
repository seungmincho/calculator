import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { conversionFixture, by } from './image-converter-parent-harness.mjs'

// Controlled ports only are reused. These transition/byte expectations are independent of author assertions.
const protect = ['src/utils/imageConvert.ts', 'src/utils/imageCompress.ts', 'docs/verify/2026-11-17-repeat-batch56/before-fix.json', 'docs/verify/2026-11-17-repeat-batch56/probe-image-converter-baseline.mjs']
const hashes = () => Object.fromEntries(protect.map(path => [path, createHash('sha256').update(fs.readFileSync(path)).digest('hex')]))
const original = hashes(), subset = process.argv[2]
const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)]
const attrs = (f, name) => f.parent.all().filter(node => Object.hasOwn(node.props ?? {}, name))
const rows = f => attrs(f, 'data-conversion-row')
const rowName = row => all(row).find(node => node.props?.title)?.props.title
const action = (f, value) => f.click('data-conversion-action', value)
const format = (f, value) => f.click('data-conversion-format', value)
const phase = f => by(f.parent, 'data-conversion-controls').props['data-conversion-phase']
async function ready(options) { const f = await conversionFixture(options); await f.start(); await f.tick(); return f }
async function completeAll(f) { let index = 0; while (index < f.calls.length) { await f.settle(index++); if (index > 30) throw Error('unbounded conversion') } }
let groups = 0
async function check(name, run) { if (subset && !name.includes(subset)) return; await run(); groups++; console.log('PASS ' + name) }

await check('pause keeps the actual current promise slot through settings changes, then resumes files in order', async () => {
  const f = await ready()
  try {
    const files = ['a.png', 'b.png', 'c.png'].map(name => f.makeFile(name))
    await f.add(files); assert.equal(f.calls.length, 1); assert.equal(f.calls[0].file, files[0])
    await action(f, 'pause'); assert.equal(phase(f), 'finishing')
    await format(f, 'png'); await f.add(['d.png']); await f.tick()
    assert.equal(f.calls.length, 1); assert.equal(attrs(f, 'data-conversion-download-all').length, 0)
    await f.settle(0); assert.equal(f.calls.length, 1); assert.equal(phase(f), 'paused')
    assert.equal(attrs(f, 'data-conversion-success').length, 0); assert.equal(f.urls.size, 0)
    await action(f, 'resume'); assert.equal(f.calls.length, 2)
    for (let i = 1; i <= 4; i++) { assert.equal(f.calls[i].options.format, 'png'); await f.settle(i) }
    assert.deepEqual(f.calls.slice(1).map(call => call.file.name), ['a.png', 'b.png', 'c.png', 'd.png'])
    assert.equal(f.maximum, 1); assert.equal(phase(f), 'idle')
    assert.ok(rows(f).every(row => row.props['data-conversion-status'] === 'done'))
  } finally { f.close() }
})

await check('previous JPEG bytes and actual quality/background survive a new failure without joining current totals', async () => {
  const f = await ready()
  try {
    await f.add(['retained.png']); await f.settle(0)
    const initialUrl = f.parent.find(node => node.type === 'img').props.src, initialBlob = f.urls.get(initialUrl)
    const initialButton = attrs(f, 'data-conversion-download')[0].props.onClick
    await f.setting('data-conversion-quality', 55)
    assert.equal(by(f.parent, 'data-conversion-controls').props['data-conversion-settling'], true)
    assert.equal(attrs(f, 'data-conversion-download-all').length, 0)
    assert.equal(attrs(f, 'data-conversion-success')[0].props['data-conversion-success'], 'previous')
    const label = attrs(f, 'data-conversion-download')[0].props['aria-label']
    assert.ok(label.includes('retained.jpg') && label.includes('85') && label.includes('#ffffff')); assert.equal(label.includes('55'), false)
    initialButton(); await f.sync(); assert.equal(f.downloads.at(-1).blob, initialBlob)
    await f.tick(); await f.settle(1, 'encode')
    assert.equal(f.parent.find(node => node.type === 'img').props.src, initialUrl); assert.equal(f.revoked.includes(initialUrl), false)
    assert.equal(rows(f)[0].props['data-conversion-status'], 'error'); assert.equal(attrs(f, 'data-conversion-download-all').length, 0)
    await f.click('data-conversion-download', rows(f)[0].props['data-conversion-row'])
    assert.equal(f.downloads.at(-1).name, 'retained.jpg'); assert.equal(await f.downloads.at(-1).blob.text(), 'converted:retained.png:jpeg:85:#ffffff')
    await f.setting('data-conversion-bg', '#123456'); await f.tick(); await f.settle(2)
    assert.equal(f.revoked.filter(url => url === initialUrl).length, 1)
    const count = f.downloads.length; initialButton(); await f.sync(); assert.equal(f.downloads.length, count)
    assert.equal(attrs(f, 'data-conversion-success')[0].props['data-conversion-success'], 'current')
    assert.ok(attrs(f, 'data-conversion-download')[0].props['aria-label'].includes('#123456'))
  } finally { f.close() }
})

await check('retry selects only current errors, paused state survives, and ABA never promotes an older attempt', async () => {
  const f = await ready()
  try {
    await f.add(['failed.png', 'good.png']); await f.settle(0, 'decode'); await f.settle(1)
    await f.add(['added.png']); assert.equal(f.calls[2].file.name, 'added.png')
    await action(f, 'pause'); await f.settle(2)
    await action(f, 'retry'); assert.equal(f.calls.length, 3); assert.equal(phase(f), 'paused')
    assert.deepEqual(rows(f).map(row => row.props['data-conversion-status']), ['pending', 'done', 'done'])
    await action(f, 'resume'); assert.equal(f.calls[3].file.name, 'failed.png')
    await f.setting('data-conversion-quality', 30)
    const oldTimer = f.timers.at(-1).callback
    await f.setting('data-conversion-quality', 85); oldTimer(); await f.sync(); assert.equal(f.calls.length, 4)
    await f.tick(); await f.settle(3, 'encode')
    assert.equal(f.calls.length, 5); assert.equal(f.calls[4].file.name, 'failed.png')
    assert.equal(rows(f)[0].props['data-conversion-status'], 'processing')
    assert.equal(attrs(f, 'data-conversion-success').filter(node => node.props['data-conversion-success'] === 'current').length, 0)
    await f.settle(4); await f.settle(5); await f.settle(6)
    assert.equal(f.calls.length, 7); assert.equal(f.maximum, 1)
  } finally { f.close() }
})

await check('header batches preserve independent input order but reset/unmount cancel all older read additions', async () => {
  const f = await ready()
  try {
    f.holdHeaders(true)
    await f.add(['first-a.png', 'first-b.png']); await f.add(['second.png'])
    assert.equal(f.reads.length, 3)
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer
    f.reads[2].resolve(png); await f.sync(); assert.deepEqual(rows(f).map(rowName), ['second.png'])
    f.reads[1].reject(Error('header unavailable')); f.reads[0].resolve(png); await f.sync()
    assert.deepEqual(rows(f).map(rowName), ['second.png', 'first-a.png', 'first-b.png'])
    assert.equal(attrs(f, 'data-conversion-reading').length, 0)
    await f.add(['late-before-reset.png']); const pending = f.reads.at(-1)
    await action(f, 'clear'); assert.equal(rows(f).length, 0)
    pending.resolve(png); await f.settle(0); assert.equal(rows(f).length, 0); assert.equal(f.calls.length, 1)
    await f.add(['fresh.png']); f.reads.at(-1).resolve(png); await f.sync(); assert.equal(f.calls.length, 2)
    assert.deepEqual(rows(f).map(rowName), ['fresh.png'])
    await f.add(['late-before-unmount.png']); const last = f.reads.at(-1)
    f.close(); last.resolve(png); await f.settle(1)
    assert.equal(f.calls.length, 2); assert.equal(f.urls.size, 0)
  } finally { f.close() }
})

await check('ZIP captures exact current Blob entries, survives row edits, and honors cancel/settings/reset/unmount owners', async () => {
  const f = await ready()
  try {
    await f.add(['same.png', 'same.png']); await completeAll(f)
    const originals = attrs(f, 'data-conversion-download').map((_, index) => f.urls.get(f.parent.all().filter(n => n.type === 'img')[index].props.src))
    await f.click('data-conversion-download-all')
    assert.deepEqual(f.archives[0].entries.map(entry => entry.name), ['same.jpg', 'same (2).jpg'])
    assert.deepEqual(f.archives[0].entries.map(entry => entry.blob), originals)
    const oldCancel = by(f.parent, 'data-conversion-action', 'cancelZip').props.onClick
    await f.click('data-conversion-remove', rows(f)[0].props['data-conversion-row']); await f.add(['new.png'])
    f.archives[0].resolve(new Blob(['first archive snapshot'])); await f.sync()
    assert.equal(await f.downloads.at(-1).blob.text(), 'first archive snapshot'); assert.equal(f.downloads.at(-1).name, 'images_jpg.zip')
    await f.settle(2); await f.click('data-conversion-download-all')
    oldCancel(); await f.sync(); assert.equal(by(f.parent, 'data-conversion-zip-state').props['data-conversion-zip-state'], 'working')
    f.archives[1].reject(Error('zip encode failed')); await f.sync()
    assert.equal(by(f.parent, 'data-conversion-zip-state').props['data-conversion-zip-state'], 'failed')
    await action(f, 'retryZip'); await action(f, 'cancelZip'); f.archives[2].resolve(new Blob(['canceled'])); await f.sync()
    assert.equal(f.downloads.length, 1)
    f.parent.tick(30000); assert.equal(f.urls.size, 2, 'preview URLs remain after temporary ZIP URL release')
  } finally { f.close() }
  for (const transition of ['settings', 'reset', 'unmount']) {
    const f = await ready()
    try {
      await f.add(['a.png', 'b.png']); await completeAll(f); await f.click('data-conversion-download-all')
      if (transition === 'settings') await format(f, 'png')
      else if (transition === 'reset') await action(f, 'clear')
      else f.close()
      f.archives[0].resolve(new Blob(['late ' + transition])); await f.sync()
      assert.equal(f.downloads.length, 0, transition)
    } finally { f.close() }
  }
})

await check('owned URL restoration and early intent preserve unknown query, hash, history and current files on write failure', async () => {
  const url = 'https://toolhub.ai.kr/image-converter/?foreign=a&foreign=b&f=png&q=35&bg=112233#kept'
  const f = await conversionFixture({ url })
  try {
    assert.equal(f.writes.length, 0); assert.equal(by(f.parent, 'data-conversion-format', 'jpeg').props['aria-pressed'], true)
    await format(f, 'webp'); await f.start(); await f.tick()
    assert.equal(by(f.parent, 'data-conversion-format', 'webp').props['aria-pressed'], true)
    assert.deepEqual(f.parent.window.location.searchParams.getAll('foreign'), ['a', 'b']); assert.equal(f.parent.window.location.hash, '#kept')
    assert.equal(f.writes.at(-1).state, f.state); assert.equal(f.parent.window.location.searchParams.get('f'), 'webp')
    await f.add(['keep.png']); await f.settle(0)
    const blob = f.urls.get(f.parent.find(n => n.type === 'img').props.src), replace = f.parent.window.history.replaceState
    f.parent.window.history.replaceState = () => { throw Error('history denied') }
    await f.setting('data-conversion-quality', 40); await f.tick()
    assert.equal(attrs(f, 'data-conversion-url-error').length, 1); assert.equal(f.urls.has(f.parent.find(n => n.type === 'img').props.src), true)
    assert.equal(f.urls.get(f.parent.find(n => n.type === 'img').props.src), blob)
    f.parent.window.history.replaceState = replace
    await f.pop('https://toolhub.ai.kr/image-converter/?foreign=x&foreign=y&f=jpeg&q=25&bg=abcdef#new'); await f.tick()
    assert.equal(by(f.parent, 'data-conversion-quality').props.value, 25); assert.equal(by(f.parent, 'data-conversion-bg').props.value, '#abcdef')
    assert.deepEqual(f.parent.window.location.searchParams.getAll('foreign'), ['x', 'y']); assert.equal(f.parent.window.location.hash, '#new')
    assert.equal(rows(f).length, 1)
  } finally { f.close(); if (f.calls[1]) { f.calls[1].reject(Error('late disposed conversion')); await f.sync() } }
})

await check('Strict setup replacement and locale keep the current controller isolated from stale outputs and controls', async () => {
  const f = await ready()
  try {
    await f.add(['old.png']); const oldPause = by(f.parent, 'data-conversion-action', 'pause').props.onClick
    f.parent.replayEffects(); await f.sync(); await f.start()
    assert.equal(rows(f).length, 0); assert.equal(phase(f), 'idle')
    oldPause(); await f.sync(); assert.equal(phase(f), 'idle')
    // Let the previous physical operation drain before starting a current one; no global cross-mount concurrency claim.
    await f.settle(0); assert.equal(rows(f).length, 0); assert.equal(f.urls.size, 0)
    await f.add(['current.png']); await f.settle(1)
    const url = f.parent.find(n => n.type === 'img').props.src
    await f.locale('en'); await f.locale('ko')
    assert.equal(f.parent.find(n => n.type === 'img').props.src, url); assert.equal(f.calls.length, 2)
    f.downloadThrows(true); await f.click('data-conversion-download', rows(f)[0].props['data-conversion-row'])
    assert.equal(attrs(f, 'data-conversion-download-error').length, 1); assert.equal(f.downloads.length, 0)
    assert.equal(f.urls.size, 1)
    f.downloadThrows(false); await f.click('data-conversion-download', rows(f)[0].props['data-conversion-row'])
    const callbacks = f.timers.filter(timer => timer.delay === 30000).map(timer => timer.callback)
    f.close(); callbacks.forEach(callback => callback())
    assert.equal(f.urls.size, 0); assert.equal(new Set(f.revoked).size, f.revoked.length)
  } finally { f.close() }
})

assert.deepEqual(hashes(), original)
console.log(`Independent actual ImageConverter: ${groups} groups PASS; native pixels/browser/engine writes 0`)
