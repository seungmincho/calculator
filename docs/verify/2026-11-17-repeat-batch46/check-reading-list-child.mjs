import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { chunkText } from '../../../src/utils/tts.ts'
import { createTtsReadingRecord, TTS_READING_KEY } from '../../../src/utils/ttsReadingRecords.ts'

const defer = () => { let resolve; const promise = new Promise(yes => { resolve = yes }); return { promise, resolve } }
const manuscript = ' 첫 원고입니다.\r\n두 번째 😀 문장입니다. '
const settings = { voiceName: '기기 음성', rate: 1.2, pitch: 1, volume: 0.8, localVoicesOnly: true }
const draft = { text: manuscript, position: { index: 1, ...chunkText(manuscript)[1] }, settings }
const makeRecord = () => { const value = createTtsReadingRecord(draft, 'record-one', '첫 원고', 1794870000000); assert.ok(value.ok); return value.value }
const initialRaw = () => JSON.stringify({ version: 1, revision: 'initial', records: [makeRecord()] })
async function fixture({ locale = 'ko', raw = null, ready = true } = {}) {
  let currentRaw = raw, serial = 0
  const writes = [], applications = [], locks = [], io = { mode: '', hold: false }, messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'))
  Object.assign(messages.textToSpeech, JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch46/translations-tts.json', 'utf8'))[locale].textToSpeech)
  const port = { getItem(key) { assert.equal(key, TTS_READING_KEY); if (io.mode === 'blocked' || io.mode === 'unknown' && writes.length) throw Error('read denied'); return currentRaw }, setItem(key, value) { assert.equal(key, TTS_READING_KEY); if (io.mode === 'quota') { const error = Error('quota'); error.name = 'QuotaExceededError'; throw error }; currentRaw = value; writes.push(value) } }
  const props = { ready, inputRevision: 0, capture: () => ({ ok: true, value: draft }), onApply: value => { applications.push(value); return true } }
  const h = await componentHarness('src/components/TtsReadingList.tsx', { props, messages, storagePort: port,
    globals: { AbortController, crypto: { randomUUID: () => 'generated-' + ++serial } },
    navigator: { locks: { request(key, options, action) { assert.equal(key, TTS_READING_KEY); if (!io.hold) return Promise.resolve().then(action); const pending = defer(); locks.push({ ...pending, options }); return pending.promise.then(action) } } },
  })
  const settle = async () => { for (let i = 0; i < 6; i++) { await Promise.resolve(); await Promise.resolve(); h.render() } }
  const attr = (name, value = '') => h.find(node => node.props['data-tts-reading-' + name] === value)
  const click = async (name, value = '') => { attr(name, value).props.onClick(); await settle() }
  const save = async name => { attr('name').props.onChange({ target: { value: name } }); await settle(); h.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await settle() }
  const revise = async () => { props.inputRevision++; h.setProps(props); await settle() }
  h.render(); await settle()
  return { h, io, props, writes, applications, locks, attr, click, save, settle, revise, get raw() { return currentRaw }, set raw(value) { currentRaw = value }, cleanup: () => h.cleanup() }
}
let groups = 0
for (const locale of ['ko', 'en']) {
  const f = await fixture({ locale }); f.h.replayEffects(); await f.settle(); assert.equal(f.writes.length, 0); assert.equal(f.applications.length, 0)
  assert.ok(f.h.all().filter(node => node.type === 'button').every(node => node.props.className.includes('min-h-11'))); assert.ok(f.attr('name').props.className.includes('text-base'))
  await f.save('보관 원고'); assert.equal(f.writes.length, 1); const saved = JSON.parse(f.raw).records[0]; assert.equal(saved.text, manuscript); assert.equal(saved.position.index, 1); assert.equal(f.attr('success', 'saved').props.role, 'status')
  await f.click('load', saved.id); assert.equal(f.applications.length, 0); await f.click('cancel'); assert.equal(f.applications.length, 0)
  await f.click('load', saved.id); await f.click('confirm', 'load'); assert.equal(f.applications.length, 1); assert.equal(f.applications[0].index, 1); assert.equal(f.applications[0].record.settings.localVoicesOnly, true)
  await f.click('delete', saved.id); await f.click('confirm', 'delete'); assert.equal(f.applications.length, 1); assert.equal(JSON.parse(f.raw).records.length, 0); f.cleanup()
  groups++; console.log('PASS actual child initial0writes/explicit full snapshot/apply/delete leaves current manuscript/44px16px', locale)
}
{
  const f = await fixture({ raw: initialRaw() }); f.io.hold = true; await f.click('load', 'record-one'); await f.click('confirm', 'load'); assert.equal(f.locks.length, 1)
  await f.revise(); assert.equal(f.locks[0].options.signal.aborted, true); f.locks[0].resolve(); await f.settle(); assert.equal(f.applications.length, 0); assert.equal(f.writes.length, 0)
  await f.save('대기 원고'); const lock = f.locks.at(-1); await f.click('refresh'); lock.resolve(); await f.settle(); assert.equal(f.writes.length, 0)
  await f.click('load', 'record-one'); await f.click('confirm', 'load'); const unmount = f.locks.at(-1); f.cleanup(); unmount.resolve(); await Promise.resolve(); await Promise.resolve(); assert.equal(f.applications.length, 0)
  groups++; console.log('PASS input revision/refresh/unmount invalidate old load/save even when lock ignores abort')
}
{
  const f = await fixture(); f.io.mode = 'quota'; await f.save('실패 원고'); assert.equal(f.writes.length, 0); assert.equal(f.attr('name').props.value, '실패 원고'); assert.equal(f.attr('error', 'quota').props.role, 'alert'); assert.equal(f.attr('save').props.disabled, true)
  f.io.mode = ''; await f.click('refresh'); await f.save('정상 원고'); assert.equal(f.writes.length, 1)
  const previous = f.raw; f.raw = '{"version":2,"private":"keep"}'; f.h.window.dispatch('storage', { key: TTS_READING_KEY, newValue: f.raw }); await f.settle(); assert.equal(f.attr('error', 'conflict').props.role, 'alert'); await f.click('refresh'); assert.equal(f.attr('error', 'unsupported').props.role, 'alert'); assert.notEqual(f.raw, previous); assert.equal(f.writes.length, 1); assert.equal(f.applications.length, 0); f.cleanup()
  const u = await fixture(); u.io.mode = 'unknown'; await u.save('확인 불명'); assert.equal(u.writes.length, 1); assert.equal(u.attr('error', 'writeUnknown').props.role, 'alert'); assert.equal(u.attr('name').props.value, '확인 불명'); assert.equal(u.h.all().some(node => node.props['data-tts-reading-success'] === 'saved'), false); u.cleanup()
  groups++; console.log('PASS quota/readbackunknown retain name and raw; storage conflict/unsupported require reread')
}
{
  const record = makeRecord(); record.position = { ...record.position, end: record.position.end - 1, text: record.position.text.slice(0, -1) }
  const f = await fixture({ raw: JSON.stringify({ version: 1, revision: 'old-split', records: [record] }), ready: false })
  assert.equal(f.attr('load', record.id).props.disabled, true); assert.equal(f.applications.length, 0)
  f.props.ready = true; f.h.setProps(f.props); await f.settle()
  f.props.onApply = loaded => { f.applications.push(loaded); f.props.inputRevision++; f.h.setProps(f.props); return true }
  f.h.setProps(f.props); await f.click('load', record.id); await f.click('confirm', 'load')
  assert.equal(f.applications.length, 1); assert.equal(f.applications[0].record.text, manuscript); assert.equal(f.applications[0].index, 0); assert.equal(f.attr('success', 'positionChanged').props.role, 'status'); assert.equal(f.attr('save').props.disabled, true); assert.equal(f.writes.length, 0); f.cleanup()
  groups++; console.log('PASS initialization gate and changed sentence position apply original without auto action or self-cancel loop')
}
console.log(`TTS reading list child: ${groups} groups passed`)
