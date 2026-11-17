import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../docs/verify/2026-11-17-repeat-batch29/team-parent-harness.mjs'

const catalogs = Object.fromEntries(['ko', 'en'].map(locale => [locale, {
  ...JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')).shareResult,
  ...JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch38/translations-share-result.json', 'utf8'))[locale].shareResult,
}]))
const base = { card: { tool: 'Synthetic', label: 'Order', headline: '100', rows: [{ label: 'Count', value: '1' }] }, text: 'First result', fileName: 'synthetic' }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }
let passed = 0
const pass = name => { passed++; console.log(`PASS ${name}`) }
async function fixture(props = structuredClone(base)) {
  const io = { locale: 'ko', render: async () => new Blob(['synthetic raster'], { type: 'image/png' }), write: async () => {}, legacy: false,
    native: false, canFile: false, nativeAction: async () => {}, selectFails: false, clickFails: false }
  const rendered = [], clipboard = [], shares = [], clicks = [], urls = [], releases = [], selections = [], fallback = [], focused = []
  class TestURL extends URL {
    static createObjectURL(blob) { const url = `blob:fixture-${urls.length}`; urls.push({ url, blob }); return url }
    static revokeObjectURL(url) { releases.push(url) }
  }
  const h = await componentHarness('src/components/ShareResult.tsx', {
    props, url: 'https://toolhub.ai.kr/synthetic/?n=100', globals: { URL: TestURL, File },
    modules: {
      '@/lib/i18n/shared': { useTranslations: () => key => { const result = catalogs[io.locale][key]; assert.equal(typeof result, 'string', key); return result } },
      '@/utils/shareCard': { renderShareCard: data => { rendered.push(data); return io.render(data) } },
    },
    navigator: {
      clipboard: { writeText: value => { clipboard.push(value); return io.write(value) } },
      canShare: () => io.canFile,
      get share() { return io.native ? async data => { shares.push(data); return io.nativeAction(data) } : undefined },
    },
    document: {
      body: { appendChild() {}, removeChild() {} },
      createElement(tag) { return { tag, style: {}, value: '', focus() {}, select() { if (io.selectFails) throw new Error('selection blocked') }, setSelectionRange() {}, remove() {}, click() { if (io.clickFails) throw new Error('download blocked'); clicks.push({ url: this.href, filename: this.download }) } } },
      execCommand(command) { fallback.push(command); if (io.legacy instanceof Error) throw io.legacy; return io.legacy },
    },
    beforeEffects(tree) {
      const walk = node => {
        if (!node || typeof node !== 'object') return
        if (Array.isArray(node)) { node.forEach(walk); return }
        if (node.type === 'textarea' && node.props.ref) node.props.ref.current = {
          focus() {}, select() { if (io.selectFails) throw new Error('selection blocked') },
          setSelectionRange(start, end) { selections.push({ start, end, value: node.props.value }) },
        }
        if (node.type === 'button' && node.props.ref) node.props.ref.current = { focus() { focused.push(node.props['data-share-action']) } }
        walk(node.props?.children)
      }
      walk(tree)
    },
  })
  h.render()
  const action = name => h.find(node => node.type === 'button' && node.props['data-share-action'] === name)
  const run = async name => { const pending = action(name).props.onClick(); h.render(); await pending; await flush(); h.render() }
  return { h, io, action, run, rendered, clipboard, shares, clicks, urls, releases, selections, fallback, focused, props }
}

{
  const f = await fixture(), pendingImage = deferred()
  f.h.replayEffects(); f.h.replayEffects(); f.io.render = () => pendingImage.promise
  const pending = f.action('save').props.onClick(); f.h.render()
  assert.equal(f.action('save').props.disabled, true)
  f.h.setProps(structuredClone(base))
  f.props.card.rows[0].value = 'mutated after click'
  pendingImage.resolve(new Blob(['synthetic PNG'])); await pending; f.h.render()
  assert.equal(f.clicks.length, 1); assert.equal(f.rendered[0].rows[0].value, '1')
  assert.ok(f.h.text().includes(catalogs.ko.downloadStarted)); f.h.tick(2000)
  assert.equal(f.releases.length, 0); f.h.cleanup(); assert.equal(f.releases.length, 1)
  pass('same-value props and Strict replay keep first action usable; owned rows and URL cleanup')
}
{
  for (const change of ['headline', 'row', 'url', 'text', 'filename', 'revision', 'locale', 'aba']) {
    const f = await fixture(), image = deferred(); f.io.render = () => image.promise
    const pending = f.action('save').props.onClick(); f.h.render()
    const next = structuredClone(base)
    if (change === 'headline' || change === 'aba') next.card.headline = '200'
    if (change === 'row') next.card.rows[0].value = '2'
    if (change === 'url') next.url = 'https://example.test/new'
    if (change === 'text') next.text = 'Other result'
    if (change === 'filename') next.fileName = 'other'
    if (change === 'revision') next.resultKey = 1
    if (change === 'locale') f.io.locale = 'en'
    f.h.setProps(next)
    if (change === 'aba') f.h.setProps(structuredClone(base))
    image.resolve(new Blob()); await pending; f.h.render()
    assert.equal(f.clicks.length, 0, change); assert.equal(f.urls.length, 0, change)
    assert.equal(f.action('save').props.disabled, false, change); f.h.cleanup()
  }
  pass('each semantic prop, locale, explicit revision and result A-B-A cancel old render')
}
{
  const f = await fixture(), image = deferred(); f.io.render = () => image.promise
  const pending = f.action('save').props.onClick(); f.h.render()
  f.h.window.history.replaceState(null, '', '?n=200')
  image.resolve(new Blob()); await pending; f.h.render()
  assert.equal(f.clicks.length, 0); assert.equal(f.action('copy').props.disabled, false)
  await f.run('copy'); assert.equal(new URL(f.clipboard[0]).searchParams.get('n'), '200')
  f.h.cleanup(); pass('URL-only change drops stale work and releases pending controls')
}
{
  const f = await fixture(), old = deferred(); f.io.write = () => old.promise
  const pending = f.action('copy').props.onClick(); f.h.render()
  f.io.write = async () => {}; await f.run('copy')
  old.reject(new Error('late refusal')); await pending; f.h.render()
  assert.equal(f.fallback.length, 0); assert.ok(f.h.text().includes(catalogs.ko.copied))
  f.h.tick(2000); assert.ok(!f.h.text().includes(catalogs.ko.copied))
  // Cleanup/replay must invalidate work even when the same scope becomes active again.
  const image = deferred(); f.io.render = () => image.promise
  const saving = f.action('save').props.onClick(); f.h.render(); f.h.replayEffects()
  image.resolve(new Blob()); await saving; f.h.render(); assert.equal(f.clicks.length, 0)
  f.io.render = async () => new Blob(); await f.run('save'); assert.equal(f.clicks.length, 1)
  f.h.cleanup(); pass('new request owns notices; late rejection and replay cannot resurrect old actions')
}
{
  const f = await fixture(); f.io.write = async () => { throw new Error('denied') }; f.io.legacy = false
  await f.run('copy')
  const field = f.h.find(node => node.type === 'textarea')
  assert.equal(field.props.readOnly, true); assert.equal(field.props.value, 'https://toolhub.ai.kr/synthetic/?n=100')
  f.io.selectFails = true; await f.run('select'); assert.ok(f.h.text().includes(catalogs.ko.selectionFailed))
  f.io.selectFails = false; await f.run('select'); assert.equal(f.selections[0].end, field.props.value.length)
  f.io.legacy = true; await f.run('retry'); assert.ok(f.h.text().includes(catalogs.ko.copied))
  assert.equal(f.h.all().filter(node => node.type === 'textarea').length, 0)
  f.io.legacy = new Error('blocked'); await f.run('copy'); await f.run('close')
  assert.equal(f.h.all().filter(node => node.type === 'textarea').length, 0)
  assert.equal(f.focused.at(-1), 'copy')
  f.h.cleanup(); pass('native and legacy refusal, explicit selection failure, complete link, retry and close')
}
{
  const f = await fixture(); f.io.render = async () => { throw new Error('canvas failed') }
  await f.run('save'); assert.ok(f.h.text().includes(catalogs.ko.saveFailed)); assert.equal(f.urls.length, 0)
  f.io.render = async () => new Blob(); f.io.clickFails = true
  await f.run('save'); assert.ok(f.h.text().includes(catalogs.ko.saveFailed)); assert.equal(f.releases.length, 1)
  f.io.clickFails = false; await f.run('save'); assert.equal(f.clicks.length, 1)
  f.h.cleanup(); assert.equal(f.releases.length, f.urls.length)
  pass('renderer and download-start errors are handled and current result can retry')
}
{
  const f = await fixture(); f.io.native = true; f.io.canFile = true
  await f.run('share'); assert.equal(f.shares.length, 1); assert.equal(f.shares[0].files[0].name, 'synthetic.png')
  assert.equal(await f.shares[0].files[0].text(), 'synthetic raster')
  assert.equal(f.shares[0].text, 'First result\nhttps://toolhub.ai.kr/synthetic/?n=100')
  f.io.canFile = false; await f.run('share')
  assert.equal(f.shares[1].url, 'https://toolhub.ai.kr/synthetic/?n=100'); assert.equal(f.shares[1].text, 'First result')
  f.io.nativeAction = async () => { const error = new Error('canceled'); error.name = 'AbortError'; throw error }
  await f.run('share'); assert.equal(f.clipboard.length, 0); assert.equal(f.action('share').props.disabled, false)
  f.io.nativeAction = async () => { throw new Error('unsupported') }; await f.run('share')
  assert.equal(f.clipboard.length, 1); assert.ok(f.h.text().includes(catalogs.ko.copied))
  f.h.cleanup(); pass('file/text native payloads, cancel without fallback, native error with same-link recovery')
}
{
  const f = await fixture(); await f.run('share')
  assert.equal(f.rendered.length, 0); assert.equal(f.clipboard.length, 1)
  f.io.native = true
  const image = deferred(); f.io.render = () => image.promise
  const pending = f.action('share').props.onClick(); f.h.render(); f.h.cleanup()
  image.reject(new Error('late render error')); await pending; await flush()
  assert.equal(f.clipboard.length, 1); assert.equal(f.shares.length, 0)
  pass('no native sheet skips unnecessary image rendering; late unmount failure has no fallback')
}
console.log(`Share result actual component: ${passed} groups passed`)
