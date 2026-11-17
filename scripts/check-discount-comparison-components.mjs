import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { createDiscountComparisonExamples, decodeDiscountComparison } from '../src/utils/discountComparison.ts'
const require = createRequire(import.meta.url)
const { componentHarness } = require('../docs/verify/2026-11-17-repeat-batch19/component-harness.cjs')
const flush = () => new Promise(resolve => setImmediate(resolve))
const defer = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function catalog(language) { const messages = JSON.parse(fs.readFileSync(`messages/${language}.json`, 'utf8')); messages.discountCalculator.comparison = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch33/translations-discount-comparison.json', 'utf8'))[language].discountCalculator.comparison; return messages }
const has = (node, key, value) => Object.hasOwn(node.props, key) && (value === undefined || node.props[key] === value)
async function fixture(options = {}) {
  let language = options.language ?? 'ko', write = async () => {}, fallback = false, fallbackCalls = 0, savedFail = false, creation = () => {}, sequence = 0, selected = ''
  const messages = catalog(language), copies = [], saved = [], urls = new Map(), revoked = [], timers = new Map(), timerHistory = []
  const props = { rows: options.rows ?? createDiscountComparisonExamples(), revision: 0, ready: options.ready ?? true, baseUrl: 'https://toolhub.ai.kr/discount-calculator/?mode=discountAmount&amount=20&keep=1#result', basicPrice: 10.5, multiPrice: 9.49, ...options.props, onChange(next) { props.rows = next; props.revision++ } }
  class Field { style = {}; isConnected = true; value = ''; focus() {} select() { selected = this.value } setSelectionRange() { selected = this.value } remove() {} }
  class LocalURL extends URL {}
  LocalURL.createObjectURL = blob => { const url = `blob:discount-${urls.size}`; urls.set(url, blob); creation(); return url }
  LocalURL.revokeObjectURL = url => revoked.push(url)
  const h = await componentHarness('src/components/DiscountComparison.tsx', {
    props, messages, globals: { HTMLElement: Field, URL: LocalURL,
      setTimeout(callback, delay) { const id = ++sequence; const item = { id, callback, delay }; timers.set(id, item); timerHistory.push(item); return id }, clearTimeout(id) { timers.delete(id) },
    },
    modules: { '@/contexts/LanguageContext': { useLanguage: () => ({ language }) }, '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' } },
    navigator: { clipboard: { writeText(value) { copies.push(value); return write(value) } } },
    document: { activeElement: new Field(), body: { appendChild() {} }, execCommand() { fallbackCalls++; return fallback }, createElement(tag) { if (tag === 'textarea') return new Field(); assert.equal(tag, 'a'); return { click() { if (savedFail) throw new Error('denied'); saved.push({ name: this.download, blob: urls.get(this.href) }) }, remove() {} } } },
    beforeEffects(tree) { const visit = value => { if (!value || typeof value !== 'object') return; if (Array.isArray(value)) return value.forEach(visit); if (value.props?.ref && has(value, 'data-discount-manual')) { value.props.ref.current ??= new Field(); value.props.ref.current.value = value.props.value } visit(value.props?.children) }; visit(tree) },
  })
  h.render()
  const by = (key, value) => h.find(node => has(node, key, value))
  const click = value => { const node = by('data-discount-action', value); assert.ok(!node.props.disabled, `disabled: ${value}`); const result = node.props.onClick(); h.render(); return result }
  const edit = (index, field, value) => { const id = props.rows[index].id; h.find(node => has(node, 'data-discount-field', field) && has(node, 'data-discount-id', id)).props.onChange({ target: { value } }); h.render() }
  const remove = index => { by('data-discount-remove', props.rows[index].id).props.onClick(); h.render() }
  const settle = async () => { await flush(); h.render() }
  return { h, props, by, click, edit, remove, settle, copies, saved, urls, revoked, timers, timerHistory,
    share: () => h.all().find(node => node.type === 'ShareResult')?.props,
    external(next) { Object.assign(props, next); h.render() }, locale(next) { language = next; messages.discountCalculator = catalog(next).discountCalculator; h.render() },
    write(port) { write = port }, fallback(value) { fallback = value }, fallbackCalls: () => fallbackCalls, failSave(value) { savedFail = value }, onCreate(port) { creation = port }, selected: () => selected,
  }
}
let groups = 0
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log('PASS', name) }

await check('controlled defaults show results; missing/invalid rows stay visible and block every complete export and winner claim', async () => {
  const f = await fixture(); assert.ok(f.share()); assert.equal(f.h.find(n => n.type === 'MobileResultLink').props.href, '#discount-comparison-result')
  f.edit(0, 'unitPrice', ''); assert.equal(f.props.rows[0].unitPrice, ''); assert.match(f.h.text(), /유효 조건 1 \/ 전체 2개/); assert.ok(f.by('data-discount-action', 'copy').props.disabled); assert.ok(!f.share()); assert.ok(!f.h.all().some(n => has(n, 'data-discount-lowest')))
  f.edit(0, 'unitPrice', '0'); assert.ok(f.share()); assert.match(f.by('data-discount-lowest', 'total').props.children.join(''), /조건 1/)
  f.edit(0, 'quantity', '0'); assert.ok(!f.share()); assert.ok(f.h.text().includes('허용 범위')); f.edit(0, 'quantity', '1')
  f.remove(1); assert.ok(f.share()); assert.ok(!f.h.all().some(n => has(n, 'data-discount-lowest'))); f.remove(0); assert.equal(f.props.rows.length, 0); assert.ok(f.by('data-discount-action', 'txt').props.disabled)
  f.h.cleanup()
})

await check('explicit current-price imports round once, keep independent drafts, honor four rows and never resurrect deleted fields', async () => {
  const f = await fixture(); f.click('import-basic'); assert.equal(f.props.rows[2].unitPrice, '11'); f.click('import-multi'); assert.equal(f.props.rows[3].unitPrice, '9')
  assert.ok(f.by('data-discount-action', 'add').props.disabled); const imported = f.props.rows[2]
  f.external({ basicPrice: 999, multiPrice: 777 }); assert.equal(f.props.rows[2], imported); assert.equal(imported.unitPrice, '11')
  f.edit(2, 'name', '긴 이름😀'.repeat(9)); assert.ok(!f.share()); f.edit(2, 'name', '😀'.repeat(40)); assert.ok(f.share())
  const removedId = f.props.rows[1].id, staleEdit = f.h.find(n => has(n, 'data-discount-field', 'unitPrice') && has(n, 'data-discount-id', removedId)).props.onChange
  f.remove(1); staleEdit({ target: { value: '999999' } }); f.h.render(); assert.ok(!f.props.rows.some(row => row.id === removedId)); f.click('add'); assert.equal(f.props.rows[3].unitPrice, ''); assert.equal(new Set(f.props.rows.map(row => row.id)).size, 4)
  f.external({ ready: false }); assert.ok(f.by('data-discount-action', 'copy').props.disabled); assert.ok(!f.share()); f.h.cleanup()
})

await check('total and rational-unit ties use every valid offer; shared numeric link and four summary rows match full TXT and clipboard snapshots', async () => {
  const drafts = [
    { id: 'one', name: 'private A', unitPrice: '10', quantity: '1', coupon: '0', shipping: '0' },
    { id: 'two', name: 'private B', unitPrice: '6', quantity: '2', coupon: '0', shipping: '0' },
    { id: 'three', name: 'private C', unitPrice: '6', quantity: '3', coupon: '0', shipping: '0' },
    { id: 'four', name: 'private D', unitPrice: '10', quantity: '1', coupon: '0', shipping: '0' },
  ]
  const f = await fixture({ rows: drafts }), shared = f.share()
  assert.equal(shared.card.rows.length, 4); assert.ok(shared.card.rows.every(row => !row.label.includes('private')))
  assert.match(f.by('data-discount-lowest', 'total').props.children.join(''), /private A \/ private D/); assert.match(f.by('data-discount-lowest', 'unit').props.children.join(''), /private B \/ private C/)
  const link = new URL(shared.url); assert.ok(!decodeURIComponent(shared.url).includes('private')); assert.equal(link.searchParams.get('mode'), 'discountAmount'); assert.equal(link.hash, '#result')
  const decoded = decodeDiscountComparison(link.searchParams.get('compare')); assert.equal(decoded.kind, 'ready'); assert.equal(decoded.rows.length, 4)
  f.click('copy'); await f.settle(); f.click('txt'); assert.equal(f.copies[0], shared.text); assert.equal(await f.saved[0].blob.text(), shared.text); assert.equal(f.saved[0].name, 'discount-comparison.txt')
  for (const draft of drafts) assert.ok(shared.text.includes(draft.name)); assert.ok(shared.text.includes('실제 적용 쿠폰')); assert.ok(shared.text.includes('상품 금액 초과 쿠폰'))
  f.h.cleanup()
})

await check('late copy rejection cannot overwrite edits or invoke fallback; manual text recovery and request-specific success timers remain current', async () => {
  const f = await fixture(), old = defer(); f.write(() => old.promise); f.click('copy'); f.edit(0, 'name', 'new'); old.reject(new Error('denied')); await f.settle(); assert.equal(f.fallbackCalls(), 0); assert.ok(!f.h.all().some(n => has(n, 'data-discount-feedback')))
  f.write(async () => { throw new Error('denied') }); f.fallback(false); f.click('copy'); await f.settle(); assert.equal(f.by('data-discount-manual').props.readOnly, true); const manual = f.by('data-discount-manual').props.value; assert.match(manual, /new/)
  f.click('select-text'); assert.equal(f.selected(), manual)
  f.write(async () => {}); f.click('copy'); await f.settle(); const firstTimer = f.timerHistory.find(item => item.delay === 2000)
  f.click('copy'); await f.settle(); firstTimer.callback(); f.h.render(); assert.match(f.by('data-discount-feedback').props.children, /복사했습니다/)
  f.timerHistory.at(-1).callback(); f.h.render(); assert.ok(!f.h.all().some(n => has(n, 'data-discount-feedback')))
  const late = defer(); f.write(() => late.promise); f.click('copy'); f.h.cleanup(); late.reject(new Error('old rejection')); await flush(); assert.equal(f.fallbackCalls(), 1)
})

await check('TXT failures retain rows and complete text; URL creation interrupted by an external edit cannot download a stale file', async () => {
  const f = await fixture(), before = JSON.stringify(f.props.rows); f.failSave(true); f.click('txt'); assert.match(f.h.text(), /TXT 다운로드를 시작하지 못했습니다/); assert.equal(JSON.stringify(f.props.rows), before)
  f.failSave(false); f.click('txt'); assert.equal(f.saved.length, 1)
  f.onCreate(() => f.external({ rows: f.props.rows.map((row, index) => index ? row : { ...row, coupon: '10' }), revision: f.props.revision + 1 }))
  f.click('txt'); assert.equal(f.saved.length, 1); assert.ok(!f.h.all().some(n => has(n, 'data-discount-feedback')))
  f.h.cleanup(); assert.equal(new Set(f.revoked).size, f.revoked.length); assert.equal(f.revoked.length, f.urls.size)
})

await check('locale/base URL/input revisions invalidate export actions without mutating drafts, and keep additive ShareResult resultKey current', async () => {
  const f = await fixture({ ready: false }); assert.ok(!f.share()); assert.ok(f.by('data-discount-action', 'add').props.disabled)
  f.external({ ready: true }); f.edit(0, 'name', 'private 이름'); const before = JSON.stringify(f.props.rows), key = f.share().resultKey
  const pending = defer(); f.write(() => pending.promise); f.click('copy'); f.locale('en'); pending.resolve(); await f.settle(); assert.equal(JSON.stringify(f.props.rows), before); assert.notEqual(f.share().resultKey, key); assert.ok(!f.h.all().some(n => has(n, 'data-discount-feedback')))
  assert.match(f.share().text, /Coupon actually applied/); assert.ok(f.share().text.includes('private 이름')); const previous = f.share().resultKey
  f.external({ revision: f.props.revision + 1, baseUrl: 'https://toolhub.ai.kr/discount-calculator/?mode=finalPrice&final=33#changed' }); assert.notEqual(f.share().resultKey, previous); assert.equal(new URL(f.share().url).searchParams.get('final'), '33'); assert.equal(new URL(f.share().url).hash, '#changed')
  f.h.cleanup()
})

await check('completed feedback stays invalid after base URL and locale A-B-A round trips, including failure recovery and old timers', async () => {
  const f = await fixture(), originalUrl = f.props.baseUrl
  f.click('copy'); await f.settle(); assert.ok(f.by('data-discount-feedback')); const timer = f.timerHistory.at(-1)
  f.external({ baseUrl: originalUrl + '-changed' }); timer.callback(); f.h.render(); f.external({ baseUrl: originalUrl }); assert.ok(!f.h.all().some(node => has(node, 'data-discount-feedback')))
  f.click('copy'); await f.settle(); f.locale('en'); f.locale('ko'); assert.ok(!f.h.all().some(node => has(node, 'data-discount-feedback')))
  f.write(async () => { throw new Error('denied') }); f.click('copy'); await f.settle(); assert.ok(f.by('data-discount-manual')); f.locale('en'); f.locale('ko'); assert.ok(!f.h.all().some(node => has(node, 'data-discount-manual')))
  f.click('txt'); assert.ok(f.by('data-discount-feedback')); f.external({ baseUrl: originalUrl + '-changed' }); f.external({ baseUrl: originalUrl }); assert.ok(!f.h.all().some(node => has(node, 'data-discount-feedback'))); f.h.cleanup()
})
console.log(`Discount comparison child: ${groups} groups passed; shared renderer/native browser remain separate checkpoints`)
