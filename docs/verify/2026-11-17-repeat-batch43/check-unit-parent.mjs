import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const fragment = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch43/translations-unit-batch.json', 'utf8'))
const flush = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const event = { stopPropagation() {} }
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)]
const attr = (host, name, value = '') => host.find(node => node.props[name] === value)
async function fixture({ query = 'c=length&f=m&t=cm&v=7', hydrated = true, storage = {} } = {}) {
  const messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8'))
  Object.assign(messages.unitConverter, fragment.ko.unitConverter)
  const io = { locale: 'ko', copy: 'resolve', fallback: false }, copyJobs = [], imageJobs = [], texts = [], legacy = [], files = [], urls = new Map(), revoked = [], scrolls = []
  let serial = 0, selected = null, batch = null, share = null
  class PortURL extends URL { static createObjectURL(blob) { const key = `blob:unit-parent-${++serial}`; urls.set(key, blob); return key } static revokeObjectURL(key) { revoked.push(key); urls.delete(key) } }
  const document = { activeElement: null, body: { appendChild() {} }, createElement(tag) {
    if (tag === 'a') return { href: '', download: '', click() { files.push({ name: this.download, blob: urls.get(this.href) }) }, remove() {} }
    assert.equal(tag, 'textarea'); selected = { value: '', style: {}, focus() {}, select() {}, setSelectionRange() {}, remove() {} }; return selected
  }, execCommand() { legacy.push(selected.value); return io.fallback } }
  const navigator = { clipboard: { writeText(text) { texts.push(text); if (io.copy === 'reject') return Promise.reject(new Error('denied')); if (io.copy === 'wait') { const work = deferred(); copyJobs.push(work); return work.promise } return Promise.resolve() } } }
  const language = { useOptionalLanguage: () => ({ language: io.locale }) }
  const parent = await componentHarness('src/components/UnitConverter.tsx', { url: `https://toolhub.ai.kr/unit-converter/?keep=one&keep=two&${query}#saved`, hydrated, messages, storage, globals: { URL: PortURL }, document, navigator,
    modules: { '@/contexts/LanguageContext': language, '@/components/UnitFavorites': { __esModule: true, default: 'Favorites' }, '@/components/UnitBatchConverter': { __esModule: true, default: 'Batch' }, '@/components/UnitCopyRecovery': { __esModule: true, default: 'Recovery' }, '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' } },
    beforeEffects(tree) { for (const node of nodes(tree)) { if (node.props.id === 'unit-batch-panel') node.props.ref.current = { scrollIntoView: opts => scrolls.push(opts) }; if (node.props.id === 'uc-value') node.props.ref.current = { focus() {} } } } })
  const state = { retained: true }, replacements = [], replace = parent.window.history.replaceState
  parent.window.history.state = state
  parent.window.history.replaceState = (next, title, url) => { replacements.push({ state: next, url }); parent.window.history.state = next; replace(next, title, url) }
  parent.render()
  const shared = namespace => { const t = (key, vars = {}) => { const value = key.split('.').reduce((a, k) => a?.[k], messages[namespace]); assert.equal(typeof value, 'string', `${namespace}.${key}`); return value.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`) }; return t }
  const settle = async () => {
    for (let i = 0; i < 4; i++) {
      await flush(); parent.render()
      const bp = parent.all().find(node => node.type === 'Batch')?.props
      if (bp && !batch) { batch = await componentHarness('src/components/UnitBatchConverter.tsx', { props: bp, messages, document, navigator, globals: { URL: PortURL }, modules: { '@/contexts/LanguageContext': language } }); batch.render() }
      else if (bp) batch.setProps(bp)
      const sp = parent.all().find(node => node.type === 'ShareResult')?.props
      if (sp && !share) { share = await componentHarness('src/components/ShareResult.tsx', { props: sp, messages, document, navigator, url: parent.window.location.href, globals: { URL: PortURL }, modules: { '@/lib/i18n/shared': { useTranslations: shared }, '@/utils/shareCard': { renderShareCard() { const job = deferred(); imageJobs.push(job); return job.promise } } } }); share.render() }
      else if (sp) { share.window.history.replaceState(null, '', parent.window.location.href); share.setProps(sp) }
      else if (share) { share.cleanup(); share = null }
    }
  }
  await settle()
  const click = async (host, name, value = '') => { attr(host, name, value).props.onClick(event); await settle() }
  const edit = async (host, id, value) => { attr(host, 'id', id).props.onChange({ target: { value } }); await settle() }
  const open = async () => { await click(parent, 'data-unit-batch-toggle'); return batch }
  const shareClick = async action => { attr(parent, 'data-unit-share-boundary').props.onClickCapture(); attr(share, 'data-share-action', action).props.onClick(); await settle() }
  const locale = async value => { io.locale = value; Object.assign(messages, JSON.parse(fs.readFileSync(`messages/${value}.json`, 'utf8'))); Object.assign(messages.unitConverter, fragment[value].unitConverter); await settle() }
  const cleanup = () => { batch?.cleanup(); share?.cleanup(); parent.cleanup() }
  return { parent, get batch() { return batch }, get share() { return share }, io, copyJobs, imageJobs, texts, legacy, files, urls, revoked, scrolls, state, replacements, settle, click, edit, open, shareClick, locale, cleanup }
}
let groups = 0
async function check(name, run) { await run(); groups++; console.log('PASS', name) }
await check('actual URL restoration, first-client baseline and early edit preserve unrelated query/hash/state', async () => {
  const f = await fixture({ query: 'c=css&f=rem&t=px&v=3.25&p=6&rb=20', hydrated: false })
  assert.equal(attr(f.parent, 'id', 'uc-value').props.value, '1'); assert.equal(f.replacements.length, 0)
  f.parent.setHydrated(true); await f.settle(); assert.equal(attr(f.parent, 'id', 'uc-value').props.value, '3.25'); assert.equal(attr(f.parent, 'id', 'uc-rb').props.value, 20)
  await f.click(f.parent, 'data-unit-copy', 'main'); assert.equal(f.texts.at(-1), '65')
  const url = new URL(f.parent.window.location.href); assert.deepEqual(url.searchParams.getAll('keep'), ['one', 'two']); assert.equal(url.hash, '#saved'); assert.ok(f.replacements.every(row => row.state === f.state)); f.cleanup()
  const early = await fixture({ hydrated: false, query: 'v=900' }); await early.edit(early.parent, 'uc-value', '12'); early.parent.setHydrated(true); await early.settle(); assert.equal(attr(early.parent, 'id', 'uc-value').props.value, '12'); early.cleanup()
})
await check('batch mounted only after opening and retained on close, raw/result never enter single URL or recent8', async () => {
  const history = Array.from({ length: 8 }, (_, i) => ({ c: 'length', f: 'm', t: 'cm', v: String(i + 20) }))
  const f = await fixture({ storage: { 'unitConverter.recent': JSON.stringify(history) } }); assert.equal(f.batch, null)
  f.parent.tick(1500); await f.settle(); const raw = f.parent.stored.get('unitConverter.recent'), url = f.parent.window.location.href
  assert.equal(JSON.parse(raw).length, 8); await f.open(); const original = f.batch
  await f.edit(f.batch, 'unit-batch-input', '2\n\nBAD\n5'); await f.click(f.batch, 'data-unit-batch-run')
  await f.click(f.parent, 'data-unit-batch-toggle'); assert.equal(attr(f.parent, 'id', 'unit-batch-panel').props.hidden, true)
  await f.open(); assert.equal(f.batch, original); assert.equal(attr(f.batch, 'id', 'unit-batch-input').props.value, '2\n\nBAD\n5'); assert.equal(attr(f.batch, 'data-unit-batch-result').props['data-unit-batch-stale'], false)
  f.parent.tick(1500); await f.settle(); assert.equal(f.parent.stored.get('unitConverter.recent'), raw); assert.equal(f.parent.window.location.href, url); assert.equal(attr(f.parent, 'id', 'uc-value').props.value, '7'); assert.equal(f.scrolls.length, 2); f.cleanup()
})
await check('favorite pair/precision/rem base/swap change batch context while preserving draft and explicit snapshot', async () => {
  const f = await fixture(); await f.open(); await f.edit(f.batch, 'unit-batch-input', '2'); await f.click(f.batch, 'data-unit-batch-run'); assert.ok(f.batch.text().includes('200 cm'))
  f.parent.find(node => node.type === 'Favorites').props.onLoad({ c: 'css', f: 'rem', t: 'px', p: 4, rb: 20 }); await f.settle()
  assert.equal(attr(f.parent, 'id', 'uc-value').props.value, '7'); assert.equal(attr(f.batch, 'id', 'unit-batch-input').props.value, '2'); assert.equal(attr(f.batch, 'data-unit-batch-result').props['data-unit-batch-stale'], true)
  await f.click(f.batch, 'data-unit-batch-copy'); assert.ok(f.texts.at(-1).includes('\t200\tcm\t'))
  await f.click(f.batch, 'data-unit-batch-run'); assert.ok(f.batch.text().includes('40 px')); await f.edit(f.parent, 'uc-rb', '16'); await f.edit(f.parent, 'uc-sig', '6'); await f.click(f.batch, 'data-unit-batch-run'); assert.ok(f.batch.text().includes('32 px'))
  await f.click(f.parent, 'data-unit-swap'); assert.equal(attr(f.parent, 'id', 'uc-value').props.value, '112'); await f.click(f.batch, 'data-unit-batch-run'); assert.ok(f.batch.text().includes('0.125 rem')); f.cleanup()
})
await check('traditional overview disables batch until an existing traditional row picks a pair', async () => {
  const f = await fixture(); await f.open(); await f.click(f.parent, 'data-unit-category', 'traditional'); assert.equal(attr(f.batch, 'data-unit-batch-run').props.disabled, true)
  const row = f.parent.all().find(node => node.props.role === 'button' && nodes(node).some(child => String(child.props['data-unit-copy'] ?? '').startsWith('trad.')))
  row.props.onClick(); await f.settle(); assert.equal(attr(f.batch, 'data-unit-batch-run').props.disabled, false); await f.click(f.batch, 'data-unit-batch-run'); assert.equal(attr(f.batch, 'data-unit-batch-result').props['data-unit-batch-stale'], false); f.cleanup()
})
await check('single/batch/row/link share one latest copy; late rejection cannot fallback or display old recovery', async () => {
  const f = await fixture(); await f.open(); await f.click(f.batch, 'data-unit-batch-run')
  const actions = [() => f.click(f.parent, 'data-unit-copy', 'main'), () => f.click(f.batch, 'data-unit-batch-copy'), () => f.click(f.parent, 'data-unit-copy', 'm'), () => f.shareClick('copy')]
  for (let i = 0; i < actions.length; i++) {
    f.io.copy = 'wait'; await actions[i](); const old = f.copyJobs.shift(); f.io.copy = 'resolve'; await actions[(i + 1) % actions.length](); old.reject(new Error('old rejected')); await f.settle()
    assert.equal(f.legacy.length, 0); assert.equal(f.parent.all().some(node => node.type === 'Recovery'), false); assert.equal(f.share.all().some(node => Object.hasOwn(node.props, 'data-share-recovery')), false)
  }
  // ShareResult capture invalidates the request, not the input context: a later parent copy still works.
  const count = f.texts.length; await f.click(f.parent, 'data-unit-copy', 'main'); assert.equal(f.texts.length, count + 1); f.cleanup()
})
await check('actual pending ShareResult image then CSV yields CSV only and CSV invalidates pending clipboard', async () => {
  const f = await fixture(); await f.open(); await f.click(f.batch, 'data-unit-batch-run'); await f.shareClick('save'); assert.equal(f.imageJobs.length, 1)
  await f.click(f.batch, 'data-unit-batch-csv'); f.imageJobs.shift().resolve(new Blob(['old png'], { type: 'image/png' })); await f.settle()
  assert.deepEqual(f.files.map(item => item.name), ['unit-conversion-batch.csv']); assert.ok((await f.files[0].blob.text()).includes('10000'))
  f.io.copy = 'wait'; await f.click(f.parent, 'data-unit-copy', 'main'); const old = f.copyJobs.shift(); await f.click(f.batch, 'data-unit-batch-csv'); old.reject(new Error('old native')); await f.settle(); assert.equal(f.legacy.length, 0)
  await f.shareClick('save'); f.imageJobs.shift().resolve(new Blob(['fresh png'], { type: 'image/png' })); await f.settle(); assert.equal(f.files.at(-1).name, 'toolhub-result.png')
  f.cleanup(); assert.equal(f.urls.size, 0); assert.equal(new Set(f.revoked).size, f.revoked.length)
})
await check('input and locale ABA suppress pending copy; denial retains full manual snapshot and retry changes ownership', async () => {
  const f = await fixture(); await f.open(); await f.click(f.batch, 'data-unit-batch-run')
  f.io.copy = 'wait'; await f.click(f.batch, 'data-unit-batch-copy'); const old = f.copyJobs.shift(); await f.edit(f.batch, 'unit-batch-input', '8'); await f.edit(f.batch, 'unit-batch-input', '1\n10\n100'); old.reject(new Error('old draft')); await f.settle(); assert.equal(f.legacy.length, 0)
  await f.click(f.parent, 'data-unit-copy', 'main'); const oldLocale = f.copyJobs.shift(); await f.locale('en'); await f.locale('ko'); oldLocale.reject(new Error('old locale')); await f.settle(); assert.equal(f.legacy.length, 0)
  f.io.copy = 'reject'; await f.click(f.batch, 'data-unit-batch-copy'); const recovery = f.parent.find(node => node.type === 'Batch').props.recovery; assert.ok(recovery.props.text.includes('\t10000\tcm\t'))
  f.io.copy = 'resolve'; recovery.props.onRetry(); await f.settle(); assert.equal(f.parent.find(node => node.type === 'Batch').props.copyState.status, 'copied'); recovery.props.onClose(); await f.settle(); assert.equal(f.parent.find(node => node.type === 'Batch').props.copyState.status, 'copied'); f.cleanup()
})
await check('Strict effect replay and unmount clean clipboard/image work without unintended download or raw write', async () => {
  const f = await fixture(); await f.open(); await f.click(f.batch, 'data-unit-batch-run'); f.parent.replayEffects(); f.batch.replayEffects(); f.share.replayEffects(); await f.settle()
  f.io.copy = 'wait'; await f.click(f.parent, 'data-unit-copy', 'main'); const old = f.copyJobs.shift(); await f.shareClick('save'); const image = f.imageJobs.shift(); f.cleanup(); old.reject(new Error('old')); image.resolve(new Blob(['late'])); await flush(); await flush()
  assert.equal(f.legacy.length, 0); assert.equal(f.files.length, 0); assert.equal(f.parent.stored.has('unitConverter.recent'), false)
})
console.log(`Unit converter connected parent: ${groups} groups passed`)
