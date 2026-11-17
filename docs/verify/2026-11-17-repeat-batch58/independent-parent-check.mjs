import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { fixture } from './independent-parent-harness.mjs'

const protectedPaths = ['src/utils/ocr.ts', 'src/utils/ocrQueue.ts', 'src/lib/ocr/workerSession.ts', 'src/utils/textHandoff.ts', 'docs/verify/2026-11-17-repeat-batch57/before-fix.json', 'docs/verify/2026-11-17-repeat-batch57/copy-before-fix.json']
const hashes = () => Object.fromEntries(protectedPaths.map(path => [path, createHash('sha256').update(fs.readFileSync(path)).digest('hex')]))
const before = hashes(), only = process.argv[2]
const status = f => f.h.all().find(node => Object.hasOwn(node.props ?? {}, 'data-ocr-output-status'))?.props['data-ocr-output-status'] ?? null
const text = f => f.find('text').props.value
const copy = (f, id = 'result') => f.act('output-copy', id)
const manual = f => f.child.find(node => Object.hasOwn(node.props ?? {}, 'data-ocr-copy-manual'))
let groups = 0
async function check(name, run) { if (only && !name.includes(only)) return; await run(); groups++; console.log('PASS ' + name) }
async function ready(values = ['First recognized source', 'Second recognized source']) {
  const f = await fixture(); await f.add(values.length)
  for (const [index, value] of values.entries()) await f.complete(index, value)
  return f
}

await check('native rejection/API absence plus false fallback exposes exact full recovery and current retry only', async () => {
  for (const mode of ['reject', 'missing']) {
    const f = await ready(['source'])
    try {
      const source = '\uFEFF' + '한글🙂\r\n\t<&> \u00a0e\u0301\n'.repeat(6000)
      await f.edit(source)
      const clipboard = f.navigator.clipboard
      if (mode === 'missing') f.navigator.clipboard = undefined
      else f.io.copyMode = 'no'
      f.io.legacy = false
      await copy(f)
      assert.equal(status(f), 'failed'); assert.equal(f.io.legacyCalls, 1); assert.ok(f.child)
      assert.equal(f.child.all().filter(node => node.type === 'textarea').length, 0)
      const old = f.recovery()
      assert.equal(old.failure.text, source); assert.equal(Object.isFrozen(old.failure), true)
      await f.childClick('expand'); assert.equal(manual(f).props.value, source); assert.equal(manual(f).props.readOnly, true)
      f.selection(() => { throw Error('select denied') }); await f.childClick('select')
      assert.ok(f.child.text().includes(f.label('output.selectionFailed')))
      f.selection(() => {}); await f.childClick('select')
      assert.deepEqual(f.selections.at(-1), ['range', 0, source.length])
      f.navigator.clipboard = clipboard; f.io.copyMode = 'ok'
      await f.childClick('retry'); assert.equal(status(f), 'copied'); assert.equal(f.child, null)
      assert.equal(f.io.copies.at(-1), source)
      const calls = f.io.copies.length
      old.onRetry(old.failure); old.onClose(old.failure); await f.sync()
      assert.equal(f.io.copies.length, calls); assert.equal(status(f), 'copied'); assert.equal(text(f), source)
      assert.equal(f.h.stored.size, 0)
    } finally { f.cleanup() }
  }
})

await check('current/all pending copy cannot append fallback or notices after another copy TXT or handoff owns output', async () => {
  for (const source of ['result', 'all']) for (const next of ['otherCopy', 'TXT', 'handoff']) {
    const f = await ready()
    try {
      f.io.copyMode = 'wait'; await copy(f, source)
      const old = f.io.pendingCopies[0]
      f.io.copyMode = 'ok'
      if (next === 'otherCopy') await copy(f, source === 'result' ? 'all' : 'result')
      else if (next === 'TXT') await f.act('output-download')
      else await f.handoff()
      const expected = status(f), downloads = f.io.downloads.length, routes = f.io.routes.length
      old.reject(Error('old denied')); await f.sync()
      assert.equal(f.io.legacyCalls, 0); assert.equal(status(f), expected); assert.equal(f.child, null)
      assert.equal(f.io.downloads.length, downloads); assert.equal(f.io.routes.length, routes)
      if (next === 'otherCopy') assert.equal(f.io.copies.at(-1), source === 'result' ? 'First recognized source\n\nSecond recognized source' : 'First recognized source')
      if (next === 'TXT') assert.equal(await f.io.downloads[0].blob.text(), 'First recognized source\n\nSecond recognized source')
      if (next === 'handoff') assert.equal(JSON.parse(f.h.stored.get('toolhub-ocr-tts-v1')).text, 'First recognized source')
    } finally { f.cleanup() }
  }
  const f = await ready()
  try {
    f.io.copyMode = 'no'; await copy(f); const old = f.recovery()
    f.io.copyMode = 'wait'; await copy(f, 'all'); const calls = f.io.copies.length
    old.onRetry(old.failure); old.onClose(old.failure); await f.sync()
    assert.equal(f.io.copies.length, calls); assert.equal(status(f), 'copying')
    f.io.pendingCopies.at(-1).resolve(); await f.sync(); assert.equal(status(f), 'copied')
  } finally { f.cleanup() }
})

await check('source selection settings locale and same-language catalog ABA invalidate previous output generations', async () => {
  for (const change of ['edit', 'select', 'langs', 'prep', 'clean', 'locale', 'catalog']) {
    const f = await ready()
    try {
      f.io.copyMode = 'wait'; await copy(f, 'all'); const pending = f.io.pendingCopies[0], original = text(f)
      if (change === 'edit') { await f.edit(original + '!'); await f.edit(original) }
      if (change === 'select') { await f.act('select', 2); await f.act('select', 1) }
      if (change === 'langs') { await f.act('language', 'jpn'); await f.act('language', 'jpn') }
      if (change === 'prep') { await f.act('prep', 'off'); await f.act('prep', 'gray') }
      if (change === 'clean') { for (const checked of [true, false]) { f.find('clean', 'joinLines').props.onChange({ target: { checked } }); await f.sync() } }
      if (change === 'locale') { await f.locale('en'); await f.locale('ko') }
      if (change === 'catalog') { const saved = f.messages.imageOcr.output.current; f.messages.imageOcr.output.current += ' loaded'; await f.sync(); f.messages.imageOcr.output.current = saved; await f.sync() }
      pending.reject(Error('old context denied')); await f.sync()
      assert.equal(f.io.legacyCalls, 0, change); assert.equal(status(f), null, change); assert.equal(f.child, null, change)
      assert.equal(text(f), original)
      f.io.copyMode = 'ok'; await copy(f); assert.equal(status(f), 'copied', change)
    } finally { f.cleanup() }
  }
})

await check('synchronous queue revision protects pre-render edits and selection reentry on the actual recovery child', async () => {
  const f = await ready(['initial source'])
  try {
    f.io.copyMode = 'wait'; await copy(f)
    f.find('text').props.onChange({ target: { value: 'new edit before React render' } })
    f.io.pendingCopies[0].reject(Error('denied before render')); await f.flush(); await f.sync()
    assert.equal(f.io.legacyCalls, 0); assert.equal(status(f), null); assert.equal(text(f), 'new edit before React render')
    f.io.copyMode = 'no'; await copy(f); await f.childClick('expand')
    const old = f.recovery(), fieldProps = f.find('text').props
    f.selection(phase => { if (phase === 'focus') fieldProps.onChange({ target: { value: 'focus caused a newer manuscript' } }) })
    await f.childClick('select')
    assert.deepEqual(f.selections, ['focus']); assert.equal(f.child, null)
    old.onRetry(old.failure); old.onClose(old.failure); await f.sync()
    assert.equal(text(f), 'focus caused a newer manuscript'); assert.equal(status(f), null)
    assert.equal(f.io.copies.length, 2)
  } finally { f.cleanup() }
})

await check('all output uses visible previous success during rerun/failure and expires when new OCR replaces it', async () => {
  const f = await ready()
  try {
    await f.act('rerun', 'active'); assert.equal(f.find('select', 1).props['data-ocr-status'], 'running')
    assert.ok(f.find('previous')); await copy(f, 'all')
    assert.equal(f.io.copies.at(-1), 'First recognized source\n\nSecond recognized source')
    f.io.recognize[2].reject(Error('controlled recognition failure')); await f.sync()
    assert.equal(f.find('select', 1).props['data-ocr-status'], 'error')
    await f.act('output-download'); assert.equal(await f.io.downloads.at(-1).blob.text(), 'First recognized source\n\nSecond recognized source')
    await f.act('retry-failed')
    f.io.copyMode = 'wait'; await copy(f, 'all'); const old = f.io.pendingCopies.at(-1)
    await f.complete(3, 'Updated recognized source'); old.reject(Error('old payload denied')); await f.sync()
    assert.equal(f.io.legacyCalls, 0); assert.equal(status(f), null)
    f.io.copyMode = 'ok'; await copy(f, 'all'); assert.equal(f.io.copies.at(-1), 'Updated recognized source\n\nSecond recognized source')
    await f.act('rerun', 'active'); await f.complete(4, '')
    await copy(f); assert.equal(status(f), 'empty'); assert.equal(f.child, null)
    await copy(f, 'all'); assert.equal(f.io.copies.at(-1), '\n\nSecond recognized source')
  } finally { f.cleanup() }
})

await check('TXT exact bytes/download failure and selected handoff share one source while preserving original manuscript', async () => {
  const f = await ready()
  try {
    const source = '\uFEFF  첫 원고🙂\r\n두 번째\t문장  '
    await f.edit(source); await f.act('select', 2); await f.edit('second <>&\nlast'); await f.act('select', 1)
    const allText = source + '\n\nsecond <>&\nlast'
    await f.act('output-download')
    const download = f.io.downloads.at(-1), temporary = [...f.io.urls].find(([, blob]) => blob === download.blob)[0]
    assert.equal(download.filename, 'ocr-result.txt'); assert.deepEqual(new Uint8Array(await download.blob.arrayBuffer()), new TextEncoder().encode(allText))
    assert.equal(status(f), 'downloadStarted'); assert.equal(f.io.revoked.includes(temporary), false)
    f.h.tick(1000); assert.equal(f.io.revoked.filter(url => url === temporary).length, 1)
    const create = f.h.context.URL.createObjectURL
    f.h.context.URL.createObjectURL = () => { throw Error('URL denied') }
    await f.act('output-download'); assert.equal(status(f), 'downloadFailed'); assert.equal(text(f), source)
    f.h.context.URL.createObjectURL = create
    await f.act('output-download'); assert.equal(status(f), 'downloadStarted')
    const start = source.indexOf('첫'), end = source.indexOf('\r')
    f.find('text').props.ref.current = { selectionStart: start, selectionEnd: end }
    f.find('text').props.onSelect({ currentTarget: { selectionStart: start, selectionEnd: end } }); await f.sync()
    await f.handoff(true)
    const payload = JSON.parse(f.h.stored.get('toolhub-ocr-tts-v1'))
    assert.equal(payload.source, 'ocr'); assert.equal(payload.text, source.slice(start, end)); assert.equal(f.io.routes.at(-1), '/text-to-speech/?from=ocr')
    assert.equal(text(f), source); assert.equal(status(f), null)
    f.io.copyMode = 'wait'; await copy(f)
    const setItem = f.h.context.sessionStorage.setItem
    f.h.context.sessionStorage.setItem = () => { throw Error('quota') }
    const routes = f.io.routes.length; await f.handoff()
    f.io.pendingCopies.at(-1).reject(Error('old copy denied')); await f.sync()
    assert.equal(f.io.routes.length, routes); assert.equal(f.io.legacyCalls, 0); assert.equal(text(f), source)
    assert.ok(f.h.text().includes(f.label('handoff.storageFailed')))
    f.h.context.sessionStorage.setItem = setItem
  } finally { f.cleanup() }
})

await check('old two-second timers, Strict effect epochs and unmount cannot alter newer output status', async () => {
  const f = await ready(['current source'])
  try {
    await copy(f); const oldTimer = f.timers.find(timer => timer.delay === 2000).callback
    await f.act('output-download'); oldTimer(); await f.sync(); assert.equal(status(f), 'downloadStarted')
    f.io.copyMode = 'wait'; await copy(f); const oldPending = f.io.pendingCopies.at(-1)
    f.h.replayEffects(); await f.sync(); oldPending.reject(Error('previous effect denied')); await f.sync()
    assert.equal(f.io.legacyCalls, 0); assert.equal(status(f), null)
    f.io.copyMode = 'ok'; await copy(f); assert.equal(status(f), 'copied')
    oldTimer(); await f.sync(); assert.equal(status(f), 'copied')
    f.io.copyMode = 'wait'; await copy(f); const after = f.io.pendingCopies.at(-1)
    f.cleanup(); after.reject(Error('after unmount')); await f.flush()
    assert.equal(f.io.legacyCalls, 0)
  } finally { f.cleanup() }
})

assert.deepEqual(hashes(), before)
console.log(`Independent OCR actual output parent: ${groups} groups PASS; unchanged queue/worker/baselines; native clipboard/model/browser 0`)
