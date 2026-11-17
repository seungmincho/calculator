import assert from 'node:assert/strict'
import { fixture, result } from './ocr-parent-harness.mjs'

let passed = 0
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); passed++; console.log('PASS', name) }
const exists = (f, key) => f.h.all().some(node => Object.hasOwn(node.props ?? {}, `data-ocr-${key}`))
const clean = async (f, key, checked) => { f.find('clean', key).props.onChange({ target: { checked } }); f.h.render(); await f.settle() }

await check('automatic sequential v6 recognition, pause current completion and pending additions, outputs keep visible edited text', async () => {
  const f = await fixture(); await f.add(2); assert.equal(f.io.create.length, 1); assert.equal(f.io.recognize.length, 1)
  assert.equal(JSON.stringify(f.io.recognize[0].output), JSON.stringify({ text: true, blocks: true })); assert.equal(typeof f.io.recognize[0].jobId, 'string')
  assert.equal(typeof f.io.create[0].options.errorHandler, 'function')
  await f.action('pause'); await f.complete(0, '한 글\n원고'); assert.equal(f.io.recognize.length, 1)
  await f.add(); assert.equal(f.io.recognize.length, 1); await f.action('select', 1); await f.edit('최신 편집 원고')
  await f.action('rerun', 'active'); await f.action('confirm'); assert.equal(f.field().props.value, '최신 편집 원고'); assert.ok(exists(f, 'previous'))
  await f.click('copy'); assert.equal(f.io.copies.at(-1), '최신 편집 원고')
  await f.click('downloadTxt'); assert.equal(await f.io.downloads.at(-1).blob.text(), '최신 편집 원고')
  await f.click('handoff.read'); assert.equal(f.io.routes.at(-1), '/text-to-speech/?from=ocr'); assert.ok([...f.h.stored.values()].some(value => value.includes('최신 편집 원고')))
  await f.action('pause'); assert.equal(f.io.recognize.length, 2); await f.complete(1, 'replacement'); assert.equal(f.field().props.value, 'replacement'); assert.equal(f.io.recognize.length, 3)
  f.cleanup()
})

await check('rerun cancel and stale confirmation preserve edits; approved rerun cannot overwrite an edit ABA', async () => {
  const f = await fixture(); await f.add(); await f.complete(0, 'base'); await f.edit('A')
  await f.action('rerun', 'active'); await f.action('confirm-cancel'); assert.equal(f.io.recognize.length, 1); assert.equal(f.field().props.value, 'A')
  await f.action('rerun', 'active'); await f.edit('B'); await f.action('confirm'); assert.equal(f.io.recognize.length, 1); assert.ok(exists(f, 'confirm-changed'))
  await f.action('rerun', 'active'); await f.action('confirm'); assert.equal(f.io.recognize.length, 2)
  await f.edit('C'); await f.edit('B'); await f.complete(1, 'new OCR'); assert.equal(f.field().props.value, 'B'); assert.equal(f.find('result-notice').props.children, f.label('jobs.editedRetained'))
  await f.action('rerun', 'active'); await f.action('confirm'); await f.complete(2, ''); assert.equal(f.field().props.value, ''); assert.equal(f.find('result-notice').props.children, f.label('jobs.emptyResult'))
  await f.edit('after blank'); await f.action('rerun', 'active'); await f.action('confirm'); await f.edit('new during blank'); await f.complete(3, ''); assert.equal(f.field().props.value, 'new during blank'); assert.equal(f.find('result-notice').props.children, f.label('jobs.emptyEditedRetained'))
  f.cleanup()
})

await check('cleanup and reset explicitly confirm, cancel restores option, and new changes invalidate permission', async () => {
  const f = await fixture(); await f.add(); await f.complete(0, 'hello\nworld'); await f.edit('keep me')
  await clean(f, 'joinLines', true); assert.equal(f.find('clean', 'joinLines').props.checked, false); await f.action('confirm-cancel'); assert.equal(f.field().props.value, 'keep me')
  await clean(f, 'joinLines', true); await f.edit('new edit'); await f.action('confirm'); assert.equal(f.field().props.value, 'new edit'); assert.equal(f.find('clean', 'joinLines').props.checked, false)
  await clean(f, 'joinLines', true); await f.action('confirm'); assert.equal(f.find('clean', 'joinLines').props.checked, true); assert.equal(f.field().props.value, 'hello world')
  await f.edit('reset protected'); await f.action('reset'); await f.action('confirm-cancel'); assert.equal(f.field().props.value, 'reset protected')
  await f.action('reset'); await f.action('confirm'); assert.equal(exists(f, 'text'), false); assert.equal(f.h.all().filter(node => Object.hasOwn(node.props ?? {}, 'data-ocr-select')).length, 0)
  f.cleanup()
})

await check('failed rerun keeps manuscript, retry captures only failures and remains paused until Continue', async () => {
  const f = await fixture(); await f.add(2); await f.complete(0, 'one'); await f.complete(1, 'two'); await f.action('select', 1); await f.edit('edited one')
  await f.action('rerun', 'active'); await f.action('confirm'); await f.action('pause'); f.io.recognize[2].reject(Error('worker failure')); await f.settle()
  assert.equal(f.find('select', 1).props['data-ocr-status'], 'error'); assert.equal(f.field().props.value, 'edited one'); assert.ok(exists(f, 'previous'))
  await f.action('retry-failed'); assert.equal(f.find('root').props['data-ocr-paused'], true); assert.equal(f.io.recognize.length, 3); assert.equal(f.find('select', 2).props['data-ocr-status'], 'done')
  await f.action('pause'); assert.equal(f.io.recognize.length, 4); await f.complete(3, 'retry OCR'); assert.equal(f.field().props.value, 'edited one'); assert.equal(f.io.recognize.length, 4)
  f.cleanup()
})

await check('reset during worker creation holds replacement until creation settles, and unmount never recognizes late worker', async () => {
  const f = await fixture({ holdCreate: true }); await f.add(); assert.equal(f.io.create.length, 1); await f.action('reset'); await f.add(); assert.equal(f.io.create.length, 1); assert.equal(f.io.recognize.length, 0)
  f.io.holdCreate = false; f.creation.resolve(); await f.settle(); assert.equal(f.io.terminate, 1); assert.equal(f.io.create.length, 2); assert.equal(f.io.recognize.length, 1)
  await f.complete(0, 'only latest'); assert.equal(f.field().props.value, 'only latest'); f.cleanup()
  const gone = await fixture({ holdCreate: true }); await gone.add(); gone.cleanup(); gone.creation.resolve(); await gone.flush(); await gone.flush(); assert.equal(gone.io.terminate, 1); assert.equal(gone.io.recognize.length, 0)
})

await check('remove unresolved recognition releases logical queue but waits for termination; old logger/result cannot touch successor', async () => {
  const f = await fixture({ holdTerminate: true }); await f.add(2); const old = f.io.recognize[0], oldLogger = f.io.create[0].options.logger
  await f.action('remove', 1); assert.equal(f.io.recognize.length, 1); assert.equal(f.io.terminate, 1)
  oldLogger({ status: 'recognizing text', progress: 0.99, userJobId: old.jobId }); f.h.render(); assert.equal(f.h.text().includes('99%'), false)
  f.io.holdTerminate = false; f.termination.resolve(); await f.settle(); assert.equal(f.io.recognize.length, 2); await f.complete(1, 'survivor')
  old.resolve(result('removed text')); await f.settle(); assert.equal(f.field().props.value, 'survivor'); f.cleanup()
})

await check('settings are captured at start and reinitialize uses explicit v6 jobId; stale language completion is cancelled', async () => {
  const f = await fixture({ holdReinitialize: true }); await f.add(); await f.action('language', 'eng'); await f.action('prep', 'off'); await f.action('rotate', 'right'); await f.complete(0, 'old settings')
  assert.ok(exists(f, 'settings-changed')); await f.action('rerun', 'active'); assert.equal(f.io.reinitialize.length, 1)
  const init = f.io.reinitialize[0]; assert.equal(init.langs, 'kor'); assert.equal(init.oem, undefined); assert.equal(init.config, undefined); assert.ok(init.jobId.startsWith('toolhub-ocr-'))
  await f.action('reset'); await f.add(); assert.equal(f.io.create.length, 2); assert.equal(f.io.recognize.length, 2)
  init.resolve(); await f.settle(); assert.equal(f.io.recognize.length, 2); await f.complete(1, 'new settings'); assert.equal(exists(f, 'settings-changed'), false); f.cleanup()
})

await check('preview source key and late decode failure or toBlob cannot replace or clear the latest preview', async () => {
  const f = await fixture(); await f.add(); await f.complete(0, 'base')
  f.io.holdPreview = true; await f.action('rotate', 'right'); const oldBlob = f.io.previews.at(-1)
  await f.action('rotate', 'right'); const newBlob = f.io.previews.at(-1); newBlob(new Blob(['latest'])); await f.settle(); const latest = f.find('preview').props.src
  oldBlob(new Blob(['older'])); await f.settle(); assert.equal(f.find('preview').props.src, latest)
  f.io.holdDecode = true; await f.action('rotate', 'right'); const oldDecode = f.io.decoded.at(-1)
  f.io.holdDecode = false; f.io.holdPreview = false; await f.action('rotate', 'right'); const current = f.find('preview').props.src
  oldDecode.reject(Error('late decode')); await f.settle(); assert.equal(f.find('preview').props.src, current)
  await f.action('reset'); assert.equal(exists(f, 'preview'), false); assert.ok(f.io.revoked.includes(current)); f.cleanup()
})

console.log(`OCR actual-parent author: ${passed} groups passed (controlled Worker/Canvas only)`)
