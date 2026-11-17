import assert from 'node:assert/strict'
import { fixture } from '../2026-11-17-repeat-batch58/ocr-output-parent-harness.mjs'

let passed = 0
const filter = process.argv.find(arg => arg.startsWith('--match='))?.slice(8)
const check = async (name, run) => { if (filter && !name.includes(filter)) return; await run(); passed++; console.log('PASS', name) }
const exists = (f, key) => f.h.all().some(node => Object.hasOwn(node.props ?? {}, `data-ocr-${key}`))
const value = f => f.find('text').props.value
const status = (f, id) => f.find('select', id).props['data-ocr-status']
const clean = async (f, key, checked) => { f.find('clean', key).props.onChange({ target: { checked } }); f.h.render(); await f.settle() }
const blank = { data: { text: '', blocks: null, confidence: 0 } }

await check('rerun approval protects later empty/ABA draft and pending visible text reaches copy TXT and TTS unchanged', async () => {
  const f = await fixture()
  try {
    await f.add(2); await f.complete(0, 'first raw'); await f.complete(1, 'second raw'); await f.action('select', 1); await f.edit('approved manuscript')
    await f.action('rerun', 'active'); assert.equal(f.find('confirmation').props['data-ocr-confirmation'], 'rerun')
    await f.action('confirm-cancel'); assert.equal(f.io.recognize.length, 2); assert.equal(value(f), 'approved manuscript')
    await f.action('rerun', 'active'); await f.action('confirm'); assert.equal(status(f, 1), 'running'); assert.ok(exists(f, 'previous'))
    await f.action('output-copy', 'result'); assert.equal(f.io.copies.at(-1), 'approved manuscript')
    await f.action('output-copy', 'all'); assert.equal(f.io.copies.at(-1), 'approved manuscript\n\nsecond raw')
    await f.action('output-download'); assert.equal(await f.io.downloads.at(-1).blob.text(), 'approved manuscript\n\nsecond raw')
    await f.click('handoff.read'); const handoff = JSON.parse(f.h.stored.get('toolhub-ocr-tts-v1'))
    assert.equal(handoff.text, 'approved manuscript'); assert.equal(f.io.routes.at(-1), '/text-to-speech/?from=ocr')
    await f.edit('changed'); await f.edit('approved manuscript'); f.io.recognize[2].resolve(blank); await f.settle()
    assert.equal(value(f), 'approved manuscript'); assert.equal(status(f, 1), 'done'); assert.ok(f.h.text().includes(f.label('jobs.emptyEditedRetained')))
    await f.action('rerun', 'active'); await f.action('confirm'); await f.edit(''); await f.complete(3, 'new text')
    assert.equal(value(f), ''); assert.ok(f.h.text().includes(f.label('jobs.editedRetained')))
  } finally { f.cleanup() }
})

await check('cleanup and reset confirmations remain inert on cancel and stale edits or added source cannot erase manuscripts', async () => {
  const f = await fixture()
  try {
    await f.add(); await f.complete(0, 'first\nsecond'); await f.edit('manual')
    await clean(f, 'joinLines', true); assert.equal(f.find('clean', 'joinLines').props.checked, false)
    await f.action('confirm-cancel'); assert.equal(value(f), 'manual'); assert.equal(f.find('clean', 'joinLines').props.checked, false)
    await clean(f, 'joinLines', true); const oldCleanup = f.find('confirm').props.onClick
    await f.edit('different'); await f.edit('manual'); oldCleanup(); f.h.render(); await f.settle()
    assert.equal(value(f), 'manual'); assert.equal(f.find('clean', 'joinLines').props.checked, false); assert.ok(exists(f, 'confirm-changed'))
    await clean(f, 'joinLines', true); await f.action('confirm'); assert.equal(value(f), 'first second'); assert.equal(f.find('clean', 'joinLines').props.checked, true)
    await f.edit('preserved'); await f.action('reset'); await f.action('confirm-cancel'); assert.equal(value(f), 'preserved')
    await f.action('reset'); const oldReset = f.find('confirm').props.onClick; await f.add(); oldReset(); f.h.render(); await f.settle()
    assert.equal(f.h.all().filter(node => Object.hasOwn(node.props ?? {}, 'data-ocr-select')).length, 2)
    await f.action('select', 1); assert.equal(value(f), 'preserved'); assert.ok(exists(f, 'confirm-changed'))
  } finally { f.cleanup() }
})

await check('pause finishes only current file; added sources and failed retry wait and preserve completed source', async () => {
  const f = await fixture()
  try {
    await f.add(2); await f.action('pause'); await f.complete(0, 'one'); assert.equal(f.io.recognize.length, 1)
    await f.add(); assert.equal(f.io.recognize.length, 1); assert.equal(f.find('root').props['data-ocr-paused'], true)
    await f.action('pause'); assert.equal(f.io.recognize.length, 2)
    f.io.recognize[1].reject(Error('controlled OCR failure')); await f.settle(); assert.equal(status(f, 2), 'error'); assert.equal(f.io.recognize.length, 3)
    await f.action('pause'); await f.complete(2, 'three'); await f.action('retry-failed')
    assert.equal(f.io.recognize.length, 3); assert.equal(status(f, 1), 'done'); assert.equal(status(f, 2), 'pending'); assert.equal(status(f, 3), 'done')
    await f.action('pause'); assert.equal(f.io.recognize.length, 4); await f.complete(3, 'two'); assert.equal(f.io.recognize.length, 4)
    await f.action('select', 1); assert.equal(value(f), 'one')
  } finally { f.cleanup() }
})

await check('actual create reset waits for late worker termination before new source and ignores old logger', async () => {
  const f = await fixture({ holdCreate: true, holdTerminate: true })
  try {
    await f.add(); assert.equal(f.io.create.length, 1); assert.equal(f.io.recognize.length, 0)
    await f.action('reset'); await f.add(); assert.equal(f.io.create.length, 1)
    assert.ok(f.h.text().includes(f.label('jobs.resourceWaiting')))
    f.io.create[0].options.logger({ status: 'recognizing text', progress: 0.99, userJobId: 'old' }); await f.settle()
    assert.equal(f.io.recognize.length, 0)
    f.creation.resolve(); await f.settle(); assert.equal(f.io.terminate, 1); assert.equal(f.io.create.length, 1)
    f.io.holdCreate = false; f.termination.resolve(); await f.settle(); assert.equal(f.io.create.length, 2); assert.equal(f.io.recognize.length, 1)
    assert.deepEqual(Object.entries(f.io.recognize[0].output), [['text', true], ['blocks', true]])
    assert.match(f.io.recognize[0].jobId, /^toolhub-ocr-/); assert.equal(typeof f.io.create[1].options.errorHandler, 'function')
    await f.complete(0, 'new only'); assert.equal(value(f), 'new only'); assert.equal(f.h.all().filter(node => Object.hasOwn(node.props ?? {}, 'data-ocr-select')).length, 1)
  } finally { f.cleanup() }
})

await check('reinitialize adapter uses fourth jobId; removing in-flight language change prevents old recognize and result', async () => {
  const f = await fixture({ holdReinitialize: true })
  try {
    await f.add(); await f.complete(0, 'original'); await f.action('language', 'jpn'); await f.action('rerun', 'active')
    assert.equal(f.io.reinitialize.length, 1)
    const init = f.io.reinitialize[0]; assert.equal(init.langs, 'kor+eng+jpn'); assert.equal(init.oem, undefined); assert.equal(init.config, undefined); assert.match(init.jobId, /^toolhub-ocr-/)
    await f.action('remove', 1); await f.add(); assert.equal(f.io.create.length, 2)
    init.resolve(); await f.settle(); assert.equal(f.io.recognize.length, 2)
    f.io.create[0].options.logger({ status: 'recognizing text', progress: 0.8, userJobId: init.jobId }); await f.settle()
    await f.complete(1, 'fresh language'); assert.equal(value(f), 'fresh language')
    assert.equal(f.io.terminate, 1)
  } finally { f.cleanup() }
})

await check('active-source preview ignores old blob and decode failure while preserving current source and OCR settings metadata', async () => {
  const f = await fixture()
  try {
    await f.add(2); await f.complete(0, 'one'); await f.complete(1, 'two')
    f.io.holdPreview = true; await f.action('select', 2); const oldBlob = f.io.previews.at(-1)
    await f.action('select', 1); const newBlob = f.io.previews.at(-1); newBlob(new Blob(['new'])); await f.settle(); const selected = f.find('preview').props.src
    oldBlob(new Blob(['old'])); await f.settle(); assert.equal(f.find('preview').props.src, selected)
    f.io.holdDecode = true; await f.action('select', 2); const obsolete = f.io.decoded.at(-1)
    f.io.holdDecode = false; f.io.holdPreview = false; await f.action('select', 1); const latest = f.find('preview').props.src
    obsolete.reject(Error('late source decode')); await f.settle(); assert.equal(f.find('preview').props.src, latest)
    await f.action('prep', 'binary'); assert.ok(exists(f, 'settings-changed')); assert.equal(value(f), 'one')
    await f.action('reset'); assert.equal(exists(f, 'preview'), false); assert.ok(f.io.revoked.includes(latest))
  } finally { f.cleanup() }
})

await check('approved empty page is new success rather than stale manuscript; failed rerun retains that empty success', async () => {
  const f = await fixture()
  try {
    await f.add(); await f.complete(0, 'old raw'); await f.edit('old edited'); await f.action('rerun', 'active'); await f.action('confirm')
    f.io.recognize[1].resolve(blank); await f.settle(); assert.equal(value(f), ''); assert.equal(status(f, 1), 'done'); assert.ok(f.h.text().includes(f.label('jobs.emptyResult')))
    await f.action('rerun', 'active'); assert.equal(value(f), ''); assert.ok(exists(f, 'previous'))
    f.io.recognize[2].reject(Error('failed after blank')); await f.settle(); assert.equal(value(f), ''); assert.equal(status(f, 1), 'error'); assert.ok(exists(f, 'previous'))
    assert.ok(!f.h.text().includes('old edited'))
  } finally { f.cleanup() }
})

console.log(`OCR independent actual parent: ${passed} groups`)
