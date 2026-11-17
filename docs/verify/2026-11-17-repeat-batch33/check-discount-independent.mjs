import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { evaluateDiscountComparison, captureDiscountComparison, encodeDiscountComparison, decodeDiscountComparison } from '../../../src/utils/discountComparison.ts'

const plain = value => JSON.parse(JSON.stringify(value))
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve() }
const row = (id, price, quantity, coupon, shipping, name = '') => ({ id, name, unitPrice: String(price), quantity: String(quantity), coupon: String(coupon), shipping: String(shipping) })
const messages = Object.fromEntries(['ko', 'en'].map(locale => {
  const source = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'))
  source.discountCalculator.comparison = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch33/translations-discount-comparison.json', 'utf8'))[locale].discountCalculator.comparison
  return [locale, source]
}))

async function fixture(url = 'https://toolhub.ai.kr/discount-calculator/', restore = true) {
  let language = 'ko', sequence = 0, writePort = async () => {}, legacyValue = false, renderPort = async () => new Blob(['independent image'])
  const frames = new Map(), writes = [], copies = [], legacy = [], urls = [], revoked = [], downloads = [], timers = []
  const translate = namespace => {
    const lookup = key => key.split('.').reduce((object, part) => object?.[part], messages[language][namespace])
    const t = (key, vars = {}) => {
      const value = lookup(key)
      assert.equal(typeof value, 'string', `${language}.${namespace}.${key}`)
      return value.replace(/\{(\w+)\}/g, (_match, name) => String(vars[name] ?? `{${name}}`))
    }
    t.raw = lookup
    return t
  }
  class Field { value = ''; style = {}; isConnected = true; focus() { document.activeElement = this } select() {} setSelectionRange() {} remove() { this.isConnected = false } }
  const document = { activeElement: new Field(), body: { appendChild() {} }, execCommand() { legacy.push('copy'); return legacyValue }, createElement(tag) { if (tag === 'textarea') return new Field(); return { click() { downloads.push({ url: this.href, filename: this.download }) }, remove() {} } } }
  class ObjectURL extends URL {
    static createObjectURL(blob) { const value = `blob:independent-${urls.length}`; urls.push({ value, blob }); return value }
    static revokeObjectURL(value) { revoked.push(value) }
  }
  const navigator = { clipboard: { writeText(value) { copies.push(value); return writePort(value) } } }
  const modules = { '@/lib/i18n': { useTranslations: translate }, '@/lib/i18n/shared': { useTranslations: translate }, '@/contexts/LanguageContext': { useLanguage: () => ({ language }) }, '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' }, '@/utils/shareCard': { renderShareCard: card => renderPort(card) } }
  const beforeEffects = tree => {
    const visit = node => { if (Array.isArray(node)) return node.forEach(visit); if (!node || typeof node !== 'object') return; if (node.type === 'textarea' && node.props.ref) { const field = new Field(); field.value = node.props.value; node.props.ref.current = field } visit(node.props?.children) }
    visit(tree)
  }
  const base = { url, modules, navigator, document, beforeEffects, globals: { File, HTMLElement: Field, URL: ObjectURL, requestAnimationFrame(callback) { const id = ++sequence; frames.set(id, callback); return id }, cancelAnimationFrame(id) { frames.delete(id) } } }
  const parent = await componentHarness('src/components/DiscountCalculator.tsx', base)
  const originalReplace = parent.window.history.replaceState, historyState = { preserved: ['framework', 33] }
  parent.window.history.state = historyState
  parent.window.history.replaceState = (state, title, href) => { writes.push(href); parent.window.history.state = state; originalReplace(state, title, href) }
  parent.render()
  const comparisonProps = () => parent.find(node => typeof node.type === 'function' && node.type.name === 'DiscountComparison').props
  const apply = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(100)); parent.render() }
  if (restore) apply()
  const child = await componentHarness('src/components/DiscountComparison.tsx', { ...base, props: comparisonProps() })
  child.render()
  let share = null
  const shareProps = () => child.all().find(node => node.type === 'ShareResult')?.props
  if (shareProps()) { share = await componentHarness('src/components/ShareResult.tsx', { ...base, props: shareProps() }); share.render() }
  for (const [name, host] of [['parent', parent], ['child', child], ['share', share]]) {
    if (!host) continue
    const original = host.context.setTimeout
    host.context.setTimeout = (callback, delay) => { const id = original(callback, delay); timers.push({ name, callback, delay }); return id }
  }
  const sync = () => { parent.render(); child.setProps(comparisonProps()); if (share && shareProps()) share.setProps(shareProps()); else if (share && !shareProps()) { share.cleanup(); share = null } }
  const by = (host, key, value) => host.find(node => Object.hasOwn(node.props, key) && (value === undefined || node.props[key] === value))
  const parentClick = (key, value) => { const node = by(parent, key, value); assert.ok(!node.props.disabled); const result = node.props.onClick(); sync(); return result }
  const childClick = value => { const node = by(child, 'data-discount-action', value); assert.ok(!node.props.disabled); const result = node.props.onClick(); sync(); return result }
  return { parent, child, get share() { return share }, shareProps, comparisonProps, sync, apply, frames, writes, copies, legacy, urls, revoked, downloads, timers, historyState, by,
    edit(field, value) { by(parent, 'data-discount-basic-field', field).props.onChange({ target: { value } }); sync() },
    editRow(id, field, value) { const input = child.find(node => node.props['data-discount-id'] === id && node.props['data-discount-field'] === field); input.props.onChange({ target: { value } }); sync() },
    parentClick, childClick,
    setRows(rows) { comparisonProps().onChange(rows); sync() },
    locale(value) { language = value; sync() },
    navigate(href, event = 'popstate') { originalReplace(historyState, '', href); parent.window.dispatch(event); sync() },
    write(port) { writePort = port }, fallback(value) { legacyValue = value }, image(port) { renderPort = port },
    async settle() { await flush(); sync() },
    cleanup() { share?.cleanup(); child.cleanup(); parent.cleanup() },
    shareClick(action) {
      const boundary = child.all().find(node => Object.hasOwn(node.props, 'data-discount-share-boundary'))
      boundary?.props.onClickCapture()
      const node = by(share, 'data-share-action', action); assert.ok(!node.props.disabled); const result = node.props.onClick(); sync(); return result
    },
  }
}

let groups = 0
async function group(name, run) {
  if (process.argv.includes('--copy-only') && !/late native refusal|newest manual|actual TXT|A-B-A/.test(name)) return
  await run(); groups++; console.log(`PASS ${name}`)
}

await group('independent BigInt oracle for 700 four-condition comparisons, ties and fractional winners', () => {
  let seed = 0x33c0ffee
  const random = limit => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % limit }
  for (let scenario = 0; scenario < 700; scenario++) {
    const drafts = Array.from({ length: 4 }, (_, index) => row(`r${index}`, random(1000000001), 1 + random(999), random(1000000) * 1000000, random(10000001)))
    const expected = drafts.map(draft => {
      const subtotal = BigInt(draft.unitPrice) * BigInt(draft.quantity), coupon = BigInt(draft.coupon), applied = coupon > subtotal ? subtotal : coupon
      return { total: subtotal - applied + BigInt(draft.shipping), quantity: BigInt(draft.quantity), applied, excess: coupon - applied, subtotal }
    })
    const actual = evaluateDiscountComparison(drafts)
    assert.equal(actual.allReady, true)
    expected.forEach((value, index) => {
      const r = actual.rows[index].result
      assert.equal(BigInt(r.total), value.total); assert.equal(BigInt(r.appliedCoupon), value.applied); assert.equal(BigInt(r.excessCoupon), value.excess); assert.equal(BigInt(r.subtotal), value.subtotal)
    })
    const bestTotal = expected.filter(a => expected.every(b => a.total <= b.total))
    const totals = drafts.filter((_d, i) => bestTotal.includes(expected[i])).map(d => d.id)
    const units = drafts.filter((_d, i) => expected.every(b => expected[i].total * b.quantity <= b.total * expected[i].quantity)).map(d => d.id)
    assert.deepEqual(plain(actual.lowestTotalIds), totals); assert.deepEqual(plain(actual.lowestUnitIds), units)
  }
  const opposite = evaluateDiscountComparison([row('one', 1200, 1, 0, 0), row('three', 900, 3, 0, 300)])
  assert.deepEqual(plain(opposite.lowestTotalIds), ['one']); assert.deepEqual(plain(opposite.lowestUnitIds), ['three'])
  const fraction = evaluateDiscountComparison([row('a', 0, 999, 0, 1), row('b', 0, 998, 0, 1)])
  assert.deepEqual(plain(fraction.lowestTotalIds), ['a', 'b']); assert.deepEqual(plain(fraction.lowestUnitIds), ['a'])
  assert.equal(fraction.rows[0].result.unitAverage.toFixed(2), fraction.rows[1].result.unitAverage.toFixed(2))
})

await group('URL numeric projection and whole-only invalid input preserve draft text', () => {
  const rows = [row('private-id', '00050', 2, 200, 7, 'PRIVATE\n한글😀'), row('other', 0, 1, 0, 0)]
  assert.equal(encodeDiscountComparison(rows), 'v1:50,2,200,7;0,1,0,0')
  const decoded = decodeDiscountComparison(encodeDiscountComparison(rows)); assert.equal(decoded.kind, 'ready'); assert.ok(decoded.rows.every(value => value.name === ''))
  const captured = captureDiscountComparison(rows); rows[0].name = 'new'; assert.equal(captured.rows[0].name, 'PRIVATE 한글😀')
  for (const value of ['', ' ', '-1', '1.2', '1e3', 'Infinity', '1000000001']) {
    const inputs = [row('a', 5, 1, 0, 0), row('b', value, 1, 0, 0)], before = JSON.stringify(inputs)
    assert.equal(evaluateDiscountComparison(inputs).allReady, false); assert.equal(captureDiscountComparison(inputs), null)
    assert.deepEqual(plain(evaluateDiscountComparison(inputs).lowestTotalIds), []); assert.equal(JSON.stringify(inputs), before)
  }
  for (const payload of ['v2:1,1,0,0', 'v1:1,0,0,0', 'v1:1,1,0,0;2,1,0', 'v1:' + '1,1,0,0;'.repeat(5), 'v1:' + '0'.repeat(256)]) assert.equal(decodeDiscountComparison(payload).kind, 'invalid')
})

await group('actual parent initial URL, Strict mount replay and editing preserve owned query rules', async () => {
  const url = 'https://toolhub.ai.kr/discount-calculator/?mode=finalPrice&original=800&final=611&amount=17&rate=33&compare=v1:10,2,3,4;99,1,0,0&keep=one&keep=two#anchor'
  const f = await fixture(url, false)
  assert.equal(f.writes.length, 0); assert.equal(f.comparisonProps().ready, false)
  assert.equal(f.by(f.parent, 'data-discount-basic-field', 'original').props.disabled, true)
  f.parent.replayEffects(); f.parent.replayEffects(); assert.equal(f.frames.size, 1)
  f.apply(); f.sync(); assert.equal(f.comparisonProps().basicPrice, 611)
  assert.equal(f.comparisonProps().rows[0].unitPrice, '10'); assert.equal(f.comparisonProps().rows[1].unitPrice, '99')
  assert.deepEqual(f.parent.window.location.searchParams.getAll('keep'), ['one', 'two']); assert.equal(f.parent.window.location.hash, '#anchor'); assert.equal(f.parent.window.history.state, f.historyState)
  f.edit('original', '1200'); assert.equal(f.parent.window.location.searchParams.get('compare'), 'v1:10,2,3,4;99,1,0,0')
  f.editRow('condition-1', 'name', 'PRIVATE condition'); f.editRow('condition-2', 'coupon', '')
  assert.equal(f.parent.window.location.searchParams.has('compare'), false)
  const draft = plain(f.comparisonProps().rows); f.parentClick('data-discount-basic-action', 'reset')
  assert.deepEqual(plain(f.comparisonProps().rows), draft); assert.equal(f.parent.window.location.searchParams.has('compare'), false)
  f.navigate(f.parent.window.location.href.replace('#anchor', '#other'), 'hashchange')
  assert.deepEqual(plain(f.comparisonProps().rows), draft); assert.equal(decodeURIComponent(f.parent.window.location.href).includes('PRIVATE'), false)
  f.cleanup()
})

await group('actual original three modes and sequential discounts import only the click-time rounded price', async () => {
  const f = await fixture()
  f.edit('original', '1234.5'); f.edit('rate', '17')
  assert.equal(f.comparisonProps().basicPrice, 1234.5 * 0.83)
  f.childClick('import-basic'); const imported = f.comparisonProps().rows[2]
  assert.equal(imported.unitPrice, String(Math.round(1234.5 * 0.83)))
  f.parentClick('data-discount-basic-mode', 'finalPrice'); f.edit('final', '400.75'); assert.equal(f.comparisonProps().basicPrice, 400.75)
  f.edit('final', '9999'); assert.equal(f.comparisonProps().basicPrice, null)
  assert.equal(f.by(f.child, 'data-discount-action', 'import-basic').props.disabled, true)
  f.parentClick('data-discount-basic-mode', 'discountAmount'); f.edit('amount', '234.25'); assert.equal(f.comparisonProps().basicPrice, 1000.25)
  f.edit('amount', '5000'); assert.equal(f.comparisonProps().basicPrice, 0)
  f.by(f.parent, 'data-discount-multi-rate', 0).props.onChange({ target: { value: '25' } }); f.sync()
  f.by(f.parent, 'data-discount-multi-rate', 1).props.onChange({ target: { value: '50' } }); f.sync()
  f.parentClick('data-discount-multi-add'); assert.equal(f.comparisonProps().multiPrice, 1234.5 * 0.75 * 0.5 * 0.9)
  f.childClick('import-multi'); assert.equal(f.comparisonProps().rows[3].unitPrice, String(Math.round(1234.5 * 0.75 * 0.5 * 0.9)))
  f.edit('original', '0'); assert.equal(f.comparisonProps().rows[2].unitPrice, imported.unitPrice); assert.equal(f.by(f.child, 'data-discount-action', 'add').props.disabled, true)
  assert.equal(f.comparisonProps().multiPrice, 0); f.cleanup()
})

await group('actual incomplete/zero rows, invalid link and locale preserve raw input and suppress whole export', async () => {
  const f = await fixture('https://toolhub.ai.kr/discount-calculator/?original=321&compare=v1:2,1,0,0&compare=v1:3,1,0,0')
  assert.equal(f.comparisonProps().linkError, true); assert.equal(f.comparisonProps().rows.length, 2)
  assert.equal(f.by(f.parent, 'data-discount-basic-field', 'original').props.value, 321)
  f.editRow('condition-1', 'shipping', ''); assert.equal(f.comparisonProps().rows[0].shipping, '')
  assert.equal(f.by(f.child, 'data-discount-action', 'copy').props.disabled, true); assert.equal(f.shareProps(), undefined)
  assert.equal(f.child.all().some(node => node.props['data-discount-lowest']), false)
  f.locale('en'); assert.equal(f.comparisonProps().rows[0].shipping, ''); assert.equal(f.comparisonProps().linkError, false)
  f.editRow('condition-1', 'shipping', '0'); f.editRow('condition-1', 'unitPrice', '0')
  assert.equal(f.by(f.child, 'data-discount-action', 'copy').props.disabled, false)
  assert.equal(f.by(f.child, 'data-discount-value', 'total').props.children, '0 KRW')
  assert.ok(!new URL(f.shareProps().url).searchParams.get('compare').includes('PRIVATE'))
  const restored = await fixture(f.shareProps().url); assert.deepEqual(plain(restored.comparisonProps().rows.map(({ unitPrice, quantity, coupon, shipping }) => ({ unitPrice, quantity, coupon, shipping }))), plain(f.comparisonProps().rows.map(({ unitPrice, quantity, coupon, shipping }) => ({ unitPrice, quantity, coupon, shipping }))))
  restored.cleanup(); f.cleanup()
})

await group('actual parent, comparison and ShareResult supersede both directions of late native refusal', async () => {
  for (const [oldTarget, nextTarget] of [['basic', 'comparison'], ['comparison', 'basic'], ['comparison', 'share'], ['share', 'comparison'], ['basic', 'share'], ['share', 'basic']]) {
    const f = await fixture(), wait = deferred()
    const invoke = target => target === 'basic' ? f.parentClick('data-discount-basic-copy', 'original') : target === 'comparison' ? f.childClick('copy') : f.shareClick('copy')
    f.write(() => wait.promise); const old = invoke(oldTarget)
    f.write(async () => {}); await invoke(nextTarget); await f.settle()
    const latestText = f.copies.at(-1)
    wait.reject(new Error('old native refusal')); await old; await f.settle()
    assert.equal(f.legacy.length, 0, `${oldTarget} -> ${nextTarget}`); assert.equal(f.copies.at(-1), latestText)
    assert.equal(f.parent.all().some(node => Object.hasOwn(node.props, 'data-discount-basic-manual')), false)
    assert.equal(f.child.all().some(node => Object.hasOwn(node.props, 'data-discount-manual')), false)
    assert.equal(f.share.all().some(node => Object.hasOwn(node.props, 'data-share-recovery')), false)
    f.cleanup()
  }
})

await group('native/legacy outcomes and old timers preserve the newest manual recovery across components', async () => {
  const f = await fixture()
  f.childClick('copy'); await f.settle()
  const childTimer = f.timers.filter(timer => timer.name === 'child' && timer.delay === 2000).at(-1)
  f.shareClick('copy'); await f.settle()
  const shareTimer = f.timers.filter(timer => timer.name === 'share' && timer.delay === 2000).at(-1)
  f.parentClick('data-discount-basic-copy', 'final'); await f.settle()
  const parentTimer = f.timers.filter(timer => timer.name === 'parent' && timer.delay === 2000).at(-1)
  f.write(async () => { throw new Error('denied') }); f.fallback(false)
  f.childClick('copy'); await f.settle()
  const expected = f.copies.at(-1)
  childTimer.callback(); shareTimer.callback(); parentTimer.callback(); f.sync()
  const manual = f.by(f.child, 'data-discount-manual'); assert.equal(manual.props.value, expected); assert.equal(manual.props.readOnly, true)
  assert.equal(f.legacy.length, 1)
  f.fallback(true); f.childClick('copy'); await f.settle(); assert.equal(f.child.all().some(node => Object.hasOwn(node.props, 'data-discount-manual')), false)
  f.fallback(false); f.parentClick('data-discount-basic-copy', 'final'); await f.settle()
  assert.equal(f.by(f.parent, 'data-discount-basic-manual').props.value, f.copies.at(-1))
  f.write(async () => {}); f.parentClick('data-discount-basic-retry'); await f.settle()
  assert.equal(f.parent.all().some(node => Object.hasOwn(node.props, 'data-discount-basic-manual')), false)
  f.cleanup()
})

await group('actual TXT bytes match complete copy; old shared renderer and unmount cannot add outputs', async () => {
  const f = await fixture()
  f.editRow('condition-1', 'name', 'PRIVATE 한글😀')
  f.childClick('copy'); await f.settle(); const text = f.copies.at(-1)
  assert.ok(text.includes('PRIVATE 한글😀'))
  const image = deferred(); f.image(() => image.promise); const old = f.shareClick('save')
  f.childClick('txt'); assert.equal(f.downloads.length, 1); assert.equal(f.downloads[0].filename, 'discount-comparison.txt')
  assert.equal(await f.urls[0].blob.text(), text)
  assert.deepEqual(new Uint8Array(await f.urls[0].blob.arrayBuffer()), new TextEncoder().encode(text))
  image.resolve(new Blob(['old image'])); await old; await f.settle(); assert.equal(f.downloads.length, 1)
  const shareUrl = new URL(f.shareProps().url); assert.equal(decodeURIComponent(shareUrl.href).includes('PRIVATE'), false)
  const wait = deferred(); f.write(() => wait.promise); const pending = f.childClick('copy'); f.cleanup()
  wait.reject(new Error('after unmount')); await pending; await flush(); assert.equal(f.legacy.length, 0)
  assert.deepEqual(f.revoked, f.urls.map(value => value.value))
})

await group('A-B-A input and language round trips never resurrect obsolete copy feedback', async () => {
  const results = []
  for (const target of ['basic', 'comparison']) for (const boundary of ['input', 'locale']) {
    const f = await fixture()
    if (target === 'basic') f.parentClick('data-discount-basic-copy', 'original'); else f.childClick('copy')
    await f.settle()
    const before = target === 'basic' ? f.by(f.parent, 'data-discount-basic-copy', 'original').props.children.type === 'icon:Check' : f.child.all().some(node => Object.hasOwn(node.props, 'data-discount-feedback'))
    assert.equal(before, true)
    if (boundary === 'input') f.edit('original', '123'); else f.locale('en')
    // The obsolete timer is allowed to arrive while a different context is shown.
    f.timers.filter(timer => timer.delay === 2000).forEach(timer => timer.callback()); f.sync()
    if (boundary === 'input') f.edit('original', '100000'); else f.locale('ko')
    const resurrected = target === 'basic' ? f.by(f.parent, 'data-discount-basic-copy', 'original').props.children.type === 'icon:Check' : f.child.all().some(node => Object.hasOwn(node.props, 'data-discount-feedback'))
    results.push({ target, boundary, resurrected })
    f.cleanup()
  }
  assert.deepEqual(results, results.map(value => ({ ...value, resurrected: false })))
})

console.log(`Discount independent: ${groups} groups PASS; hooks and IO controlled, no Chrome or native sharing`)
