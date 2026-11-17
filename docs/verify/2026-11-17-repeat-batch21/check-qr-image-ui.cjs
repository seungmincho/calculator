/* eslint-disable @typescript-eslint/no-require-imports -- Node event fixture for actual product components. */
const assert = require('node:assert/strict')
const { componentHarness, all, text } = require('../2026-11-17-repeat-batch19/component-harness.cjs')
const defer = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const flush = async h => { for (let i = 0; i < 3; i++) { await new Promise(setImmediate); h.render() } }
async function batch() {
  const calls = [], artifacts = [], copied = [], clipboard = [], nodes = []
  class Element { constructor() { this.style = {}; nodes.push(this) } focus() {} select() {} setSelectionRange() {} remove() { this.removed = true } click() {} }
  class ArtifactURL extends URL { static createObjectURL(blob) { artifacts.push(blob); return `blob:${artifacts.length}` } static revokeObjectURL() {} }
  const h = await componentHarness('src/components/QrBatchScanner.tsx', { props: { active: true }, globals: { AbortController, HTMLElement: Element, URL: ArtifactURL },
    navigator: { clipboard: { writeText(value) { copied.push(value); const d = defer(); clipboard.push(d); return d.promise } } },
    document: { createElement: () => new Element(), body: { appendChild() {} }, execCommand: () => false },
    modules: { '@/lib/qr/image': { readQrImage(file, signal) { const d = defer(); calls.push({ ...d, file, signal }); return d.promise } } },
  }); h.render()
  const choose = files => { h.find(node => Object.hasOwn(node.props ?? {}, 'data-qr-batch-input')).props.onChange({ target: { files, value: 'selection' } }); h.render() }
  const click = key => { const button = h.find(node => node.type === 'button' && text(node) === key); assert.equal(!!button.props.disabled, false, key); button.props.onClick(); h.render() }
  const rows = () => h.all().filter(node => Object.hasOwn(node.props ?? {}, 'data-qr-batch-row'))
  const complete = (index, value) => calls[index].resolve({ text: value, scaled: false, multiple: false })
  return { h, calls, artifacts, copied, clipboard, nodes, choose, click, rows, complete }
}
const image = (name = 'same.png', size = 100) => ({ name, size })
let count = 0
async function check(name, run) { await run(); count++; console.log('PASS', name) }
;(async () => {
  await check('explicit start, sequential duplicate filenames, selected TXT and no automatic storage', async () => {
    const f = await batch(); f.choose([image(), image()]); assert.equal(f.calls.length, 0)
    assert.notEqual(f.rows()[0].props['data-qr-batch-row'], f.rows()[1].props['data-qr-batch-row'])
    f.click('batch.start'); assert.equal(f.calls.length, 1)
    f.complete(0, '  원문\n줄바꿈  '); await flush(f.h); assert.equal(f.calls.length, 2)
    f.complete(1, 'duplicate file'); await flush(f.h)
    assert.equal(f.rows().filter(row => row.props['data-qr-status'] === 'success').length, 2)
    assert.equal(f.h.stored.size, 0)
    const checks = f.h.all().filter(node => node.type === 'input' && node.props.type === 'checkbox')
    assert.ok(checks.every(node => !node.props.checked)); checks[0].props.onChange(); f.h.render()
    f.h.button('batch.download').props.onClick(); f.h.render()
    assert.equal(await f.artifacts[0].text(), '1. same.png\n  원문\n줄바꿈  ')
    assert.match(f.h.text(), /notices.downloaded/); f.h.cleanup()
  })
  await check('cancel preserves completed results, rejects late responses and retries only unfinished files', async () => {
    const f = await batch(); f.choose([image('a'), image('b')]); f.click('batch.start')
    f.complete(0, 'first'); await flush(f.h); f.click('batch.cancel')
    assert.equal(f.calls[1].signal.aborted, true)
    f.complete(1, 'late'); await flush(f.h)
    assert.deepEqual(f.rows().map(row => row.props['data-qr-status']), ['success', 'canceled'])
    f.click('batch.retry'); assert.equal(f.calls[2].file.name, 'b')
    f.complete(2, 'retried'); await flush(f.h)
    assert.deepEqual(f.rows().map(row => row.props['data-qr-status']), ['success', 'success']); f.h.cleanup()
  })
  await check('tab/segment deactivation cancels pending work and reopening keeps completed results', async () => {
    const f = await batch(); f.choose([image('a'), image('b')]); f.click('batch.start'); f.complete(0, 'kept'); await flush(f.h)
    f.h.setProps({ active: false }); await flush(f.h)
    assert.equal(f.calls[1].signal.aborted, true); f.complete(1, 'stale'); await flush(f.h)
    f.h.setProps({ active: true }); await flush(f.h)
    assert.deepEqual(f.rows().map(row => row.props['data-qr-status']), ['success', 'canceled'])
    assert.equal(f.calls.length, 2); assert.match(f.h.text(), /kept/); f.h.cleanup()
  })
  await check('over-count selection preserves old list; valid replacement invalidates previous reads and copies', async () => {
    const f = await batch(); f.choose([image('old')]); f.click('batch.start')
    f.choose(Array.from({ length: 11 }, () => image())); assert.equal(f.rows().length, 1); assert.equal(f.calls[0].signal.aborted, false)
    f.choose([image('new')]); assert.equal(f.calls[0].signal.aborted, true); f.complete(0, 'old result'); await flush(f.h)
    assert.equal(f.rows()[0].props['data-qr-status'], 'waiting'); assert.doesNotMatch(f.h.text(), /old result/)
    f.click('batch.start'); f.complete(1, 'new result'); await flush(f.h)
    all(f.rows()[0]).find(node => node.type === 'button' && text(node) === 'copy').props.onClick(); f.h.render()
    f.choose([image('third')]); f.clipboard[0].reject(new Error('denied')); await flush(f.h)
    assert.equal(f.nodes.length, 0); assert.equal(f.h.all().filter(node => typeof node.type === 'function' && node.type.name === 'QrCopyRecovery').length, 0); f.h.cleanup()
  })
  await check('clipboard rejection plus legacy false shows original manual recovery and unsafe text has no link', async () => {
    const f = await batch(); f.choose([image()]); f.click('batch.start'); f.complete(0, 'javascript:alert(1)'); await flush(f.h)
    assert.equal(f.h.all().filter(node => node.type === 'a').length, 0)
    all(f.rows()[0]).find(node => node.type === 'button' && text(node) === 'copy').props.onClick(); f.h.render()
    f.clipboard[0].reject(new Error('denied')); await flush(f.h)
    const recovery = f.h.find(node => typeof node.type === 'function' && node.type.name === 'QrCopyRecovery')
    assert.equal(recovery.props.text, 'javascript:alert(1)'); assert.ok(f.nodes.every(node => node.removed))
    f.h.cleanup()
  })
  await check('unmount aborts pending files and late completion does not start the next file', async () => {
    const f = await batch(); f.choose([image('a'), image('b')]); f.click('batch.start'); f.h.cleanup()
    assert.equal(f.calls[0].signal.aborted, true); f.complete(0, 'late')
    await new Promise(setImmediate); assert.equal(f.calls.length, 1)
  })
  console.log(`${count} actual QR batch component groups passed (controlled image/clipboard ports)`)
})().catch(error => { console.error(error); process.exitCode = 1 })
