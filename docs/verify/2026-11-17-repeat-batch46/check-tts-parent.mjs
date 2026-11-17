import assert from 'node:assert/strict'
import { ttsFixture, local, remote, manuscript } from './tts-parent-harness.mjs'
import { chunkText } from '../../../src/utils/tts.ts'
import { createTtsReadingRecord, TTS_READING_KEY } from '../../../src/utils/ttsReadingRecords.ts'

const savedText = ' 저장한 첫째입니다.\r\n저장한 둘째 😀 입니다. 세 번째입니다. '
const makeRecord = (settings = {}) => { const result = createTtsReadingRecord({ text: savedText, position: { index: 1, ...chunkText(savedText)[1] }, settings: { voiceName: local.name, rate: 1.3, pitch: 1.1, volume: 0.7, localVoicesOnly: true, ...settings } }, 'record', '원고', Date.now()); assert.ok(result.ok); return result.value }
const raw = record => JSON.stringify({ version: 1, revision: 'r1', records: [record] })
let groups = 0
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log('PASS', name) }

await check('URL/handoff/early input priorities and reading-list initial0writes/no automatic speech', async () => {
  const transfer = JSON.stringify({ source: 'notepad', text: manuscript, createdAt: Date.now() })
  const f = await ttsFixture({ url: 'https://toolhub.ai.kr/text-to-speech/?from=notepad&t=URL%20TEXT&r=1.5', storage: { 'toolhub-ocr-tts-v1': transfer, [TTS_READING_KEY]: raw(makeRecord()) } })
  assert.equal(f.node('tts-text').props.value, 'URL TEXT'); assert.equal(f.node('tts-rate').props.value, 1.5); assert.equal(f.values.get('toolhub-ocr-tts-v1'), transfer); assert.equal(f.writes.filter(item => item[0] === TTS_READING_KEY).length, 0); assert.equal(f.utterances.length, 0); f.cleanup()
  const h = await ttsFixture({ url: 'https://toolhub.ai.kr/text-to-speech/?from=notepad', storage: { 'toolhub-ocr-tts-v1': transfer } }); assert.equal(h.node('tts-text').props.value, manuscript); assert.equal(h.attr('local-only').props.checked, true); assert.equal(h.values.has('toolhub-ocr-tts-v1'), false); assert.equal(h.utterances.length, 0); h.cleanup()
  const early = await ttsFixture({ hydrated: false, url: 'https://toolhub.ai.kr/text-to-speech/?t=OLD' }); await early.edit('tts-text', 'early user'); await early.hydrate(); assert.equal(early.node('tts-text').props.value, 'early user'); early.cleanup()
})
await check('speaking/paused/recovery capture exact current sentence and manual save never stores repeat runtime', async () => {
  const f = await ttsFixture(); await f.edit('tts-text', manuscript); await f.click('play'); await f.end(); const second = chunkText(manuscript)[1]
  assert.equal(f.props().capture().value.position.text, second.text); await f.click('play'); assert.equal(f.attr('root').props['data-tts-status'], 'paused'); assert.equal(f.props().capture().value.position.index, 1)
  await f.click('play'); await f.fail(); assert.equal(f.props().capture().value.position.index, 1); await f.save('실패 문장 원고'); const record = JSON.parse(f.values.get(TTS_READING_KEY)).records[0]
  assert.equal(record.text, manuscript); assert.deepEqual(record.position, { index: 1, ...second }); assert.equal('repeat' in record, false); assert.equal('generation' in record, false); assert.equal(f.utterances.length, 3); f.cleanup()
})
await check('explicit load cancels old utterance/repeat callbacks, does not autoplay, next Play uses saved sentence', async () => {
  const f = await ttsFixture({ storage: { [TTS_READING_KEY]: raw(makeRecord()) } }); await f.edit('tts-text', manuscript); await f.repeat(true); await f.click('play'); const old = f.utterances[0]
  await f.end(); await f.end(); await f.end(); const gap = f.timers.find(item => item.delay === 2000 && !item.canceled); assert.ok(gap)
  const count = f.utterances.length; await f.load('record'); assert.equal(f.utterances.length, count); assert.equal(f.node('tts-text').props.value, savedText); assert.equal(f.attr('repeat').props.checked, false); assert.equal(f.attr('root').props['data-tts-start-from'], 1)
  old.onend(); old.onerror({ error: 'network' }); old.onboundary({ name: 'word', charIndex: 0, charLength: 2 }); gap.callback(); await f.settle(); assert.equal(f.utterances.length, count); assert.equal(f.node('tts-text').props.value, savedText)
  await f.click('play'); assert.equal(f.utterances.at(-1).text, chunkText(savedText)[1].text); assert.equal(f.utterances.at(-1).rate, 1.3); assert.equal(f.utterances.at(-1).voice.localService, true); f.cleanup()
})
await check('local-only0 blocks UI and old/direct speech handlers; voice arrivals honor latest record/user intent', async () => {
  const f = await ttsFixture({ voices: [remote], storage: { [TTS_READING_KEY]: raw(makeRecord()) } }); const oldPlay = f.attr('play').props.onClick; await f.load('record')
  assert.equal(f.attr('play').props.disabled, true); oldPlay(); await f.settle(); assert.equal(f.constructed.length, 0); assert.equal(f.utterances.length, 0); assert.equal(f.attr('voice-notice', 'noLocalVoice').props.role, 'status')
  await f.setVoices([remote, local]); assert.equal(f.attr('play').props.disabled, false); assert.equal(f.utterances.length, 0); await f.click('play'); assert.equal(f.utterances.at(-1).voice.name, local.name)
  await f.setVoices([remote]); const before = f.utterances.length; await f.end(); assert.equal(f.utterances.length, before); assert.equal(f.attr('root').props['data-tts-status'], 'stopped'); f.cleanup()
  const other = { ...local, name: 'other' }, g = await ttsFixture({ voices: [other], storage: { [TTS_READING_KEY]: raw(makeRecord()) } }); await g.load('record'); assert.equal(g.node('tts-voice').props.value, 'other'); await g.edit('tts-voice', 'other'); await g.setVoices([local, other]); assert.equal(g.node('tts-voice').props.value, 'other'); g.cleanup()
  const pending = await ttsFixture({ voices: [], storage: { [TTS_READING_KEY]: raw(makeRecord()) } }); pending.io.hold = true; await pending.load('record'); await pending.setVoices([local]); pending.locks[0].resolve(); await pending.settle(); assert.equal(pending.node('tts-voice').props.value, local.name); assert.equal(pending.attr('play').props.disabled, false); assert.equal(pending.utterances.length, 0); pending.cleanup()
})
await check('pending load canceled by current explicit text/settings/play intents and unmount', async () => {
  const actions = [f => f.edit('tts-text', '새 입력'), f => f.edit('tts-rate', '1.6'), f => f.edit('tts-voice', remote.name), f => f.localOnly(true), f => f.repeat(true), f => f.click('play')]
  for (const action of actions) {
    const f = await ttsFixture({ storage: { [TTS_READING_KEY]: raw(makeRecord()) } }); await f.edit('tts-text', manuscript); f.io.hold = true; await f.load('record'); await action(f); const current = f.node('tts-text').props.value; assert.equal(f.locks[0].options.signal.aborted, true); f.locks[0].resolve(); await f.settle(); assert.equal(f.node('tts-text').props.value, current); assert.notEqual(current, savedText); f.cleanup()
  }
  const f = await ttsFixture({ storage: { [TTS_READING_KEY]: raw(makeRecord()) } }); f.io.hold = true; await f.load('record'); f.cleanup(); f.locks[0].resolve(); await f.settle(); assert.equal(f.utterances.length, 0)
})
await check('late clipboard paste/link and localeABA cannot replace loaded text or restore obsolete feedback', async () => {
  const f = await ttsFixture({ storage: { [TTS_READING_KEY]: raw(makeRecord()) } }); f.io.paste = 'wait'; await f.click('paste'); await f.load('record'); f.reads[0].resolve('old pasted text'); await f.settle(); assert.equal(f.node('tts-text').props.value, savedText)
  f.io.copy = 'wait'; await f.click('copy-link'); const old = f.copies.at(-1); await f.edit('tts-text', 'new text'); old.reject(Error('old')); await f.settle(); assert.ok(!f.h.text().includes(f.messages.textToSpeech.share.copyFailed))
  await f.click('copy-link'); const aba = f.copies.at(-1); await f.locale('en'); await f.locale('ko'); aba.resolve(); await f.settle(); assert.ok(!f.h.text().includes(f.messages.textToSpeech.share.copied)); f.cleanup()
})
await check('changed split preserves original and asks first selection; 30001 input remains editable but cannot save', async () => {
  const record = makeRecord(); record.position.end--; record.position.text = record.position.text.slice(0, -1)
  const f = await ttsFixture({ storage: { [TTS_READING_KEY]: raw(record) } }); await f.load('record'); assert.equal(f.node('tts-text').props.value, savedText); assert.equal(f.attr('root').props['data-tts-start-from'], 0); assert.equal(f.list('success', 'positionChanged').props.role, 'status'); assert.equal(f.utterances.length, 0)
  await f.click('play'); assert.equal(f.utterances.at(-1).text, chunkText(savedText)[0].text); await f.edit('tts-text', '가'.repeat(30001)); await f.save('큰 원고'); assert.equal(f.node('tts-text').props.value.length, 30001); assert.equal(f.list('error', 'textTooLong').props.role, 'alert'); assert.equal(JSON.parse(f.values.get(TTS_READING_KEY)).records.length, 1); f.cleanup()
})
await check('13th recovery exact retry/current settings and same-session old callbacks remain protected', async () => {
  const f = await ttsFixture(); await f.edit('tts-text', manuscript); await f.click('play'); const first = f.utterances[0]; await f.end(); await f.fail(); await f.edit('tts-rate', '1.5'); await f.edit('tts-voice', remote.name); await f.click('retry'); assert.equal(f.utterances.at(-1).text, chunkText(manuscript)[1].text); assert.equal(f.utterances.at(-1).rate, 1.5); assert.equal(f.utterances.at(-1).voice.name, remote.name)
  const count = f.utterances.length; await f.fail('network', first); await f.end(first); assert.equal(f.utterances.length, count); f.io.throwSpeech = true; await f.jump(0); assert.ok(f.h.text().includes('synthesis-failed')); await f.click('retry'); assert.equal(f.utterances.at(-1).text, chunkText(manuscript)[0].text); f.cleanup()
})
await check('corrupt list does not block TTS; deleting/rereading an active record leaves speech/current manuscript intact', async () => {
  const f = await ttsFixture({ storage: { [TTS_READING_KEY]: '{bad' } }); await f.edit('tts-text', manuscript); await f.click('play'); assert.equal(f.utterances.length, 1); assert.equal(f.values.get(TTS_READING_KEY), '{bad'); f.cleanup()
  const g = await ttsFixture({ storage: { [TTS_READING_KEY]: raw(makeRecord()) } }); await g.load('record'); await g.click('play'); const count = g.utterances.length, cancels = g.synth.canceled; await g.listClick('delete', 'record'); await g.listClick('confirm', 'delete'); await g.listClick('refresh'); assert.equal(g.node('tts-text').props.value, savedText); assert.equal(g.attr('root').props['data-tts-status'], 'speaking'); assert.equal(g.utterances.length, count); assert.equal(g.synth.canceled, cancels); g.cleanup()
})
console.log(`TTS reading actual parent: ${groups} groups passed`)
