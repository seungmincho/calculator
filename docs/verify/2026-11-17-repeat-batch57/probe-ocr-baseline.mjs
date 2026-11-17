import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { fixture, result } from './ocr-baseline-harness.mjs'

const observations = []
{
  const f = await fixture()
  try {
    await f.add(2); assert.equal(f.io.recognize.length, 1); assert.equal(f.io.create.length, 1); assert.equal(f.io.create[0].langs, 'kor+eng'); assert.equal(f.io.create[0].oem, 1)
    assert.equal(f.io.recognize[0].output.text, true); assert.equal(f.io.recognize[0].output.blocks, true)
    await f.complete(0, '대 한 민 국\ninfor-\nmation'); assert.equal(f.io.recognize.length, 2); assert.equal(f.field().props.value, '대한민국\ninformation'); assert.ok(f.h.text().includes('검토'))
    await f.complete(1, 'Second result'); await f.edit('내가 편집한 원고'); await f.click('copyAll'); assert.equal(f.io.copies.at(-1), '내가 편집한 원고\n\nSecond result')
    await f.click('downloadTxt'); assert.equal(await f.io.downloads[0].blob.text(), f.io.copies.at(-1))
    await f.click('handoff.read'); assert.deepEqual(f.io.routes, ['/text-to-speech/?from=ocr']); const stored = [...f.h.stored.values()].map(value => { try { return JSON.parse(value) } catch { return null } }).find(value => value?.source === 'ocr'); assert.equal(stored.text, '내가 편집한 원고')
    observations.push({ scenario: 'normal sequential two-file queue, v6 blocks, cleanup, edit, full copy/TXT and OCR handoff', workers: f.io.create.length, recognize: f.io.recognize.length, text: f.field().props.value, fullOutput: f.io.copies.at(-1), handoffText: stored.text })
  } finally { f.cleanup() }
}
{
  const f = await fixture()
  try {
    await f.add(); await f.complete(0, 'Original OCR'); await f.edit('Hand edited manuscript'); await f.click('rerun')
    assert.equal(f.io.recognize.length, 2); const during = f.h.all().some(node => node.type === 'textarea')
    await f.complete(1, 'Replacement OCR'); assert.equal(f.field().props.value, 'Replacement OCR')
    observations.push({ scenario: 'explicit rerun replaces edited manuscript without confirmation and hides it while pending', editedBefore: 'Hand edited manuscript', textareaDuringRerun: during, after: f.field().props.value })
  } finally { f.cleanup() }
}
{
  const f = await fixture({ holdCreate: true }); await f.add(); assert.equal(f.io.create.length, 1); assert.equal(f.io.recognize.length, 0)
  f.cleanup(); f.creation.resolve(); await f.flush()
  assert.equal(f.io.terminate, 0); assert.equal(f.io.recognize.length, 1)
  const observed = { scenario: 'unmount during createWorker still acquires and recognizes on the late worker', terminateAfterLateCreate: f.io.terminate, recognizeAfterUnmount: f.io.recognize.length }
  f.io.recognize[0].resolve(result()); await f.flush(); observations.push(observed)
}
{
  const f = await fixture({ holdCreate: true })
  try {
    await f.add(); await f.click('reset'); assert.equal(f.h.all().some(node => node.type === 'textarea'), false)
    f.creation.resolve(); await f.settle(); assert.equal(f.io.recognize.length, 1)
    f.io.recognize[0].resolve(result('old result')); await f.settle(); assert.equal(f.h.all().some(node => node.type === 'textarea'), false)
    observations.push({ scenario: 'reset removes images but does not invalidate an in-flight worker creation/recognize', oldRecognizeAfterReset: f.io.recognize.length, oldTextReappeared: false, workerRetainedUntilUnmount: f.io.terminate === 0 })
  } finally { f.cleanup() }
}
{
  const f = await fixture()
  try {
    await f.add(); await f.complete(0, 'Original raw'); await f.edit('Preserve my editing')
    const label = f.h.all().find(node => node.type === 'label' && node.props.children?.some?.(child => child?.props?.children === f.label('cleanup.joinLines')))
    assert.ok(label); const checkbox = label.props.children.find(node => node.type === 'input'); checkbox.props.onChange({ target: { checked: true } }); f.h.render(); await f.settle()
    assert.equal(f.field().props.value, 'Original raw')
    observations.push({ scenario: 'cleanup option clears the edited manuscript by existing explicit behavior', before: 'Preserve my editing', after: f.field().props.value, policyDecisionRequired: true })
  } finally { f.cleanup() }
}
const paths = ['src/components/ImageOcr.tsx', 'src/utils/ocr.ts', 'src/utils/textHandoff.ts', 'node_modules/tesseract.js/package.json', 'node_modules/tesseract.js/docs/api.md', 'node_modules/tesseract.js/src/index.d.ts', 'node_modules/tesseract.js/src/createWorker.js']
const report = { actualParent: true, controlledWorkerAndCanvas: true, modelDownload: false, privateImages: false, nativeBrowser: false, tesseractVersion: JSON.parse(fs.readFileSync(paths[3], 'utf8')).version, sourceSha256: Object.fromEntries(paths.map(path => [path, createHash('sha256').update(fs.readFileSync(path)).digest('hex')])), observations }
if (process.argv.includes('--record')) {
  const target = 'docs/verify/2026-11-17-repeat-batch57/before-fix.json'; if (fs.existsSync(target)) throw Error('Preserve the original baseline'); fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n')
}
console.log(JSON.stringify(report, null, 2))
