import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const KEY = 'toolhub:font-pair:profiles', fragment = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch45/translations-font-backup.json', 'utf8'))
const styles = { title: { fontId: 'noto-serif-kr', size: 48, weight: 600 }, body: { fontId: 'pretendard', size: 18, weight: 400 } }
const profile = (id, name = id) => ({ id, name, styles: structuredClone(styles) })
const encode = profiles => JSON.stringify({ version: 1, profiles })
const file = profiles => { const text = JSON.stringify({ app: 'toolhub-font-pair-profiles', version: 1, exportedAt: '2026-11-17T00:00:00.000Z', profiles }); return { name: 'pairs.json', size: Buffer.byteLength(text), text: async () => text } }
const flush = () => new Promise(resolve => setImmediate(resolve))
async function fixture({ raw = null, locked = false, ready = true } = {}) {
  let sequence = 0, props
  const messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8')); messages.fontPreview.pairing.backup = fragment.ko.fontPreview.pairing.backup
  const io = { raw, writes: 0, denied: false, quota: false, afterWriteDeny: false }, queue = [], applied = []
  const storage = { getItem(key) { assert.equal(key, KEY); if (io.denied) throw new Error('denied'); return io.raw }, setItem(key, value) { assert.equal(key, KEY); if (io.quota) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); io.raw = value; io.writes++; if (io.afterWriteDeny) io.denied = true } }
  const navigator = locked ? { locks: { request(key, action) { assert.equal(key, KEY); return new Promise((resolve, reject) => queue.push(() => { try { resolve(action()) } catch (error) { reject(error) } })) } } } : {}
  const common = { messages, storagePort: storage, navigator, globals: { crypto: { randomUUID: () => `new-${++sequence}` } }, modules: { '@/contexts/LanguageContext': { useOptionalLanguage: () => ({ language: 'ko' }) } } }
  props = { styles: structuredClone(styles), ready, onLoad(value) { applied.push(value); return true } }
  const parent = await componentHarness('src/components/FontPairProfiles.tsx', { ...common, props, modules: { ...common.modules, '@/components/FontPairBackupPanel': { __esModule: true, default: 'FontPairBackupPanel' } } }); parent.render()
  const childProps = () => parent.find(node => node.type === 'FontPairBackupPanel').props
  const child = await componentHarness('src/components/FontPairBackupPanel.tsx', { ...common, props: childProps() }); child.render()
  const settle = async () => { await flush(); parent.render(); child.setProps(childProps()); await flush(); child.render() }
  await settle()
  const attr = (host, name, value = '') => host.find(node => node.props[name] === value)
  const click = async (host, name) => { const button = attr(host, name); assert.ok(!button.props.disabled); button.props.onClick(); await settle() }
  const labelled = async key => { const button = parent.button(messages.fontPreview.pairing.profiles[key]); assert.ok(!button.props.disabled); button.props.onClick(); await settle() }
  const name = async value => { attr(parent, 'id', 'font-pair-profile-name').props.onChange({ target: { value } }); await settle() }
  const save = async () => { parent.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await settle() }
  const upload = async profiles => { attr(child, 'data-font-pair-backup-file').props.onChange({ target: { files: [file(profiles)], value: 'file' } }); await settle() }
  return { parent, child, messages, io, queue, applied, attr, click, labelled, name, save, upload, settle, childProps,
    async ready(value) { props = { ...props, ready: value }; parent.setProps(props); await settle() }, cleanup() { child.cleanup(); parent.cleanup() } }
}
let groups = 0
async function test(name, run) { await run(); groups++; console.log('PASS', name) }

await test('actual parent retains explicit save/load and guards backup until shared URL restoration is ready', async () => {
  const f = await fixture({ raw: encode([profile('old')]), ready: false })
  assert.equal(f.childProps().disabled, true); assert.equal(f.applied.length, 0); await f.ready(true)
  assert.equal(f.childProps().disabled, false); await f.labelled('load'); assert.equal(f.applied.length, 1)
  await f.name('Current style'); await f.save(); assert.equal(f.io.writes, 1); assert.equal(f.attr(f.parent, 'id', 'font-pair-profile-name').props.value, '')
  assert.deepEqual(JSON.parse(f.io.raw).profiles.map(item => item.name), ['old', 'Current style']); assert.equal(f.childProps().snapshot.profiles.length, 2); f.cleanup()
})
await test('actual child import updates parent list once, never loads styles and clears pending delete confirmation', async () => {
  const f = await fixture({ raw: encode([profile('old')]) }); await f.labelled('delete'); assert.ok(f.parent.text().includes(f.messages.fontPreview.pairing.profiles.deleteConfirm))
  await f.upload([profile('source', 'Imported')]); await f.click(f.child, 'data-font-pair-backup-confirm')
  assert.equal(f.io.writes, 1); assert.equal(f.applied.length, 0); assert.ok(f.parent.text().includes('Imported')); assert.equal(f.childProps().snapshot.profiles.length, 2)
  assert.equal(f.parent.all().some(node => node.type === 'button' && String(node.props.children) === f.messages.fontPreview.pairing.profiles.deleteConfirm), false)
  await f.labelled('load'); assert.equal(f.applied.length, 1); f.cleanup()
})
await test('queued import loses ownership to parent save or explicit refresh even when storage raw is unchanged', async () => {
  for (const action of ['save', 'refresh']) {
    const f = await fixture({ locked: true }); await f.upload([profile('source')]); await f.click(f.child, 'data-font-pair-backup-confirm')
    if (action === 'save') { await f.name('Parent save'); await f.save() } else await f.labelled('refresh')
    assert.equal(f.queue.length, action === 'save' ? 2 : 1); f.queue.shift()(); await f.settle(); assert.equal(f.io.writes, 0)
    if (action === 'save') { f.queue.shift()(); await f.settle(); assert.equal(f.io.writes, 1); assert.equal(JSON.parse(f.io.raw).profiles[0].name, 'Parent save') }
    assert.equal(f.applied.length, 0); f.cleanup()
  }
})
await test('legacy save/delete queued locks cannot write after hide, pagehide, unmount or StrictMode replay', async () => {
  for (const operation of ['save', 'delete']) for (const boundary of ['hidden', 'pagehide', 'unmount', 'replay']) {
    const raw = encode([profile('old')]), f = await fixture({ locked: true, raw })
    if (operation === 'save') { await f.name('Retain me'); await f.save() } else { await f.labelled('delete'); await f.labelled('deleteConfirm') }
    assert.equal(f.queue.length, 1)
    if (boundary === 'hidden') { f.parent.document.visibilityState = 'hidden'; f.parent.document.dispatch('visibilitychange') }
    if (boundary === 'pagehide') f.parent.window.dispatch('pagehide')
    if (boundary === 'unmount') f.cleanup()
    if (boundary === 'replay') { f.parent.replayEffects(); f.child.replayEffects() }
    f.queue.shift()(); await flush(); if (boundary !== 'unmount') await f.settle()
    assert.equal(f.io.raw, raw, `${operation}/${boundary}`); assert.equal(f.io.writes, 0)
    if (boundary === 'replay') {
      assert.equal(f.attr(f.parent, 'id', 'font-pair-profile-name').props.disabled, false)
      await f.name('After replay'); await f.save(); assert.equal(f.queue.length, 1)
      f.queue.shift()(); await f.settle(); assert.equal(f.io.writes, 1)
    }
    if (boundary !== 'unmount') f.cleanup()
  }
})
await test('storage events protect drafts and preview, refreshed changed basis needs a new file selection', async () => {
  const f = await fixture(); await f.name('Unsaved name'); await f.upload([profile('source')])
  const external = encode([profile('external')]); f.io.raw = external; f.parent.window.dispatch('storage', { key: KEY, newValue: external }); await f.settle()
  assert.equal(f.childProps().disabled, true); assert.equal(f.attr(f.parent, 'id', 'font-pair-profile-name').props.value, 'Unsaved name')
  await f.labelled('refresh'); assert.equal(f.childProps().disabled, false); assert.equal(f.attr(f.child, 'data-font-pair-backup-confirm').props.disabled, true)
  await f.upload([profile('source')]); await f.click(f.child, 'data-font-pair-backup-confirm'); assert.deepEqual(JSON.parse(f.io.raw).profiles.map(item => item.name), ['external', 'source']); assert.equal(f.applied.length, 0); f.cleanup()
})
await test('readback unknown blocks parent actions until explicit refresh and keeps confirmed data', async () => {
  const f = await fixture(); await f.upload([profile('source')]); f.io.afterWriteDeny = true
  await f.click(f.child, 'data-font-pair-backup-confirm'); assert.equal(f.io.writes, 1); assert.equal(f.childProps().disabled, true)
  assert.ok(f.attr(f.child, 'data-font-pair-backup-error', 'unknownWrite')); assert.equal(f.applied.length, 0)
  f.io.denied = false; f.io.afterWriteDeny = false; await f.labelled('refresh'); assert.equal(f.childProps().snapshot.profiles.length, 1); assert.equal(f.io.writes, 1)
  await f.labelled('delete'); await f.labelled('deleteConfirm'); assert.equal(JSON.parse(f.io.raw).profiles.length, 0); assert.equal(f.applied.length, 0); f.cleanup()
})
console.log(`${groups} font backup actual parent groups passed`)
