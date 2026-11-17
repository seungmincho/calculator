import assert from 'node:assert/strict'
import fs from 'node:fs'
import { colorFixture, by } from './color-parent-harness.mjs'
const results = []
async function test(name, run, options) { const f = await colorFixture(options); try { await run(f); results.push({ name, pass: true }) } finally { f.close() } }
const current = f => by(f.parent, 'data-color-workspace').props['data-color-last-valid']
const output = (f, status) => f.parent.all().filter(node => node.props?.['data-color-output'] === status)
await test('original shorthand and invalid draft failures retain all five exact representations', async f => {
  await f.start(); await f.edit('#f0f')
  assert.equal(current(f), '#FF00FF')
  const expected = ['#FF00FF', 'rgb(255, 0, 255)', 'hsl(300, 100%, 50%)', 'hsv(300, 100%, 100%)', 'cmyk(0%, 100%, 0%, 0%)']
  for (const [index, key] of ['hex', 'rgb', 'hsl', 'hsv', 'cmyk'].entries()) {
    await f.click('data-color-copy', key); assert.equal(f.copied.at(-1), expected[index])
  }
  await f.edit('#f'); assert.equal(current(f), '#FF00FF')
  assert.equal(by(f.parent, 'data-color-picker').props.value, '#FF00FF')
  assert.equal(f.parent.all().filter(node => Object.hasOwn(node.props ?? {}, 'data-color-channel')).length, 6)
  assert.equal(f.parent.all().filter(node => Object.hasOwn(node.props ?? {}, 'data-color-value')).length, 5)
  await f.click('data-color-copy', 'rgb'); assert.equal(f.copied.at(-1), 'rgb(255, 0, 255)')
})
await test('alpha, CSS, Unicode and long drafts never truncate into valid RGB or rewrite URL', async f => {
  await f.start(); await f.edit('#123456'); const url = f.parent.window.location.href, writes = f.writes.length
  for (const value of ['#1234', '#12345678', 'rgb(255, 0, 0)', '１２３', '#123456' + 'a'.repeat(4000), '']) {
    await f.edit(value)
    assert.equal(by(f.parent, 'id', 'color-hex').props.value, value)
    assert.equal(by(f.parent, 'id', 'color-hex').props.maxLength, undefined)
    assert.equal(by(f.parent, 'id', 'color-hex').props['aria-invalid'], true)
    assert.equal(current(f), '#123456'); assert.equal(f.parent.window.location.href, url)
  }
  assert.equal(f.writes.length, writes)
  await f.click('data-color-restore'); assert.equal(by(f.parent, 'id', 'color-hex').props.value, '#123456')
})
await test('failed native and legacy copy is honest; manual focus reentry cannot restore stale output', async f => {
  await f.start(); f.mode('no'); f.legacy(false); await f.click('data-color-copy', 'cmyk')
  assert.equal(output(f, 'copied').length, 0); assert.equal(output(f, 'failed').length, 1)
  assert.equal(by(f.parent, 'id', 'color-copy-manual').props.value, f.copied.at(-1))
  const oldRetry = by(f.parent, 'data-color-recovery-action', 'retry').props.onClick
  f.selectionHook(() => by(f.parent, 'id', 'color-hex').props.onChange({ target: { value: '#fff' } }))
  await f.click('data-color-recovery-action', 'select')
  assert.equal(current(f), '#FFFFFF'); assert.equal(output(f, 'failed').length, 0)
  const count = f.copied.length; oldRetry(); await f.sync(); assert.equal(f.copied.length, count)
})
await test('input and locale ABA prevent stale fallback and copied status', async f => {
  await f.start(); f.mode('wait'); await f.click('data-color-copy', 'hex')
  const first = f.pending.at(-1); await f.edit('#fff'); await f.edit('#3B82F6'); first.reject(new Error('late'))
  await f.sync(); assert.equal(f.legacyCalls, 0); assert.equal(output(f, 'failed').length + output(f, 'copied').length, 0)
  await f.click('data-color-copy', 'rgb'); const second = f.pending.at(-1)
  await f.locale('en'); await f.locale('ko'); second.resolve(); await f.sync()
  assert.equal(output(f, 'copied').length, 0)
})
await test('share image and direct copy invalidate each other without late downloads', async f => {
  await f.start(); await f.shareAction('save'); const image = f.images.at(-1)
  await f.click('data-color-copy', 'hex'); image.resolve(new Blob(['old image'], { type: 'image/png' })); await f.sync()
  assert.equal(f.files.length, 0)
  f.mode('wait'); await f.click('data-color-copy', 'rgb'); const own = f.pending.at(-1)
  await f.shareAction('copy'); own.reject(new Error('late own failure')); await f.sync()
  assert.equal(f.legacyCalls, 0); assert.equal(output(f, 'failed').length, 0)
  f.pending.at(-1).resolve(); await f.sync()
})
await test('initial URL canonicalizes only owned color and preserves unrelated duplicate query/hash/state', async f => {
  await f.start(); assert.equal(current(f), '#AABBCC')
  const url = new URL(f.parent.window.location.href)
  assert.deepEqual(url.searchParams.getAll('tag'), ['one', 'two']); assert.equal(url.hash, '#result'); assert.equal(url.searchParams.get('color'), 'AABBCC')
  assert.ok(f.writes.every(write => write.state === f.historyState))
  await f.edit('#ab'); const draft = by(f.parent, 'id', 'color-hex').props.value
  url.hash = '#another'; await f.pop(url.href); assert.equal(by(f.parent, 'id', 'color-hex').props.value, draft)
}, { url: 'https://toolhub.ai.kr/color-converter/?tag=one&color=%23abc&tag=two#result' })
await test('early edit beats hydration; duplicate color URL does not silently choose a value', async f => {
  await f.edit('#fed'); await f.start(); assert.equal(current(f), '#FFEEDD')
  assert.equal(new URL(f.parent.window.location.href).searchParams.get('color'), 'FFEEDD')
  await f.pop('https://toolhub.ai.kr/color-converter/?color=000&color=fff#dup')
  assert.equal(current(f), '#FFEEDD'); assert.equal(by(f.parent, 'data-color-query-error').props['data-color-query-error'], 'invalid')
}, { url: 'https://toolhub.ai.kr/color-converter/?color=%23000#first' })
await test('random includes both endpoints and unmount blocks pending completion', async f => {
  await f.start(); f.random(0); await f.click('data-color-random'); assert.equal(current(f), '#000000')
  f.random(1 - Number.EPSILON); await f.click('data-color-random'); assert.equal(current(f), '#FFFFFF')
  f.mode('wait'); await f.click('data-color-copy', 'hex'); const old = f.pending.at(-1); f.close(); old.reject(new Error('after unmount'))
  await new Promise(resolve => setImmediate(resolve)); assert.equal(f.legacyCalls, 0)
})
fs.writeFileSync('docs/verify/2026-11-17-repeat-batch53/independent-parent.json', JSON.stringify({ source: 'Independent assertions against actual ColorConverter + ShareResult. Author hook/DOM/clipboard fixture reused; no native-browser claim.', results }, null, 2) + '\n')
console.log(`Color converter independent parent: ${results.length}/${results.length} PASS`)
