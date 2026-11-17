import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { decodeDiscountComparison, discountComparisonUrl } from '../src/utils/discountComparison.ts'
const require = createRequire(import.meta.url)
const { componentHarness, text: treeText } = require('../docs/verify/2026-11-17-repeat-batch19/component-harness.cjs')
const flush = () => new Promise(resolve => setImmediate(resolve))
const defer = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const plain = value => JSON.parse(JSON.stringify(value))
const has = (node, key, value) => Object.hasOwn(node.props, key) && (value === undefined || node.props[key] === value)
const catalog = language => { const messages = JSON.parse(fs.readFileSync(`messages/${language}.json`, 'utf8')); messages.discountCalculator.comparison = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch33/translations-discount-comparison.json', 'utf8'))[language].discountCalculator.comparison; return messages }
async function fixture({ url = 'https://toolhub.ai.kr/discount-calculator/', hydrate = true, language = 'ko' } = {}) {
  let nextFrame = 0, write = async () => {}, fallback = false, fallbackCalls = 0, selected = '', selectionThrows = false
  const frames = new Map(), writes = [], copies = [], messages = catalog(language), timers = [], pendingTimers = new Map()
  class Field { style = {}; isConnected = true; value = ''; focus() { if (selectionThrows) throw new Error('focus denied') } select() { if (selectionThrows) throw new Error('select denied'); selected = this.value } setSelectionRange() { selected = this.value } remove() {} }
  const navigator = { clipboard: { writeText(value) { copies.push(value); return write(value) } } }
  const h = await componentHarness('src/components/DiscountCalculator.tsx', {
    url, messages,
    modules: { '@/contexts/LanguageContext': { useLanguage: () => ({ language }) }, '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' } },
    globals: { HTMLElement: Field, requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id }, cancelAnimationFrame(id) { frames.delete(id) },
      setTimeout(callback, delay) { const id = timers.length + 1; timers.push({ id, callback, delay }); pendingTimers.set(id, callback); return id }, clearTimeout(id) { pendingTimers.delete(id) },
    },
    navigator,
    document: { activeElement: new Field(), body: { appendChild() {} }, execCommand() { fallbackCalls++; return fallback }, createElement(tag) { assert.equal(tag, 'textarea'); return new Field() } },
    beforeEffects(tree) { const visit = node => { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(visit); if (node.props?.ref && has(node, 'data-discount-basic-manual')) { node.props.ref.current ??= new Field(); node.props.ref.current.value = node.props.value } visit(node.props?.children) }; visit(tree) },
  })
  const initialState = { framework: 'keep', nested: { key: 7 } }, originalReplace = h.window.history.replaceState
  h.window.history.state = initialState
  h.window.history.replaceState = (state, title, href) => { writes.push({ state, href }); h.window.history.state = state; originalReplace(state, title, href) }
  const by = (key, value) => h.find(node => has(node, key, value))
  const comparison = () => h.find(node => typeof node.type === 'function' && node.type.name === 'DiscountComparison').props
  const applyInitial = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); h.render() }
  h.render(); if (hydrate) applyInitial()
  const click = (key, value) => { const node = by(key, value); assert.ok(!node.props.disabled); const result = node.props.onClick(); h.render(); return result }
  const edit = (field, value) => { const node = by('data-discount-basic-field', field); assert.ok(!node.props.disabled); node.props.onChange({ target: { value } }); h.render() }
  return { h, by, comparison, applyInitial, edit, click, copies, writes, initialState, messages, timers, navigator,
    setRows(rows) { comparison().onChange(rows); h.render() },
    editRow(index, field, value) { comparison().onChange(comparison().rows.map((row, i) => i === index ? { ...row, [field]: value } : { ...row })); h.render() },
    navigate(href, event = 'popstate') { originalReplace(h.window.history.state, '', href); h.window.dispatch(event); h.render() },
    async settle() { await flush(); h.render() },
    write(port) { write = port }, fallback(value) { fallback = value }, fallbackCalls: () => fallbackCalls, selected: () => selected, throwSelection() { selectionThrows = true },
  }
}
async function child(parent) {
  const props = { ...parent.comparison(), onChange(next) { parent.comparison().onChange(next); parent.h.render(); Object.assign(props, parent.comparison(), { onChange: props.onChange }) } }
  const h = await componentHarness('src/components/DiscountComparison.tsx', { props, messages: parent.messages, navigator: parent.navigator, document: parent.h.document, modules: { '@/contexts/LanguageContext': { useLanguage: () => ({ language: 'ko' }) }, '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' } } })
  h.render()
  return { h, props, sync() { Object.assign(props, parent.comparison(), { onChange: props.onChange }); h.render() }, click(action) { const button = h.find(node => node.props['data-discount-action'] === action); assert.ok(!button.props.disabled); button.props.onClick(); h.render() }, share: () => h.all().find(node => node.type === 'ShareResult')?.props }
}
let groups = 0
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log('PASS', name) }

await check('initial hydration never writes defaults; restores basic and complete comparison while preserving unknown query, hash and history state', async () => {
  const original = 'https://toolhub.ai.kr/discount-calculator/?mode=finalPrice&original=12345&rate=31&amount=777&final=9000&compare=v1:10,2,3,4;20,1,0,5&keep=a&keep=b#custom'
  const f = await fixture({ url: original, hydrate: false })
  assert.equal(f.writes.length, 0); assert.equal(f.h.window.location.href, original); assert.equal(f.comparison().ready, false); assert.equal(f.by('data-discount-basic-field', 'original').props.value, 100000)
  f.applyInitial(); assert.equal(f.comparison().ready, true); assert.equal(f.comparison().basicPrice, 9000); assert.equal(f.comparison().rows.length, 2)
  assert.equal(f.comparison().rows[0].unitPrice, '10'); assert.ok(f.comparison().rows.every(row => row.name === '')); assert.equal(f.h.window.location.hash, '#custom'); assert.deepEqual(f.h.window.location.searchParams.getAll('keep'), ['a', 'b'])
  assert.equal(f.writes.length, 1); // URLSearchParams canonicalizes literal comma/colon once after restoration.
  f.edit('original', '20000'); assert.equal(f.writes.length, 2); assert.equal(f.writes[0].state, f.initialState); assert.equal(f.h.window.history.state, f.initialState)
  assert.equal(f.h.window.location.searchParams.get('compare'), 'v1:10,2,3,4;20,1,0,5'); f.h.render(); assert.equal(f.writes.length, 2); f.h.cleanup()
})

await check('whole malformed and duplicate comparison URLs retain explicit error and defaults, with no partial restore or basic input loss', async () => {
  for (const suffix of ['compare=v9:10,1,0,0', 'compare=v1:10,1,0,0;20,0,0,0', 'compare=', 'compare=v1:10,1,0,0&compare=v1:20,1,0,0']) {
    const f = await fixture({ url: `https://toolhub.ai.kr/discount-calculator/?original=4321&${suffix}#kept` })
    assert.equal(f.comparison().linkError, true); assert.equal(f.comparison().rows[0].unitPrice, '80000'); assert.equal(f.comparison().rows.length, 2); assert.equal(f.by('data-discount-basic-field', 'original').props.value, 4321)
    const c = await child(f); assert.match(c.h.text(), /비교 링크/); assert.equal(f.h.window.location.searchParams.has('compare'), true)
    f.editRow(0, 'quantity', ''); c.sync(); assert.equal(f.comparison().linkError, false); assert.equal(f.comparison().rows[0].quantity, ''); assert.equal(f.h.window.location.searchParams.has('compare'), false); assert.ok(!c.share()); c.h.cleanup(); f.h.cleanup()
  }
  const zero = await fixture({ url: 'https://toolhub.ai.kr/discount-calculator/?compare=v1:0,1,0,0' }); assert.equal(zero.comparison().linkError, false); assert.equal(zero.comparison().rows[0].unitPrice, '0'); zero.h.cleanup()
})

await check('comparison edits permanently remove old compare, basic/reset never revive it, and unrelated navigation preserves private drafts', async () => {
  const f = await fixture({ url: 'https://toolhub.ai.kr/discount-calculator/?compare=v1:50,1,0,0&keep=yes#first' })
  f.editRow(0, 'name', '비공개 판매처'); f.editRow(0, 'unitPrice', '')
  assert.equal(f.h.window.location.searchParams.has('compare'), false); f.edit('original', '60000'); f.click('data-discount-basic-mode', 'discountAmount'); f.edit('amount', '444')
  assert.equal(f.h.window.location.searchParams.has('compare'), false); const rows = plain(f.comparison().rows), revision = f.comparison().revision
  f.click('data-discount-basic-action', 'reset'); assert.deepEqual(plain(f.comparison().rows), rows); assert.equal(f.comparison().revision, revision); assert.equal(f.h.window.location.searchParams.has('compare'), false)
  f.navigate(f.h.window.location.href.replace('#first', '#other'), 'hashchange'); assert.deepEqual(plain(f.comparison().rows), rows); assert.equal(new URL(f.comparison().baseUrl).hash, '#other')
  f.navigate(f.h.window.location.href, 'popstate'); assert.deepEqual(plain(f.comparison().rows), rows); assert.equal(f.h.window.location.searchParams.get('keep'), 'yes'); assert.ok(!decodeURIComponent(f.h.window.location.href).includes('비공개')); f.h.cleanup()
})

await check('three original modes and sequential discount formulas remain intact; current-price import is rounded once and independent', async () => {
  const f = await fixture(); assert.equal(f.comparison().basicPrice, 80000); assert.equal(f.comparison().multiPrice, 72000)
  f.edit('original', '100.5'); f.edit('rate', '25'); assert.equal(f.comparison().basicPrice, 75.375)
  f.click('data-discount-basic-mode', 'finalPrice'); f.edit('final', '50.5'); assert.equal(f.comparison().basicPrice, 50.5)
  const c = await child(f); c.click('import-basic'); assert.equal(f.comparison().rows[2].unitPrice, '51')
  f.edit('final', '101'); c.sync(); assert.equal(f.comparison().basicPrice, null); assert.ok(c.h.find(node => node.props['data-discount-action'] === 'import-basic').props.disabled)
  f.click('data-discount-basic-mode', 'discountAmount'); f.edit('amount', '20.2'); assert.equal(f.comparison().basicPrice, 80.3); f.edit('amount', '200'); assert.equal(f.comparison().basicPrice, 0)
  f.click('data-discount-multi-add'); f.by('data-discount-multi-rate', 0).props.onChange({ target: { value: '30' } }); f.h.render(); f.by('data-discount-multi-rate', 1).props.onChange({ target: { value: '15' } }); f.h.render()
  const expected = ((100.5 - 100.5 * .3) - (100.5 - 100.5 * .3) * .15) * .9
  assert.ok(Math.abs(f.comparison().multiPrice - expected) < 1e-12); c.sync(); c.click('import-multi'); assert.equal(f.comparison().rows[3].unitPrice, String(Math.round(expected)))
  f.edit('original', '0'); c.sync(); assert.equal(f.comparison().basicPrice, 0); assert.equal(f.comparison().multiPrice, 0); assert.equal(f.comparison().rows[2].unitPrice, '51'); assert.equal(f.comparison().rows[3].unitPrice, String(Math.round(expected))); assert.ok(!f.h.text().includes('NaN')); c.h.cleanup(); f.h.cleanup()
})

await check('explicit basic and complete comparison links are distinct; fresh receiving parent reproduces numeric rows and every main parameter without names', async () => {
  const f = await fixture({ url: 'https://toolhub.ai.kr/discount-calculator/?mode=discountAmount&original=15000&rate=17&amount=2000&final=13000&keep=1#result' })
  f.editRow(0, 'name', 'PRIVATE SHOP'); const c = await child(f), shared = c.share(); assert.equal(shared.card.rows.length, 2); assert.ok(shared.text.includes('PRIVATE SHOP')); assert.ok(!decodeURIComponent(shared.url).includes('PRIVATE SHOP'))
  assert.equal(new URL(shared.url).searchParams.get('compare'), 'v1:80000,1,0,0;76000,1,0,5000'); assert.equal(new URL(shared.url).hash, '#result')
  f.click('data-discount-basic-action', 'copy-link'); await f.settle(); const basic = new URL(f.copies.at(-1)); assert.equal(basic.searchParams.has('compare'), false); assert.equal(basic.searchParams.get('keep'), '1'); assert.equal(basic.hash, '#result')
  const restored = await fixture({ url: shared.url }); assert.equal(restored.comparison().basicPrice, 13000); const fields = ['unitPrice', 'quantity', 'coupon', 'shipping']
  assert.deepEqual(plain(restored.comparison().rows.map(row => fields.map(field => row[field]))), plain(f.comparison().rows.map(row => fields.map(field => row[field])))); assert.ok(restored.comparison().rows.every(row => row.name === ''))
  for (const key of ['mode', 'original', 'rate', 'amount', 'final', 'keep']) assert.equal(restored.h.window.location.searchParams.get(key), basic.searchParams.get(key))
  const key = shared.resultKey; f.edit('original', '16000'); c.sync(); assert.notEqual(c.share().resultKey, key); const editedKey = c.share().resultKey; f.edit('original', '15000'); c.sync(); assert.notEqual(c.share().resultKey, editedKey)
  restored.h.cleanup(); c.h.cleanup(); f.h.cleanup()
})

await check('basic clipboard failures expose exact manual text and retry; edits, comparison revisions, newer requests and unmount silence old operations', async () => {
  const f = await fixture(), first = defer(); f.write(() => first.promise); f.click('data-discount-basic-action', 'copy-link'); f.edit('original', '222'); first.reject(new Error('late')); await f.settle(); assert.equal(f.fallbackCalls(), 0); assert.ok(!f.h.all().some(node => has(node, 'data-discount-basic-manual')))
  const second = defer(); f.write(() => second.promise); f.click('data-discount-basic-copy', 'final'); f.editRow(0, 'name', 'new'); second.reject(new Error('late compare')); await f.settle(); assert.equal(f.fallbackCalls(), 0)
  f.write(async () => { throw new Error('denied') }); f.fallback(false); f.click('data-discount-basic-action', 'copy-link'); await f.settle(); const manual = f.by('data-discount-basic-manual'); assert.equal(manual.props.readOnly, true); assert.equal(manual.props.value, f.copies.at(-1)); assert.ok(!new URL(manual.props.value).searchParams.has('compare'))
  f.write(async () => {}); f.click('data-discount-basic-retry'); await f.settle(); assert.ok(!f.h.all().some(node => has(node, 'data-discount-basic-manual')))
  const timer = f.timers.at(-1); f.click('data-discount-basic-copy', 'original'); await f.settle(); timer.callback(); f.h.render(); assert.equal(f.by('data-discount-basic-copy', 'original').props.children.type, 'icon:Check')
  const last = defer(); f.write(() => last.promise); f.click('data-discount-basic-action', 'copy-link'); f.h.cleanup(); last.reject(new Error('unmounted')); await flush(); assert.equal(f.fallbackCalls(), 1)
})

await check('KO and EN composition preserve missing raw input and whole-only export while comparison URL decoder rejects unsupported payload', async () => {
  for (const language of ['ko', 'en']) {
    const f = await fixture({ language }), c = await child(f); assert.ok(c.share()); f.editRow(0, 'shipping', ''); c.sync(); assert.equal(f.comparison().rows[0].shipping, ''); assert.ok(!c.share()); assert.ok(c.h.find(node => node.props['data-discount-action'] === 'copy').props.disabled)
    assert.equal(discountComparisonUrl(f.comparison().baseUrl, f.comparison().rows), null); f.editRow(0, 'shipping', '0'); c.sync(); assert.ok(c.share()); assert.equal(decodeDiscountComparison(new URL(c.share().url).searchParams.get('compare')).kind, 'ready'); c.h.cleanup(); f.h.cleanup()
  }
})

await check('basic/comparison clipboard ownership is bidirectional, and basic manual selection failures preserve recovery', async () => {
  const f = await fixture(), c = await child(f), basic = defer()
  f.write(() => basic.promise); f.click('data-discount-basic-action', 'copy-link'); c.sync(); f.write(async () => {}); c.click('copy'); await f.settle(); c.sync(); assert.ok(!f.copies.at(-1).startsWith('https:'))
  basic.reject(new Error('old basic')); await f.settle(); assert.equal(f.fallbackCalls(), 0); assert.ok(!f.h.all().some(node => has(node, 'data-discount-basic-manual')))
  const comparison = defer(); f.write(() => comparison.promise); c.click('copy'); f.write(async () => {}); f.click('data-discount-basic-action', 'copy-link'); c.sync(); await f.settle(); c.sync(); comparison.reject(new Error('old comparison')); await f.settle(); c.sync(); assert.equal(f.fallbackCalls(), 0); assert.ok(f.copies.at(-1).startsWith('https:')); assert.ok(!c.h.all().some(node => has(node, 'data-discount-feedback')))
  const basicBeforeShare = defer(); f.write(() => basicBeforeShare.promise); f.click('data-discount-basic-copy', 'original'); c.sync(); c.h.find(node => has(node, 'data-discount-share-boundary')).props.onClickCapture(); f.h.render(); basicBeforeShare.reject(new Error('old before share')); await f.settle(); assert.equal(f.fallbackCalls(), 0)
  f.write(async () => { throw new Error('denied') }); f.click('data-discount-basic-action', 'copy-link'); await f.settle(); const manual = f.by('data-discount-basic-manual'), value = manual.props.value
  assert.doesNotThrow(() => manual.props.onFocus({ target: { select() { throw new Error('selection denied') } } })); f.h.render(); f.throwSelection(); assert.doesNotThrow(() => f.click('data-discount-basic-select')); assert.equal(f.by('data-discount-basic-manual').props.value, value); assert.match(f.h.text(), /직접 선택/); c.h.cleanup(); f.h.cleanup()
})
await check('completed basic success and failure cannot reappear after equal-value input round trips and old timers', async () => {
  const f = await fixture(); f.click('data-discount-basic-copy', 'original'); await f.settle(); const oldTimer = f.timers.at(-1)
  assert.equal(f.by('data-discount-basic-copy', 'original').props.children.type, 'icon:Check'); f.edit('original', '123'); oldTimer.callback(); f.h.render(); f.edit('original', '100000')
  assert.equal(f.by('data-discount-basic-copy', 'original').props.children.type, 'icon:Copy')
  f.write(async () => { throw new Error('denied') }); f.click('data-discount-basic-action', 'copy-link'); await f.settle(); assert.ok(f.by('data-discount-basic-manual')); f.edit('original', '123'); f.edit('original', '100000')
  assert.ok(!f.h.all().some(node => has(node, 'data-discount-basic-manual'))); f.write(async () => {}); f.click('data-discount-basic-action', 'copy-link'); await f.settle(); assert.match(treeText(f.by('data-discount-basic-action', 'copy-link')), /복사/); f.h.cleanup()
})
console.log(`Discount comparison parent: ${groups} groups passed`)
