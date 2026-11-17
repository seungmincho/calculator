import assert from 'node:assert/strict'
import { WATERMARK_LIMITS as L, DEFAULT_WATERMARK_DRAFT as D, WATERMARK_POSITIONS, WatermarkError, createWatermarkSnapshot, validateWatermarkSettings, checkWatermarkAddition, checkWatermarkSize, checkWatermarkDimensions, watermarkLayout, watermarkPreviewSize, watermarkOutputName, captureWatermarkZip } from '../src/utils/imageWatermark.ts'

let groups = 0
function check(name: string, run: () => void) { run(); console.log('PASS', name); groups++ }
function fails(run: () => unknown, code: string) { assert.throws(run, error => error instanceof WatermarkError && error.code === code) }
const source = new File([new Uint8Array(4)], 'source.png', { type: 'image/png' })
const logo = { id: 'logo-one', file: source, width: 80, height: 40 }

check('active mode validation preserves draft, normalizes newlines/codepoints/color and immutable snapshot identity', () => {
  const raw = { ...D, text: '한글\r\n😀\r끝\n', fontColor: '#fF00aa' }, snapshot = createWatermarkSnapshot(raw)
  assert.equal(snapshot.settings.watermarkType, 'text')
  if (snapshot.settings.watermarkType !== 'text') throw new Error('type')
  assert.equal(snapshot.settings.text, '한글 😀 끝 '); assert.equal(snapshot.settings.fontColor, '#FF00AA'); assert.equal(raw.text, '한글\r\n😀\r끝\n')
  raw.text = 'changed'; assert.equal(snapshot.settings.text, '한글 😀 끝 '); assert.ok(Object.isFrozen(snapshot.settings)); assert.ok(Object.isFrozen(snapshot))
  assert.equal(createWatermarkSnapshot({ ...D, fontColor: '#ffffff' }).key, createWatermarkSnapshot({ ...D, fontColor: '#FFFFFF' }).key)
  validateWatermarkSettings({ ...D, text: '😀'.repeat(200) }); fails(() => validateWatermarkSettings({ ...D, text: '😀'.repeat(201) }), 'text')
  for (const text of ['', ' \r\n\t ', 'a'.repeat(201)]) fails(() => validateWatermarkSettings({ ...D, text }), 'text')
  for (const fontColor of ['red', '#fff', '#1234567', ' #ffffff', '#gg0000']) fails(() => validateWatermarkSettings({ ...D, fontColor }), 'color')
  const image = createWatermarkSnapshot({ ...D, watermarkType: 'image', text: '', fontColor: 'invalid inactive field' }, logo)
  assert.equal(image.logo!.file, source); assert.ok(!image.key.includes('invalid inactive field')); assert.notEqual(image.key, createWatermarkSnapshot({ ...D, watermarkType: 'image' }, { ...logo, id: 'logo-two' }).key)
})

check('all numeric/enum/boolean limits and missing logo fail before any drawing', () => {
  for (const [key, invalid] of [['fontSize', 9], ['fontSize', 201], ['opacity', 0], ['opacity', 101], ['rotation', -181], ['rotation', 181], ['margin', -1], ['margin', 101], ['fontFamily', 'url(secret)'], ['bold', 1], ['tileMode', 'yes'], ['position', '__proto__'], ['watermarkType', 'other']]) fails(() => validateWatermarkSettings({ ...D, [key]: invalid }), 'options')
  for (const value of [NaN, Infinity, 1.2]) fails(() => validateWatermarkSettings({ ...D, opacity: value }), 'options')
  for (const watermarkSize of [4, 81, NaN]) fails(() => createWatermarkSnapshot({ ...D, watermarkType: 'image', watermarkSize }, logo), 'options')
  fails(() => createWatermarkSnapshot({ ...D, watermarkType: 'image' }), 'logoRequired')
  fails(() => createWatermarkSnapshot({ ...D, watermarkType: 'image' }, { ...logo, width: L.logoPixels + 1 }), 'logoDimensions')
})

check('aggregate count/bytes and individual source/logo bytes/pixels have inclusive exact boundaries', () => {
  checkWatermarkAddition([], Array.from({ length: 10 }, () => ({ size: 4 * 1024 * 1024 })))
  fails(() => checkWatermarkAddition([{ size: 1 }], Array.from({ length: 10 }, () => ({ size: 1 }))), 'count')
  fails(() => checkWatermarkAddition([{ size: L.totalBytes }], [{ size: 1 }]), 'totalBytes')
  fails(() => checkWatermarkAddition([], [{ size: NaN }]), 'totalBytes')
  checkWatermarkSize(L.fileBytes); fails(() => checkWatermarkSize(L.fileBytes + 1), 'fileSize')
  checkWatermarkSize(L.logoBytes, true); fails(() => checkWatermarkSize(L.logoBytes + 1, true), 'logoSize')
  checkWatermarkDimensions(4096, 4096); fails(() => checkWatermarkDimensions(4097, 4096), 'dimensions')
  checkWatermarkDimensions(2048, 2048, true); fails(() => checkWatermarkDimensions(2049, 2048, true), 'logoDimensions')
})

check('nine original-pixel anchors and rotations keep font/margin semantics; logo keeps source-width ratio', () => {
  const expectedX = [40, 150, 260], expectedY = [35, 100, 165]
  WATERMARK_POSITIONS.forEach((position, i) => {
    const plan = watermarkLayout(300, 200, createWatermarkSnapshot({ ...D, position, fontSize: 30, margin: 20, rotation: -90, opacity: 25 }), 40)
    assert.equal(plan.center.x, expectedX[i % 3]); assert.equal(plan.center.y, expectedY[Math.floor(i / 3)])
    assert.equal(plan.alpha, 0.25); assert.equal(plan.rotationRadians, -Math.PI / 2); assert.equal(plan.width, 40); assert.equal(plan.height, 30); assert.equal(plan.tile, null)
  })
  const plan = watermarkLayout(500, 300, createWatermarkSnapshot({ ...D, watermarkType: 'image', watermarkSize: 20 }, logo))
  assert.equal(plan.width, 100); assert.equal(plan.height, 50); assert.deepEqual(plan.center, { x: 430, y: 255 })
})

check('preview scales both axes after integer rounding and never upscales source', () => {
  for (const [width, height, maxWidth, maxHeight] of [[4000, 3000, 301, 600], [3000, 4000, 960, 601], [7, 3, 960, 600], [1, 16000000, 960, 600]]) {
    const size = watermarkPreviewSize(width, height, maxWidth, maxHeight)
    assert.ok(size.width >= 1 && size.width <= maxWidth && size.width <= width); assert.ok(size.height >= 1 && size.height <= maxHeight && size.height <= height)
    assert.equal(size.scaleX * width, size.width); assert.equal(size.scaleY * height, size.height)
  }
})

check('tile geometry retains negative-diagonal origin and checks 10000 draws before allocating any positions', () => {
  const snapshot = createWatermarkSnapshot({ ...D, tileMode: true, fontSize: 10, margin: 0 })
  const within = watermarkLayout(300, 400, snapshot, 10)
  assert.deepEqual(within.tile, { origin: -500, stepX: 10, stepY: 10, columns: 100, rows: 100, draws: 10000 })
  fails(() => watermarkLayout(300, 400, snapshot, 9.999), 'tileLimit')
  // ceil(2*hypot(1,681)/18.7) × ceil(2*hypot(1,681)/10) = 73 × 137 = 10001.
  fails(() => watermarkLayout(1, 681, snapshot, 18.7), 'tileLimit')
  fails(() => watermarkLayout(1, 1, snapshot, 0), 'tileSpacing')
  const counts = watermarkLayout(100, 200, createWatermarkSnapshot({ ...D, tileMode: true, margin: 13, fontSize: 30 }), 70).tile!
  assert.equal(counts.draws, Math.ceil(2 * Math.hypot(100, 200) / 96) * Math.ceil(2 * Math.hypot(100, 200) / 56))
})

check('safe names and selected-current ZIP snapshot preserve Blob references and report excluded selections', () => {
  assert.equal(watermarkOutputName('../folder\\a:b.jpg'), 'a_b_watermarked.png'); assert.equal(watermarkOutputName('..'), 'image_watermarked.png')
  const blob = new Blob(['synthetic'], { type: 'image/png' }), out = { blob, width: 1, height: 1, url: 'blob:one' }
  const rows = [
    { id: '1', file: { name: 'A.jpg' }, status: 'done', key: 'current', out },
    { id: '2', file: { name: 'a.jpg' }, status: 'done', key: 'current', out },
    { id: '3', file: { name: 'third.jpg' }, status: 'error', key: 'current' },
    { id: '4', file: { name: 'old.jpg' }, status: 'done', key: 'old', out },
  ]
  const result = captureWatermarkZip(rows, new Set(['1', '2', '3', '4', 'deleted']), 'current')
  assert.deepEqual(result.snapshot.entries.map(entry => entry.name), ['A_watermarked.png', 'a_watermarked (2).png'])
  assert.equal(result.selectedCount, 5); assert.equal(result.successCount, 2); assert.equal(result.unavailableCount, 3)
  assert.equal(result.snapshot.entries[0].blob, blob); rows[0].out = { ...out, blob: new Blob(['changed']) }; assert.equal(result.snapshot.entries[0].blob, blob)
  assert.ok(Object.isFrozen(result.snapshot.entries)); assert.ok(Object.isFrozen(result.snapshot.entries[0]))
})
console.log(`Watermark pure preparation: ${groups} groups passed; no images decoded`)
