import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const KEY = 'toolhub:font-pair:profiles'
const styles = { title: { fontId: 'nanum-myeongjo', size: 64, weight: 900 }, body: { fontId: 'noto-sans-kr', size: 20, weight: 300 } }
const profile = (id, name = id) => ({ id, name, styles: structuredClone(styles) })
const raw = rows => JSON.stringify({ version: 1, profiles: rows })
const envelope = rows => JSON.stringify({ app: 'toolhub-font-pair-profiles', version: 1, exportedAt: '2026-11-17T03:00:00.000Z', profiles: rows })
const file = (rows, name = '독립 조합.json') => { const text = envelope(rows); return { name, size: Buffer.byteLength(text), text: async () => text } }
const pending = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const flush = () => new Promise(resolve => setImmediate(resolve))
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)]
const find = (h, key, value = '') => h.find(node => node.props[key] === value)
async function fixture(initial = [profile('existing', 'Existing')], initialReady = true) {
  const fragments = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch45/translations-font-backup.json', 'utf8'))
  const messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8')); messages.fontPreview.pairing.backup = fragments.ko.fontPreview.pairing.backup
  const io = { raw: raw(initial), hold: false, denied: false, quota: false, unknown: false, locale: 'ko' }, writes = [], queue = [], loads = [], files = [], urls = new Map(), revoked = [], focus = []
  let serial = 0
  const storage = { getItem(key) { assert.equal(key, KEY); if (io.denied) throw new Error('blocked'); return io.raw }, setItem(key, value) { assert.equal(key, KEY); if (io.quota) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); io.raw = value; writes.push(value); if (io.unknown) io.denied = true } }
  const navigator = { locks: { request(key, action) { assert.equal(key, KEY); if (!io.hold) return Promise.resolve().then(action); return new Promise((resolve, reject) => queue.push(() => { try { resolve(action()) } catch (error) { reject(error) } })) } } }
  class OwnedURL extends URL { static createObjectURL(blob) { const id = `blob:backup-independent-${++serial}`; urls.set(id, blob); return id } static revokeObjectURL(id) { revoked.push(id); urls.delete(id) } }
  const document = { body: { appendChild() {} }, createElement(tag) { assert.equal(tag, 'a'); return { href: '', download: '', click() { files.push({ name: this.download, blob: urls.get(this.href) }) }, remove() {} } } }
  const common = { messages, navigator, storagePort: storage, document, globals: { URL: OwnedURL, crypto: { randomUUID: () => 'id-' + ++serial } }, modules: { '@/contexts/LanguageContext': { useOptionalLanguage: () => ({ language: io.locale }) } } }
  let props = { ready: initialReady, styles: structuredClone(styles), onLoad(value) { loads.push(structuredClone(value)); return true } }
  const parent = await componentHarness('src/components/FontPairProfiles.tsx', { ...common, props, modules: { ...common.modules, '@/components/FontPairBackupPanel': { __esModule: true, default: 'Backup' } } }); parent.render()
  const cp = () => parent.find(node => node.type === 'Backup').props
  const input = { value: '', click() {}, focus() { focus.push('file') } }
  const child = await componentHarness('src/components/FontPairBackupPanel.tsx', { ...common, props: cp(), beforeEffects(tree) {
    for (const node of nodes(tree)) if (node.props.ref) node.props.ref.current = node.type === 'input' ? input : { focus() { focus.push('choose') } }
  } }); child.render()
  const settle = async () => { for (let i = 0; i < 3; i++) { await flush(); parent.render(); child.setProps(cp()) } }
  await settle()
  const click = async (host, key, value = '') => { const node = find(host, key, value); assert.ok(!node.props.disabled); node.props.onClick(); await settle() }
  const label = async key => { const node = parent.button(messages.fontPreview.pairing.profiles[key]); assert.ok(!node.props.disabled); node.props.onClick(); await settle() }
  const name = async value => { find(parent, 'id', 'font-pair-profile-name').props.onChange({ target: { value } }); await settle() }
  const save = async () => { parent.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await settle() }
  const upload = async value => { const target = { files: [value], value: 'selected' }; find(child, 'data-font-pair-backup-file').props.onChange({ target }); assert.equal(target.value, ''); await settle() }
  const rowName = async (id, value) => { const row = find(child, 'data-font-pair-backup-row', id); nodes(row).find(node => node.type === 'input' && node.props.type !== 'checkbox').props.onChange({ target: { value } }); await settle() }
  const setReady = async value => { props = { ...props, ready: value }; parent.setProps(props); await settle() }
  const locale = async value => { io.locale = value; Object.assign(messages, JSON.parse(fs.readFileSync(`messages/${value}.json`, 'utf8'))); messages.fontPreview.pairing.backup = fragments[value].fontPreview.pairing.backup; await settle() }
  const dispatch = async name => { if (name === 'hidden') { for (const h of [parent, child]) { h.document.visibilityState = 'hidden'; h.document.dispatch('visibilitychange') } } else for (const h of [parent, child]) h.window.dispatch(name); await settle() }
  return { parent, child, io, writes, queue, loads, files, urls, revoked, focus, input, props: () => props, cp, settle, click, label, name, save, upload, rowName, setReady, locale, dispatch, cleanup() { child.cleanup(); parent.cleanup() } }
}
let groups = 0
async function check(name, run) { await run(); groups++; console.log('PASS', name) }
await check('readiness guards preview; selected import updates list once without applying current styles or clearing user name', async () => {
  const f = await fixture([profile('existing', 'Existing')], false); assert.equal(find(f.child, 'data-font-pair-backup-choose').props.disabled, true); assert.equal(f.writes.length, 0); await f.setReady(true)
  await f.name('UNSAVED NAME'); const currentStyles = JSON.stringify(f.props().styles)
  await f.upload(file([profile('remote', 'ＥＸＩＳＴＩＮＧ'), profile('new', 'Second')]))
  assert.equal(find(f.child, 'data-font-pair-backup-confirm').props.disabled, true); await f.rowName('remote', 'Renamed')
  const row = find(f.child, 'data-font-pair-backup-row', 'new'); nodes(row).find(node => node.props.type === 'checkbox').props.onChange({ target: { checked: false } }); await f.settle()
  await f.click(f.child, 'data-font-pair-backup-confirm'); assert.equal(f.writes.length, 1); assert.deepEqual(JSON.parse(f.io.raw).profiles.map(row => row.name), ['Existing', 'Renamed']); assert.equal(f.loads.length, 0)
  assert.equal(JSON.stringify(f.props().styles), currentStyles); assert.equal(find(f.parent, 'id', 'font-pair-profile-name').props.value, 'UNSAVED NAME'); assert.ok(find(f.child, 'data-font-pair-backup-saved'))
  await f.label('load'); assert.equal(f.loads.length, 1); assert.equal(f.writes.length, 1); f.cleanup()
})
await check('same-raw refresh, parent save and new file each cancel an earlier deferred import without stale final UI', async () => {
  for (const next of ['refresh', 'save', 'file']) {
    const f = await fixture([]); f.io.hold = true; await f.upload(file([profile('old')]))
    await f.click(f.child, 'data-font-pair-backup-confirm'); assert.equal(f.queue.length, 1)
    if (next === 'refresh') await f.label('refresh')
    if (next === 'save') { await f.name('PARENT'); await f.save() }
    if (next === 'file') { await f.click(f.child, 'data-font-pair-backup-cancel'); await f.upload(file([profile('latest')])) }
    f.queue.shift()(); await f.settle(); assert.equal(f.writes.length, 0); assert.equal(f.loads.length, 0)
    if (next === 'save') { f.queue.shift()(); await f.settle(); assert.deepEqual(JSON.parse(f.io.raw).profiles.map(row => row.name), ['PARENT']) }
    if (next === 'file') { assert.ok(find(f.child, 'data-font-pair-backup-row', 'latest')); await f.click(f.child, 'data-font-pair-backup-confirm'); f.queue.shift()(); await f.settle(); assert.deepEqual(JSON.parse(f.io.raw).profiles.map(row => row.name), ['latest']) }
    f.cleanup()
  }
})
await check('legacy pending save and delete cannot cross hide/pagehide/unmount/replay and new requests survive old completion', async () => {
  for (const operation of ['save', 'delete']) for (const boundary of ['hidden', 'pagehide', 'unmount', 'replay']) {
    const f = await fixture(), before = f.io.raw; f.io.hold = true
    if (operation === 'save') { await f.name('Captured'); await f.save() } else { await f.label('delete'); await f.label('deleteConfirm') }
    const old = f.queue.shift(); assert.equal(typeof old, 'function')
    if (boundary === 'unmount') f.cleanup()
    else if (boundary === 'replay') { f.parent.replayEffects(); f.child.replayEffects(); await f.settle() }
    else await f.dispatch(boundary)
    if (boundary === 'replay') { await f.name('New owner'); await f.save(); assert.equal(f.queue.length, 1) }
    old(); await flush(); if (boundary !== 'unmount') await f.settle(); assert.equal(f.io.raw, before); assert.equal(f.writes.length, 0)
    if (boundary === 'replay') { assert.equal(find(f.parent, 'id', 'font-pair-profile-name').props.disabled, true); f.queue.shift()(); await f.settle(); assert.equal(JSON.parse(f.io.raw).profiles.at(-1).name, 'New owner') }
    if (boundary !== 'unmount') f.cleanup()
  }
})
await check('unknown readback blocks actions with saved bytes intact; external CAS and quota retain both drafts', async () => {
  const f = await fixture([]); await f.name('MY DRAFT'); await f.upload(file([profile('incoming')]))
  f.io.unknown = true; await f.click(f.child, 'data-font-pair-backup-confirm'); assert.equal(f.writes.length, 1); assert.ok(find(f.child, 'data-font-pair-backup-error', 'unknownWrite')); assert.equal(f.cp().disabled, true); assert.equal(f.loads.length, 0)
  f.io.denied = false; f.io.unknown = false; await f.label('refresh'); assert.equal(f.cp().snapshot.profiles.length, 1); assert.equal(find(f.parent, 'id', 'font-pair-profile-name').props.value, 'MY DRAFT'); assert.equal(f.writes.length, 1)
  await f.upload(file([profile('another')]))
  const external = raw([profile('elsewhere')]); f.io.raw = external; f.parent.window.dispatch('storage', { key: KEY, newValue: external }); await f.settle(); assert.equal(find(f.child, 'data-font-pair-backup-confirm').props.disabled, true)
  await f.label('refresh'); assert.equal(find(f.child, 'data-font-pair-backup-confirm').props.disabled, true); await f.upload(file([profile('another')]))
  f.io.quota = true; await f.click(f.child, 'data-font-pair-backup-confirm'); assert.ok(find(f.child, 'data-font-pair-backup-error', 'quota')); assert.equal(f.io.raw, external); assert.ok(find(f.child, 'data-font-pair-backup-row', 'another')); f.cleanup()
})
await check('file reads respect newest preview, readiness/locale ABA and cancellation without touching stored styles', async () => {
  const f = await fixture(), before = f.io.raw, a = pending(); await f.upload({ name: 'old.json', size: 20, text: () => a.promise }); await f.upload(file([profile('new')], 'new.json')); a.reject(new Error('late')); await f.settle(); assert.ok(find(f.child, 'data-font-pair-backup-row', 'new'))
  const b = pending(); await f.upload({ name: 'wait.json', size: 20, text: () => b.promise }); await f.setReady(false); await f.setReady(true); b.resolve(envelope([profile('bad')]))
  await f.settle(); assert.equal(f.child.all().some(node => node.props['data-font-pair-backup-row'] === 'bad'), false)
  const c = pending(); await f.upload({ name: 'locale.json', size: 20, text: () => c.promise }); await f.locale('en'); await f.locale('ko'); c.resolve(envelope([profile('old-locale')])); await f.settle(); assert.equal(f.child.all().some(node => node.props['data-font-pair-backup-row'] === 'old-locale'), false)
  const d = pending(); await f.upload({ name: 'cancel.json', size: 20, text: () => d.promise }); await f.click(f.child, 'data-font-pair-backup-cancel'); d.resolve(envelope([profile('cancel')])); await f.settle(); assert.equal(f.focus.at(-1), 'choose'); assert.equal(f.io.raw, before); assert.equal(f.writes.length, 0); f.cleanup()
})
await check('actual JSON download only contains stored profiles, unknown-version read is nonmutating, URLs owned through cleanup', async () => {
  const f = await fixture(); await f.name('PRIVATE EDIT'); await f.click(f.child, 'data-font-pair-backup-download')
  assert.equal(f.files.length, 1); const downloaded = JSON.parse(await f.files[0].blob.text()); assert.equal(f.files[0].name, 'toolhub-font-pair-profiles.json'); assert.equal(downloaded.app, 'toolhub-font-pair-profiles'); assert.deepEqual(downloaded.profiles, [profile('existing', 'Existing')]); assert.equal(JSON.stringify(downloaded).includes('PRIVATE EDIT'), false)
  assert.equal(downloaded.profiles[0].styles.title.weight, 900); assert.ok(f.urls.size > 0)
  const future = JSON.stringify({ ...downloaded, version: 2 }); await f.upload({ name: 'future.json', size: Buffer.byteLength(future), text: async () => future }); assert.ok(find(f.child, 'data-font-pair-backup-error', 'unsupportedVersion')); assert.equal(f.writes.length, 0); assert.equal(f.loads.length, 0)
  f.cleanup(); assert.equal(f.urls.size, 0); assert.equal(f.revoked.length, 1)
})
console.log(`Font backup independent actual parent: ${groups} groups passed`)
