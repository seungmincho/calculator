import assert from 'node:assert/strict'
import { fixture, photo, deferred, all } from './aspect-parent-harness.mjs'
import { gcd, reduceRatio, parseRatio, nearestCommon, resolutionLadder, fitImage } from '../../../src/utils/aspectRatio.ts'

const tests = [], test = (name, run) => tests.push({ name, run })
const input = (f, id) => f.find(f.h, 'id', id).props.value
test('existing util rejects direct nonfinite and invalid values while valid center/resolution values stay unchanged', () => {
  for (const value of [Infinity, -Infinity, NaN, 0, -1, 16_000_001]) {
    assert.deepEqual(reduceRatio(value, 1080), [0, 0]); assert.equal(nearestCommon(value, 1080), null); assert.deepEqual(resolutionLadder(value), [])
    assert.equal(fitImage(value, 300, 1080, 1920).crop.w, 0)
  }
  assert.equal(gcd(Infinity, 10), 0); assert.equal(gcd(1920, 1080), 120); assert.equal(parseRatio('9'.repeat(400) + ':1'), null)
  assert.deepEqual(reduceRatio(1366, 768), [683, 384]); assert.deepEqual(resolutionLadder(16 / 9)[5], { short: 4320, w: 7680, h: 4320, exact: true }); assert.equal(fitImage(4000, 3000, 1080, 1920).crop.x, 1156.25)
})
test('actual initial URL restore and early edit preserve explicit invalid input, extra query/hash/history and no stale timer writes', async () => {
  const f = await fixture('w=1080&h=1920&lock=1&zone=shorts'); assert.equal(input(f, 'ar-w'), '1920'); await f.settle()
  assert.equal(input(f, 'ar-w'), '1080'); assert.equal(input(f, 'ar-h'), '1920'); assert.equal(f.replacements.length, 0)
  await f.change('ar-w', '2160'); assert.equal(input(f, 'ar-h'), '3840'); await f.fire(300)
  const url = new URL(f.h.window.location.href); assert.deepEqual(url.searchParams.getAll('keep'), ['one', 'two']); assert.equal(url.hash, '#photo'); assert.equal(url.searchParams.get('w'), '2160'); assert.ok(f.replacements.every(entry => entry.state === f.history))
  const oldTimer = f.timers.filter(timer => timer.delay === 300).at(-1); await f.change('ar-w', 'Infinity'); oldTimer.fn(); await f.settle(); assert.equal(new URL(f.h.window.location.href).searchParams.get('w'), '2160'); assert.equal(input(f, 'ar-w'), 'Infinity'); f.cleanup()
  const early = await fixture('w=777&h=888'); early.find(early.h, 'id', 'ar-w').props.onChange({ target: { value: '123' } }); await early.settle(); assert.equal(input(early, 'ar-w'), '123'); assert.equal(input(early, 'ar-h'), '1080'); early.cleanup()
  const bad = await fixture('w=Infinity&h=&lock=1'); await bad.settle(); assert.equal(input(bad, 'ar-w'), 'Infinity'); assert.equal(input(bad, 'ar-h'), ''); assert.equal(bad.replacements.length, 0); bad.cleanup()
})
test('actual preset ratio/lock/swap/resizer and invalid calculated dimensions retain the calculator contract', async () => {
  const f = await fixture(); await f.settle(); f.h.button('4:5').props.onClick(); await f.settle(); assert.equal(input(f, 'ar-w'), '1080'); assert.equal(input(f, 'ar-h'), '1350')
  await f.change('ar-w', '2160'); assert.equal(input(f, 'ar-h'), '2700'); await f.click('data-aspect-swap', true, f.h); assert.equal(input(f, 'ar-w'), '2700'); assert.equal(input(f, 'ar-h'), '2160')
  await f.change('ar-tw', '1200'); await f.click('data-aspect-copy', 'resize', f.h); assert.equal(f.writes.at(-1), '1200×960')
  await f.click('data-aspect-lock', true, f.h); await f.change('ar-w', '16000000'); await f.change('ar-h', '1'); await f.click('data-aspect-lock', true, f.h); await f.change('ar-w', '1'); assert.equal(input(f, 'ar-h'), '')
  f.find(f.h, 'data-aspect-custom-ratio', true).props.onChange({ target: { value: '9'.repeat(400) + ':1' } }); await f.settle(); assert.equal(f.find(f.h, 'data-aspect-apply-ratio', true).props.disabled, true)
  f.cleanup()
})
test('actual copy fallback/recovery, cross-target completion, early A-B-A input and locale round trips are guarded', async () => {
  const f = await fixture(); await f.settle(); f.io.native = 'reject'; await f.click('data-aspect-copy', 'css', f.h)
  assert.equal(f.recovery().props.text, 'aspect-ratio: 16 / 9;'); f.io.legacy = true; f.recovery().props.onRetry(); await f.settle(); assert.equal(f.find(f.h, 'data-aspect-copy', 'css').props['data-aspect-copied'], true)
  await f.locale('en'); await f.locale('ko'); assert.equal(f.find(f.h, 'data-aspect-copy', 'css').props['data-aspect-copied'], false)
  f.io.native = 'wait'; await f.click('data-aspect-copy', 'size', f.h); const old = f.jobs.at(-1); f.io.native = 'success'; await f.click('data-aspect-copy', 'ratio', f.h); const before = f.fallback.length; old.reject(new Error('old')); await f.settle(); assert.equal(f.fallback.length, before); assert.equal(f.find(f.h, 'data-aspect-copy', 'ratio').props['data-aspect-copied'], true)
  f.io.native = 'wait'; await f.click('data-aspect-copy', 'css', f.h); const waiting = f.jobs.at(-1)
  f.find(f.h, 'id', 'ar-w').props.onChange({ target: { value: '3' } }); f.find(f.h, 'id', 'ar-w').props.onChange({ target: { value: '1920' } }); await f.settle(); waiting.resolve(); await f.settle(); assert.equal(f.find(f.h, 'data-aspect-copy', 'css').props['data-aspect-copied'], false)
  await f.click('data-aspect-copy', 'size', f.h); const localePending = f.jobs.at(-1); await f.locale('en'); await f.locale('ko'); localePending.reject(new Error('locale old')); await f.settle(); assert.equal(f.recovery(), undefined); f.cleanup()
})
test('actual source commits reset crop only on success, failed replacement preserves photo/position, invalid inputs keep owner mounted', async () => {
  const f = await fixture(); await f.settle(); assert.equal(f.find(f.p, 'data-aspect-image-preview').props.children, undefined)
  await f.upload(photo('A.png')); await f.fire(60); assert.equal(f.host.children.length, 1); assert.equal(f.find(f.p, 'data-aspect-image-preview').props.children, undefined)
  await f.crop(0, 100); await f.fire(60); await f.click('data-aspect-image-fit', 'pad'); await f.click('data-aspect-image-fit', 'crop'); assert.equal(f.find(f.p, 'data-aspect-image-panel').props['data-aspect-image-x'], 0)
  await f.change('ar-w', '1080'); await f.change('ar-h', '1920'); assert.equal(f.find(f.p, 'data-aspect-image-panel').props['data-aspect-image-y'], 100)
  f.io.decode = async () => { throw new Error('bad B') }; await f.upload(photo('bad.png')); assert.equal(f.find(f.p, 'data-aspect-image-panel').props['data-aspect-image-source'], 'A.png'); assert.equal(f.find(f.p, 'data-aspect-image-panel').props['data-aspect-image-x'], 0); assert.deepEqual(f.closed, [])
  await f.change('ar-w', ''); assert.equal(f.childProps().width, 0); assert.equal(f.find(f.p, 'data-aspect-image-panel').props['data-aspect-image-source'], 'A.png')
  f.io.decode = null; await f.upload(photo('B.png')); assert.equal(f.find(f.p, 'data-aspect-image-panel').props['data-aspect-image-source'], 'B.png'); assert.equal(f.find(f.p, 'data-aspect-image-panel').props['data-aspect-image-x'], 50); assert.deepEqual(f.closed, ['A.png'])
  await f.click('data-aspect-image-use-size'); assert.equal(input(f, 'ar-w'), '400'); assert.equal(input(f, 'ar-h'), '300')
  await f.click('data-aspect-image-clear'); assert.equal(f.find(f.p, 'data-aspect-image-preview').props.children, undefined)
  await f.upload(photo('after-clear.png')); await f.fire(60); assert.equal(f.find(f.p, 'data-aspect-image-preview').props.children, undefined); assert.equal(f.host.children.length, 1); f.cleanup()
})
test('actual A/B decode ordering and native picker cancellation preserve old source while physical work finishes', async () => {
  const f = await fixture(); await f.settle(); await f.upload(photo('original.png')); await f.crop(100, 0)
  const slow = deferred(); f.io.decode = file => file.name === 'A.png' ? slow.promise : Promise.resolve({ src: {}, width: 300, height: 400, still: true, close: () => f.closed.push(file.name) })
  await f.upload(photo('A.png')); await f.upload(photo('B.png')); assert.deepEqual(f.decoded, ['original.png', 'A.png'])
  slow.resolve({ src: {}, width: 400, height: 300, still: true, close: () => f.closed.push('A.png') }); await f.settle(); assert.deepEqual(f.decoded, ['original.png', 'A.png', 'B.png']); assert.equal(f.find(f.p, 'data-aspect-image-panel').props['data-aspect-image-source'], 'B.png')
  await f.crop(0, 100); const canceled = deferred(); f.io.decode = () => canceled.promise; await f.upload(photo('canceled.png')); f.fileInput.dispatchEvent(new Event('cancel')); await f.settle(); canceled.resolve({ src: {}, width: 100, height: 100, still: true, close: () => f.closed.push('canceled.png') }); await f.settle()
  assert.equal(f.find(f.p, 'data-aspect-image-panel').props['data-aspect-image-source'], 'B.png'); assert.equal(f.find(f.p, 'data-aspect-image-panel').props['data-aspect-image-y'], 100); assert.ok(f.closed.includes('canceled.png')); f.cleanup()
})
test('actual late toBlob after settings, clear or unmount cannot download and keeps slot until real finish', async () => {
  for (const action of ['position', 'dimensions', 'clear', 'unmount']) {
    const f = await fixture(); await f.settle(); await f.upload(photo('A.png')); await f.fire(60); const delayed = deferred(); f.io.encode = () => delayed.promise
    await f.click('data-aspect-image-download'); const canvas = f.canvases.at(-1); assert.equal(f.adapterInstances.at(-1).getWorkState().active, true)
    if (action === 'position') await f.crop(0, 0)
    if (action === 'dimensions') await f.change('ar-w', '777')
    if (action === 'clear') await f.click('data-aspect-image-clear')
    if (action === 'unmount') f.cleanup()
    assert.ok(canvas.width > 0); delayed.resolve(new Blob(['old'], { type: 'image/png' })); await new Promise(resolve => setImmediate(resolve)); if (action !== 'unmount') await f.settle()
    assert.equal(f.downloads.length, 0); assert.equal(canvas.width, 0); if (action !== 'unmount') f.cleanup()
  }
})
test('actual output bounds and extreme preview layout contract, duplicate click, current retry and URL cleanup', async () => {
  const f = await fixture(); await f.settle(); await f.upload(photo('synthetic.png'))
  for (const [w, h] of [[8192, 8192], [1, 8192], [8192, 1]]) {
    await f.change('ar-w', String(w)); await f.change('ar-h', String(h)); await f.fire(60)
    const frame = f.find(f.p, 'data-aspect-image-frame').props.style, bounds = f.find(f.p, 'data-aspect-preview-bounds')
    assert.ok(bounds.props.className.includes('aspect-square') && bounds.props.className.includes('max-w-80')); assert.ok(parseFloat(frame.width) <= 100 && parseFloat(frame.height) <= 100)
    await f.click('data-aspect-image-download'); const out = f.encoded.at(-1); assert.deepEqual([out.width, out.height], w === h ? [4000, 4000] : [w, h])
  }
  const bad = deferred(); f.io.encode = () => bad.promise; f.find(f.p, 'data-aspect-image-download').props.onClick(); f.find(f.p, 'data-aspect-image-download').props.onClick(); await f.settle(); const count = f.encoded.length
  bad.resolve(null); await f.settle(); assert.equal(f.encoded.length, count); assert.equal(f.find(f.p, 'data-aspect-image-status', 'output').props.role, 'alert')
  f.io.encode = null; await f.click('data-aspect-image-retry', 'export'); assert.equal(f.downloads.at(-1).filename, 'synthetic-8192x1-crop.png'); await f.fire(1000); assert.equal(f.revoked.length, f.downloads.length)
  await f.change('ar-w', '16000000'); await f.change('ar-h', '1'); assert.equal(f.p.all().some(node => Object.hasOwn(node.props, 'data-aspect-image-download')), false); assert.ok(f.p.all().some(node => node.props['data-aspect-image-error'] === 'tooThin')); f.cleanup()
})
test('actual StrictMode initial replay and cleanup leave fresh owners and preserve overlay outside canvas', async () => {
  const f = await fixture('w=1080&h=1920&zone=shorts'); f.h.replayEffects(); f.p.replayEffects(); await f.settle(); assert.equal(f.adapterInstances.length, 2)
  const overlay = all(f.childProps().overlay); assert.equal(overlay.filter(node => node.type === 'div').length, 5); assert.equal(overlay.find(node => node.props.style?.height).props.style.height, '12.5%')
  await f.upload(photo('A.png')); await f.fire(60); const preview = f.canvases.at(-1); assert.equal(preview.fills.length, 0, 'crop preview does not bake safe-zone tint'); await f.click('data-aspect-image-download'); assert.equal(f.canvases.at(-1).fills.length, 0)
  f.cleanup(); assert.equal(preview.width, 0); assert.deepEqual(f.closed, ['A.png'])
})
let count = 0
for (const { name, run } of tests) { if (process.argv[2] && !name.includes(process.argv[2])) continue; await run(); count++; console.log('PASS ' + name) }
console.log(`Aspect actual parent: ${count} groups passed`)
