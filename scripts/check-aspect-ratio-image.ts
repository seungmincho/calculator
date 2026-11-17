import assert from 'node:assert/strict'
import { ASPECT_IMAGE_LIMITS as L, ASPECT_CROP_POSITIONS, AspectImageError, parseAspectPixels, parseAspectCustomRatio, readAspectQuery, aspectOutputSize, aspectImageGeometry, aspectPreviewSize, createAspectImageSettings, aspectImageFilename } from '../src/utils/aspectRatioImage.ts'
import { fitImage } from '../src/utils/aspectRatio.ts'
import { createAspectRequestGuard, copyAspectText } from '../src/utils/aspectRatioActions.ts'

let groups = 0
async function check(name: string, run: () => void | Promise<void>) { await run(); groups++; console.log('PASS', name) }
const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) <= Math.max(1e-8, Math.abs(expected) * 1e-10), `${actual} != ${expected}`)
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

await check('finite whole-string pixels and custom ratios retain rounded valid values and reject extremes', () => {
  for (const [raw, expected] of [['1920', 1920], [' 1080 ', 1080], ['1.5', 2], ['.9', 1], ['16000000', L.calculationSide]] as const) assert.equal(parseAspectPixels(raw), expected)
  for (const bad of [null, '', ' ', '0', '.49', '-1', 'Infinity', 'NaN', '1e4', '1200px', '16000000.1', '9'.repeat(400)]) assert.equal(parseAspectPixels(bad), null)
  for (const [raw, expected] of [['16:9', 16 / 9], ['9/16', 9 / 16], ['2.39:1', 2.39], ['1.85', 1.85], ['4x5', .8], ['1:16000000', 1 / L.calculationSide]] as const) assert.equal(parseAspectCustomRatio(raw), expected)
  for (const bad of ['9'.repeat(400) + ':1', 'Infinity:1', '0:9', '1:0', '16000001:1', '1:16000001', '1e2', 'NaN']) assert.equal(parseAspectCustomRatio(bad), null)
})
await check('query defaults versus explicit invalid values preserve source text and valid lock/zone only', () => {
  assert.deepEqual(readAspectQuery(new URLSearchParams()), { width: '1920', height: '1080', lockedRatio: null, zone: 'none' })
  assert.deepEqual(readAspectQuery(new URLSearchParams('w=1080&h=1920&lock=1&zone=shorts')), { width: '1080', height: '1920', lockedRatio: 9 / 16, zone: 'shorts' })
  const bad = readAspectQuery(new URLSearchParams('w=Infinity&h=&lock=1&zone=else')); assert.equal(bad.width, 'Infinity'); assert.equal(bad.height, ''); assert.equal(bad.lockedRatio, null); assert.equal(bad.zone, 'none')
})
await check('8192 side and exact16m post-round limits with zero-side refusal over deterministic dimension matrix', () => {
  assert.deepEqual(aspectOutputSize(8192, 8192), { ok: true, width: 4000, height: 4000, scaled: true })
  assert.deepEqual(aspectOutputSize(1, 1), { ok: true, width: 1, height: 1, scaled: false })
  assert.deepEqual(aspectOutputSize(16_000_000, 1), { ok: false, reason: 'tooThin' })
  for (const bad of [Infinity, NaN, 0, -1, 2.5, 16_000_001]) assert.equal(aspectOutputSize(bad, 1080).ok, false)
  let seed = 123456, roundedExcess = 0
  for (let i = 0; i < 1200; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const width = 1 + seed % 16_000_000
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const height = 1 + seed % 16_000_000
    const scale = Math.min(1, 8192 / Math.max(width, height), Math.sqrt(16_000_000 / (width * height)))
    if (Math.round(width * scale) * Math.round(height * scale) > 16_000_000) roundedExcess++
    const result = aspectOutputSize(width, height)
    if (!result.ok) { assert.equal(result.reason, 'tooThin'); continue }
    assert.ok(result.width >= 1 && result.height >= 1 && Number.isSafeInteger(result.width) && Number.isSafeInteger(result.height))
    assert.ok(Math.max(result.width, result.height) <= 8192 && result.width * result.height <= 16_000_000)
    assert.ok(Math.abs(result.width - width * scale) <= 1 && Math.abs(result.height - height * scale) <= 1)
  }
  assert.ok(roundedExcess > 100)
})
await check('independent cover/contain oracle for nine anchors plus arbitrary positions and center baseline', () => {
  const sources = [[4000, 3000], [3000, 4000], [800, 800], [1, 1000], [4000, 4000]], targets = [[1080, 1920], [1920, 1080], [4000, 4000], [17, 93], [8192, 1000]]
  for (const [sw, sh] of sources) for (const [tw, th] of targets) for (const position of [...ASPECT_CROP_POSITIONS, { id: 'free', x: 13.25, y: 87.75 }]) {
    const actual = aspectImageGeometry(sw, sh, tw, th, position.x, position.y), cover = Math.max(tw / sw, th / sh), contain = Math.min(tw / sw, th / sh)
    const cw = tw / cover, ch = th / cover
    near(actual.crop.w, cw); near(actual.crop.h, ch); near(actual.crop.x, (sw - cw) * position.x / 100); near(actual.crop.y, (sh - ch) * position.y / 100)
    near(actual.pad.w, sw * contain); near(actual.pad.h, sh * contain); near(actual.pad.x, (tw - sw * contain) / 2); near(actual.pad.y, (th - sh * contain) / 2)
    assert.ok(actual.crop.x >= 0 && actual.crop.y >= 0 && actual.crop.x + actual.crop.w <= sw + 1e-7 && actual.crop.y + actual.crop.h <= sh + 1e-7)
    if (position.x === 50 && position.y === 50) { const old = fitImage(sw, sh, tw, th); for (const field of ['x', 'y', 'w', 'h'] as const) { near(actual.crop[field], old.crop[field]); near(actual.pad[field], old.pad[field]) } }
  }
})
await check('immutable exact settings, preview sizing and safe filenames do not mutate output contract', () => {
  const draft = { width: 1920, height: 1080, fit: 'crop' as const, padColor: '#000000' as const, x: 50, y: 50 }, snap = createAspectImageSettings(draft)
  draft.x = 0; assert.equal(snap.x, 50); assert.ok(Object.isFrozen(snap))
  for (const x of [-1, 101, NaN, Infinity]) assert.throws(() => createAspectImageSettings({ ...draft, x }), AspectImageError)
  const preview = aspectPreviewSize(8192, 1); assert.equal(preview.width, 320); assert.equal(preview.height, 1); assert.equal(preview.aspectRatio, 8192)
  assert.equal(aspectImageFilename('../bad\u0000?.png', 320, 180, 'crop', 'image/png'), '.._bad__-320x180-crop.png')
})
await check('copy success only native resolve or true fallback; cross-target and invalidation block late fallback', async () => {
  for (const fallback of [() => false, () => { throw new Error('blocked') }]) for (const writeText of [undefined, async () => { throw new Error('denied') }]) assert.equal(await copyAspectText('all text', () => true, { writeText, fallback }), 'failed')
  assert.equal(await copyAspectText('text', () => true, { fallback: () => true }), 'copied')
  const guard = createAspectRequestGuard(), first = guard.begin(), late = deferred<void>(); let fallbacks = 0
  const older = copyAspectText('old size', () => guard.isCurrent(first), { writeText: () => late.promise, fallback: () => { fallbacks++; return true } })
  const newest = guard.begin(); assert.equal(await copyAspectText('new CSS', () => guard.isCurrent(newest), { writeText: async () => {}, fallback: () => false }), 'copied')
  late.reject(new Error('late')); assert.equal(await older, 'stale'); assert.equal(fallbacks, 0)
  const pending = deferred<void>(), token = guard.begin(), job = copyAspectText('old', () => guard.isCurrent(token), { writeText: () => pending.promise, fallback: () => true }); guard.dispose(); pending.resolve(); assert.equal(await job, 'stale')
})
console.log(`Aspect ratio image: ${groups} groups passed`)
