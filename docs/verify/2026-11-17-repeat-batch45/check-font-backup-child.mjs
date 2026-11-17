import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { parseFontPairProfiles } from '../../../src/utils/fontPairProfiles.ts'

const KEY = 'toolhub:font-pair:profiles', fragment = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch45/translations-font-backup.json', 'utf8'))
const styles = { title: { fontId: 'noto-serif-kr', size: 48, weight: 600 }, body: { fontId: 'pretendard', size: 18, weight: 400 } }
const profile = (id, name = id) => ({ id, name, styles: structuredClone(styles) })
const encode = profiles => JSON.stringify({ version: 1, profiles })
const backup = profiles => JSON.stringify({ app: 'toolhub-font-pair-profiles', version: 1, exportedAt: '2026-11-17T00:00:00.000Z', profiles })
const file = (profiles, name = 'pairs.json') => ({ name, size: Buffer.byteLength(backup(profiles)), text: async () => backup(profiles) })
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const walk = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)]
const flush = () => new Promise(resolve => setImmediate(resolve))
async function fixture({ locale = 'ko', raw = null, locked = false } = {}) {
  let props, h, sequence = 0
  const io = { raw, writes: 0, denied: false, quota: false, afterWriteDeny: false, locale, conflicts: 0, focus: 0, clicks: 0 }, queue = [], confirmed = [], files = [], urls = new Map(), revoked = []
  const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')); messages.fontPreview.pairing.backup = fragment[locale].fontPreview.pairing.backup
  const storage = { getItem(key) { assert.equal(key, KEY); if (io.denied) throw new Error('read'); return io.raw }, setItem(key, value) { assert.equal(key, KEY); if (io.quota) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); io.raw = value; io.writes++; if (io.afterWriteDeny) io.denied = true } }
  props = { snapshot: parseFontPairProfiles(raw), disabled: false, onImported(value) { confirmed.push(value); props = { ...props, snapshot: value }; h.setProps(props) }, onConflict() { io.conflicts++; props = { ...props, disabled: true }; h.setProps(props) } }
  class PortURL extends URL { static createObjectURL(blob) { const url = `blob:backup-${++sequence}`; urls.set(url, blob); return url } static revokeObjectURL(url) { revoked.push(url); urls.delete(url) } }
  const navigator = locked ? { locks: { request(key, action) { assert.equal(key, KEY); return new Promise((resolve, reject) => queue.push(() => { try { resolve(action()) } catch (error) { reject(error) } })) } } } : {}
  h = await componentHarness('src/components/FontPairBackupPanel.tsx', { props, messages, storagePort: storage, navigator,
    modules: { '@/contexts/LanguageContext': { useOptionalLanguage: () => ({ language: io.locale }) } }, globals: { URL: PortURL, crypto: { randomUUID: () => `new-${++sequence}` } },
    document: { body: { appendChild() {} }, createElement(tag) { assert.equal(tag, 'a'); return { href: '', download: '', click() { files.push({ name: this.download, blob: urls.get(this.href) }) }, remove() {} } } },
    beforeEffects(tree) { for (const node of walk(tree)) {
      if (Object.hasOwn(node.props, 'data-font-pair-backup-file')) node.props.ref.current = { value: '', click() { io.clicks++ } }
      if (Object.hasOwn(node.props, 'data-font-pair-backup-choose')) node.props.ref.current = { focus() { io.focus++ } }
    } },
  }); h.render()
  const settle = async () => { await flush(); h.render() }
  await settle()
  const attr = (name, value = '') => h.find(node => node.props[name] === value)
  const click = async name => { const button = attr(name); assert.ok(!button.props.disabled); button.props.onClick(); await settle() }
  const upload = async source => { const event = { target: { files: [source], value: 'C:/fakepath/pairs.json' } }; attr('data-font-pair-backup-file').props.onChange(event); assert.equal(event.target.value, ''); await settle() }
  const set = async changes => { props = { ...props, ...changes }; h.setProps(props); await settle() }
  const rowInput = (id, type) => walk(attr('data-font-pair-backup-row', id)).find(node => node.type === 'input' && (type === 'name' ? !node.props.type : node.props.type === type))
  const edit = async (id, name) => { rowInput(id, 'name').props.onChange({ target: { value: name } }); await settle() }
  return { h, io, files, urls, revoked, queue, confirmed, attr, click, upload, set, settle, rowInput, edit, cleanup: () => h.cleanup() }
}
let groups = 0
async function test(name, run) { await run(); groups++; console.log('PASS', name) }

await test('actual child previews without writes, validates rename/select and appends without applying a style', async () => {
  const f = await fixture({ raw: encode([profile('old', 'Saved')]) })
  await f.upload(file([profile('a', 'Saved'), profile('b', 'Other')], 'very-long-file-name.json'))
  assert.equal(f.io.writes, 0); assert.equal(f.confirmed.length, 0); assert.equal(f.attr('data-font-pair-backup-confirm').props.disabled, true)
  await f.edit('a', 'Imported'); f.rowInput('b', 'checkbox').props.onChange({ target: { checked: false } }); await f.settle()
  assert.equal(f.attr('data-font-pair-backup-confirm').props.disabled, false)
  await f.click('data-font-pair-backup-confirm')
  assert.deepEqual(JSON.parse(f.io.raw).profiles.map(item => item.name), ['Saved', 'Imported']); assert.equal(f.io.writes, 1); assert.equal(f.confirmed.length, 1)
  assert.ok(f.attr('data-font-pair-backup-saved')); assert.equal(f.h.all().some(node => Object.hasOwn(node.props, 'data-font-pair-backup-preview')), false)
  assert.deepEqual(Object.keys(f.confirmed[0].profiles[1]).sort(), ['id', 'name', 'styles']); f.cleanup()
})
await test('late file result/rejection, same-file reselection and explicit cancellation never replace a newer preview', async () => {
  const f = await fixture(), a = deferred(), b = deferred(), same = file([profile('new')])
  await f.upload({ name: 'old.json', size: 10, text: () => a.promise }); await f.upload(same); a.resolve(backup([profile('old')]))
  await f.settle(); assert.ok(f.attr('data-font-pair-backup-row', 'new')); assert.equal(f.h.all().some(node => node.props['data-font-pair-backup-row'] === 'old'), false)
  await f.upload(same); assert.ok(f.attr('data-font-pair-backup-row', 'new'))
  await f.upload({ name: 'late.json', size: 10, text: () => b.promise }); await f.click('data-font-pair-backup-cancel'); b.reject(new Error('late')); await f.settle()
  assert.equal(f.io.writes, 0); assert.equal(f.io.focus, 1); assert.equal(f.h.all().some(node => node.props.role === 'alert'), false); f.cleanup()
})
await test('deferred lock cancellation, hidden page, context ABA and StrictMode replay cannot write old previews', async () => {
  for (const action of ['cancel', 'hidden', 'locale', 'context', 'replay', 'unmount']) {
    const f = await fixture({ locked: true }); await f.upload(file([profile('a')])); await f.click('data-font-pair-backup-confirm'); assert.equal(f.queue.length, 1)
    if (action === 'cancel') await f.click('data-font-pair-backup-cancel')
    if (action === 'hidden') { f.h.document.visibilityState = 'hidden'; f.h.document.dispatch('visibilitychange'); await f.settle() }
    if (action === 'locale') { f.io.locale = 'en'; await f.settle(); f.io.locale = 'ko'; await f.settle() }
    if (action === 'context') { await f.set({ disabled: true }); await f.set({ disabled: false }) }
    if (action === 'replay') { f.h.replayEffects(); await f.settle() }
    if (action === 'unmount') f.cleanup()
    f.queue.shift()(); await flush(); if (action !== 'unmount') await f.settle()
    assert.equal(f.io.writes, 0, action); assert.equal(f.confirmed.length, 0, action); if (action !== 'unmount') f.cleanup()
  }
})
await test('external writes block stale preview and readback unknown requires refresh without rollback', async () => {
  const f = await fixture(); await f.upload(file([profile('a')])); const external = encode([profile('external')]); f.io.raw = external
  await f.click('data-font-pair-backup-confirm'); assert.equal(f.io.raw, external); assert.equal(f.io.writes, 0); assert.equal(f.io.conflicts, 1); assert.ok(f.attr('data-font-pair-backup-error', 'conflict')); f.cleanup()
  const g = await fixture(); await g.upload(file([profile('a')])); g.io.afterWriteDeny = true
  await g.click('data-font-pair-backup-confirm'); assert.equal(g.io.writes, 1); assert.equal(g.confirmed.length, 0); assert.equal(g.io.conflicts, 1); assert.ok(g.attr('data-font-pair-backup-error', 'unknownWrite')); assert.equal(JSON.parse(g.io.raw).profiles.length, 1); g.cleanup()
})
await test('quota and invalid files retain original data, explicit retry uses the same edited preview', async () => {
  const f = await fixture(); await f.upload(file([profile('a')])); await f.edit('a', 'Retained name'); f.io.quota = true
  await f.click('data-font-pair-backup-confirm'); assert.equal(f.io.raw, null); assert.equal(f.rowInput('a', 'name').props.value, 'Retained name'); assert.ok(f.attr('data-font-pair-backup-error', 'quota'))
  f.io.quota = false; await f.click('data-font-pair-backup-confirm'); assert.equal(JSON.parse(f.io.raw).profiles[0].name, 'Retained name')
  await f.upload({ name: 'broken.json', size: 1, text: async () => '{' }); assert.ok(f.attr('data-font-pair-backup-error', 'invalidData')); assert.equal(f.io.writes, 1); f.cleanup()
})
await test('download uses confirmed raw only, detects silent external edits and releases its object URL', async () => {
  const f = await fixture({ raw: encode([profile('old', 'Document')]) }); await f.click('data-font-pair-backup-download')
  assert.equal(f.files.length, 1); assert.equal(f.files[0].name, 'toolhub-font-pair-profiles.json')
  const content = JSON.parse(await f.files[0].blob.text()); assert.deepEqual(content.profiles, [profile('old', 'Document')]); assert.deepEqual(Object.keys(content).sort(), ['app', 'exportedAt', 'profiles', 'version'])
  f.io.raw = encode([profile('external')]); await f.click('data-font-pair-backup-download'); assert.equal(f.files.length, 1); assert.equal(f.io.conflicts, 1)
  f.cleanup(); assert.equal(f.urls.size, 0); assert.equal(f.revoked.length, 1)
})
await test('KO/EN UI resolves all text, uses44px buttons and16px inputs, empty backups do not write', async () => {
  for (const locale of ['ko', 'en']) {
    const f = await fixture({ locale }); await f.upload(file([profile('a', '한글 😀')]))
    assert.ok(!f.h.text().includes('pairing.')); assert.ok(f.h.all().filter(node => node.type === 'button').every(node => node.props.className.includes('min-h-11')))
    assert.ok(f.rowInput('a', 'name').props.className.includes('text-base')); await f.upload(file([])); assert.equal(f.attr('data-font-pair-backup-confirm').props.disabled, true)
    assert.equal(f.io.writes, 0); f.cleanup()
  }
})
console.log(`${groups} font backup unconnected child groups passed`)
