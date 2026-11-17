import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { createDiscountComparisonExamples } from '../src/utils/discountComparison.ts'
const require = createRequire(import.meta.url)
const { componentHarness } = require('../docs/verify/2026-11-17-repeat-batch19/component-harness.cjs')
const defer = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const flush = () => new Promise(resolve => setImmediate(resolve))
async function fixture() {
  let write = async () => {}, fallbackCalls = 0, selectionThrows = false, downloads = 0, renderCard = async () => new Blob(['image'])
  const copies = [], messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8'))
  messages.discountCalculator.comparison = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch33/translations-discount-comparison.json', 'utf8')).ko.discountCalculator.comparison
  const translate = namespace => (key, values = {}) => { const message = key.split('.').reduce((result, part) => result?.[part], messages[namespace]); assert.equal(typeof message, 'string', `${namespace}.${key}`); return message.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`)) }
  class Field { value = ''; style = {}; isConnected = true; focus() { if (selectionThrows) throw new Error('focus denied') } select() { if (selectionThrows) throw new Error('select denied') } setSelectionRange() { if (selectionThrows) throw new Error('range denied') } remove() {} }
  const navigator = { clipboard: { writeText(value) { copies.push(value); return write(value) } } }
  const document = { activeElement: new Field(), body: { appendChild() {} }, execCommand() { fallbackCalls++; return true }, createElement(tag) { if (tag === 'textarea') return new Field(); assert.equal(tag, 'a'); return { click() { downloads++ }, remove() {} } } }
  class LocalURL extends URL {}
  LocalURL.createObjectURL = () => 'blob:share'; LocalURL.revokeObjectURL = () => {}
  const props = { rows: createDiscountComparisonExamples(), revision: 0, ready: true, baseUrl: 'https://toolhub.ai.kr/discount-calculator/', basicPrice: 80000, multiPrice: 72000, onChange(next) { props.rows = next; props.revision++ } }
  const c = await componentHarness('src/components/DiscountComparison.tsx', { props, messages, navigator, document, globals: { HTMLElement: Field, URL: LocalURL },
    modules: { '@/contexts/LanguageContext': { useLanguage: () => ({ language: 'ko' }) }, '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' } },
    beforeEffects(tree) { const visit = node => { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(visit); if (node.props?.ref && Object.hasOwn(node.props, 'data-discount-manual')) { node.props.ref.current ??= new Field(); node.props.ref.current.value = node.props.value } visit(node.props?.children) }; visit(tree) },
  })
  c.render(); const shareProps = () => c.find(node => node.type === 'ShareResult').props
  const s = await componentHarness('src/components/ShareResult.tsx', { props: shareProps(), messages, navigator, document, globals: { HTMLElement: Field, URL: LocalURL },
    modules: { '@/lib/i18n/shared': { useTranslations: translate }, '@/utils/shareCard': { renderShareCard: (...args) => renderCard(...args) } },
  })
  s.render()
  const render = () => { c.render(); s.setProps(shareProps()) }
  return { c, s, props, copies, render,
    child(action) { const node = c.find(node => node.props['data-discount-action'] === action); node.props.onClick(); render() },
    share(action) { c.all().find(node => Object.hasOwn(node.props, 'data-discount-share-boundary'))?.props.onClickCapture(); const node = s.find(node => node.props['data-share-action'] === action); node.props.onClick(); render() },
    async settle() { await flush(); render() }, write(port) { write = port }, card(port) { renderCard = port }, throwSelection() { selectionThrows = true }, fallbackCalls: () => fallbackCalls, downloads: () => downloads,
    cleanup() { c.cleanup(); s.cleanup() },
  }
}
let groups = 0
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log('PASS', name) }
await check('pending full-text copy cannot fallback after a newer shared link is copied', async () => {
  const f = await fixture(), old = defer(); f.write(() => old.promise); f.child('copy'); f.write(async () => {}); f.share('copy'); await f.settle()
  const link = f.copies.at(-1); assert.match(link, /^https:/); old.reject(new Error('older native denied')); await f.settle(); assert.equal(f.fallbackCalls(), 0); assert.equal(f.copies.at(-1), link); assert.ok(!f.c.all().some(node => Object.hasOwn(node.props, 'data-discount-feedback'))); f.cleanup()
})
await check('pending shared-link copy cannot fallback after a newer full-text copy', async () => {
  const f = await fixture(), old = defer(); f.write(() => old.promise); f.share('copy'); f.write(async () => {}); f.child('copy'); await f.settle(); assert.ok(!f.copies.at(-1).startsWith('https:')); old.reject(new Error('older link denied')); await f.settle(); assert.equal(f.fallbackCalls(), 0); assert.ok(!f.s.all().some(node => Object.hasOwn(node.props, 'data-share-recovery'))); f.cleanup()
})
await check('pending shared image cannot download after full TXT takes the output ownership', async () => {
  const f = await fixture(), image = defer(); f.card(() => image.promise); f.share('save'); f.child('txt'); assert.equal(f.downloads(), 1); image.resolve(new Blob(['old image'])); await f.settle(); assert.equal(f.downloads(), 1); f.cleanup()
})
await check('manual focus and selection exceptions preserve recovery text without uncaught callbacks', async () => {
  const f = await fixture(); f.throwSelection(); f.write(async () => { throw new Error('copy denied') }); f.child('copy'); await f.settle()
  const field = f.c.find(node => Object.hasOwn(node.props, 'data-discount-manual')); assert.ok(field.props.value.length > 0)
  assert.doesNotThrow(() => field.props.onFocus({ target: { select() { throw new Error('selection denied') } } })); f.render()
  assert.doesNotThrow(() => f.child('select-text')); assert.equal(f.c.find(node => Object.hasOwn(node.props, 'data-discount-manual')).props.value, field.props.value); assert.match(f.c.text(), /직접 선택/); f.cleanup()
})
console.log(`Discount export ownership: ${groups} groups passed`)
