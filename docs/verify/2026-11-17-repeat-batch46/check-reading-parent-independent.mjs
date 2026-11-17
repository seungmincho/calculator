import assert from 'node:assert/strict'
import fs from 'node:fs'
import { ttsFixture, local, remote } from './tts-parent-harness.mjs'

const KEY = 'toolhub-tts-reading-list-v1', HANDOFF = 'toolhub-ocr-tts-v1'
const manuscript = 'First. Second. Third.'
const positions = [{ index: 0, start: 0, end: 6, text: 'First.' }, { index: 1, start: 7, end: 14, text: 'Second.' }, { index: 2, start: 15, end: 21, text: 'Third.' }]
const settings = { voiceName: 'wanted', rate: 1.2, pitch: 0.9, volume: 0.4, localVoicesOnly: true }
const record = (overrides = {}) => ({ id: 'saved-one', name: 'Saved manuscript', text: manuscript, createdAt: 1700000000000, position: positions[2], settings: { ...settings }, ...overrides })
const rawRecords = (...records) => JSON.stringify({ version: 1, revision: 'seed-1', records })
const plain = value => JSON.parse(JSON.stringify(value))
const capture = f => { const value = f.props().capture(); assert.equal(value.ok, true); return plain(value.value) }
const state = f => f.attr('root').props['data-tts-status']

const tests = []
const test = (name, run) => tests.push({ name, run })
test('empty current voices list blocks local-only buttons, captured entry and next utterance', async () => {
  const observations = []
  for (const mode of ['stopped', 'speaking', 'repeat-wait']) {
    const f = await ttsFixture({ voices: [local, remote] })
    try {
      await f.edit('tts-text', '첫째 문장입니다. 둘째 문장입니다.'); await f.localOnly(true)
      const oldPlay = f.attr('play').props.onClick
      let gap
      if (mode === 'speaking') await f.click('play')
      if (mode === 'repeat-wait') { await f.repeat(true); await f.click('play'); await f.end(); await f.end(); gap = f.timers.findLast(timer => timer.delay === 2000 && !timer.canceled) }
      const before = f.utterances.length
      await f.setVoices([])
      const disabled = f.attr('play').props.disabled
      if (mode === 'speaking') await f.end()
      else if (mode === 'repeat-wait') { gap.callback(); await f.settle() }
      else { oldPlay(); await f.settle() }
      const addedUtterances = f.utterances.length - before
      await f.setVoices([local])
      observations.push({ mode, disabled, addedUtterances, restoredAllowed: !f.attr('play').props.disabled, restoredNoNotice: !f.h.all().some(node => node.props?.['data-tts-voice-notice'] === 'noLocalVoice') })
    } finally { f.cleanup() }
  }
  if (process.argv.includes('--record-empty-voices')) fs.writeFileSync(new URL('independent-parent-empty-voices-before-fix.json', import.meta.url), JSON.stringify(observations, null, 2) + '\n')
  for (const value of observations) assert.deepEqual(value, { mode: value.mode, disabled: true, addedUtterances: 0, restoredAllowed: true, restoredNoNotice: true })
})

test('early text edit beats URL restore and unmounted read or load cannot modify source or saved bytes', async () => {
  const raw = rawRecords(record()), f = await ttsFixture({ hydrated: false, url: 'https://toolhub.ai.kr/text-to-speech/?t=URL%20original.&r=1.4', storage: { [KEY]: raw } })
  try {
    assert.equal(f.props().ready, false); assert.equal(f.list('save').props.disabled, true); assert.equal(f.child.all().some(node => node.props?.['data-tts-reading-load'] === 'saved-one'), false); assert.equal(f.writes.length, 0)
    await f.edit('tts-text', 'Early manual text.'); await f.hydrate()
    assert.equal(f.node('tts-text').props.value, 'Early manual text.'); assert.equal(f.props().ready, true)
    assert.equal(f.values.get(KEY), raw); assert.equal(f.utterances.length, 0)
    f.io.paste = 'wait'; await f.click('paste'); const oldRead = f.reads.at(-1)
    f.io.hold = true; await f.load('saved-one'); const oldLock = f.locks.at(-1)
    f.cleanup(); assert.equal(oldLock.options.signal.aborted, true)
    oldRead.resolve('Unmounted old paste.'); oldLock.resolve(); await f.settle()
    assert.equal(f.values.get(KEY), raw); assert.equal(f.node('tts-text').props.value, 'Early manual text.'); assert.equal(f.utterances.length, 0)
    assert.equal(f.writes.filter(([key]) => key === KEY).length, 0)
  } finally { f.cleanup() }
})

test('saved voice intent survives late arrival but direct voice choice replaces that intent', async () => {
  const raw = rawRecords(record()), wanted = { ...local, name: 'wanted' }, manual = { ...local, name: 'manual' }
  const f = await ttsFixture({ voices: [], storage: { [KEY]: raw, 'tts.voice': 'old preference' } })
  try {
    assert.equal(f.props().ready, true); assert.equal(f.values.get(KEY), raw); assert.equal(f.utterances.length, 0)
    await f.load('saved-one'); assert.equal(f.node('tts-text').props.value, manuscript); assert.equal(f.attr('play').props.disabled, true)
    await f.setVoices([remote]); assert.equal(f.attr('play').props.disabled, true); assert.equal(f.utterances.length, 0)
    await f.setVoices([local, wanted]); assert.equal(f.node('tts-voice').props.value, 'wanted'); assert.equal(f.utterances.length, 0)
    await f.click('play'); assert.equal(f.utterances.at(-1).text, 'Third.'); assert.equal(f.utterances.at(-1).voice.name, 'wanted')
    assert.equal(f.utterances.at(-1).rate, 1.2); assert.equal(f.utterances.at(-1).pitch, 0.9); assert.equal(f.utterances.at(-1).volume, 0.4)
    await f.click('stop'); await f.setVoices([local, wanted, manual]); await f.edit('tts-voice', 'manual')
    await f.setVoices([wanted, manual, local]); assert.equal(f.node('tts-voice').props.value, 'manual')
    assert.equal(f.values.get('tts.voice'), 'manual'); assert.equal(f.values.get(KEY), raw)
    assert.equal(f.writes.filter(([key]) => key === KEY).length, 0)
  } finally { f.cleanup() }
})

test('actual capture prefers failure then speaking or pause and restored start while auto progress keeps save snapshot', async () => {
  const f = await ttsFixture({ storage: { [KEY]: rawRecords(record()) } })
  try {
    await f.edit('tts-text', manuscript); assert.deepEqual(capture(f).position, positions[0])
    await f.jump(1); assert.deepEqual(capture(f).position, positions[1]); await f.click('play')
    assert.equal(state(f), 'paused'); assert.deepEqual(capture(f).position, positions[1])
    await f.click('play'); await f.fail('network'); assert.equal(state(f), 'stopped'); assert.deepEqual(capture(f).position, positions[1])
    await f.edit('tts-rate', '1.5'); assert.deepEqual(capture(f).position, positions[1])
    await f.click('stop'); assert.deepEqual(capture(f).position, positions[0])
    await f.load('saved-one'); assert.deepEqual(capture(f).position, positions[2]); assert.equal(state(f), 'stopped')
    await f.jump(1); const revision = f.props().inputRevision
    f.io.hold = true; await f.save('Snapshot during speech'); assert.equal(f.locks.length, 1)
    await f.end(); assert.equal(f.props().inputRevision, revision); assert.deepEqual(capture(f).position, positions[2])
    f.locks[0].resolve(); await f.settle()
    const saved = JSON.parse(f.values.get(KEY)).records.find(item => item.name === 'Snapshot during speech')
    assert.deepEqual(saved.position, positions[1]); assert.equal(saved.text, manuscript)
    assert.equal(saved.settings.rate, 1.2); assert.ok(!Object.hasOwn(saved.settings, 'repeat'))
    f.io.hold = false; await f.click('stop'); await f.repeat(true); await f.click('play')
    await f.end(); await f.end(); await f.end()
    assert.equal(state(f), 'speaking'); assert.deepEqual(capture(f).position, positions[0])
    assert.ok(f.timers.some(timer => timer.delay === 2000 && !timer.canceled))
  } finally { f.cleanup() }
})

test('explicit record load stops old callbacks, never autoplays and preserves storage except existing settings effect', async () => {
  const raw = rawRecords(record()), f = await ttsFixture({ storage: { [KEY]: raw, 'tts.voice': 'remembered' } })
  try {
    await f.edit('tts-text', 'Previous. Old last.'); await f.repeat(true); await f.click('play')
    const old = f.utterances.at(-1), oldBoundary = old.onboundary, oldEnd = old.onend, oldError = old.onerror
    await f.end(); await f.end(); const gap = f.timers.findLast(timer => timer.delay === 2000 && !timer.canceled)
    const before = f.utterances.length, beforeWrites = f.writes.length
    await f.load('saved-one')
    assert.equal(f.utterances.length, before); assert.equal(state(f), 'stopped'); assert.equal(f.attr('repeat').props.checked, false)
    assert.equal(f.attr('root').props['data-tts-start-from'], 2); assert.equal(f.node('tts-text').props.value, manuscript)
    oldBoundary({ name: 'word', charIndex: 1, charLength: 2 }); oldEnd(); oldError({ error: 'network' }); gap.callback(); await f.settle()
    assert.equal(f.utterances.length, before); assert.equal(f.node('tts-text').props.value, manuscript); assert.equal(state(f), 'stopped')
    assert.equal(f.values.get(KEY), raw); assert.equal(f.values.get('tts.voice'), 'remembered')
    assert.ok(f.writes.slice(beforeWrites).every(([key]) => key === 'tts.settings'))
    assert.deepEqual(JSON.parse(f.values.get('tts.settings')), { rate: 1.2, pitch: 0.9, volume: 0.4 })
    await f.click('play'); assert.equal(f.utterances.at(-1).text, 'Third.'); await f.end()
    assert.equal(state(f), 'stopped'); assert.equal(f.attr('root').props['data-tts-start-from'], 0)
    await f.click('play'); assert.equal(f.utterances.at(-1).text, 'First.')
  } finally { f.cleanup() }
})

test('pending load is canceled by explicit parent edits but harmless voice arrival does not cancel it', async () => {
  const raw = rawRecords(record())
  for (const kind of ['text', 'rate', 'voice', 'repeat', 'play', 'paste']) {
    const f = await ttsFixture({ storage: { [KEY]: raw } })
    try {
      await f.edit('tts-text', 'Current. Input.'); f.io.hold = true; await f.load('saved-one'); assert.equal(f.locks.length, 1)
      if (kind === 'text') await f.edit('tts-text', 'Manual latest.')
      else if (kind === 'rate') await f.edit('tts-rate', '1.55')
      else if (kind === 'voice') await f.edit('tts-voice', 'remote')
      else if (kind === 'repeat') await f.repeat(true)
      else if (kind === 'play') await f.click('play')
      else { f.io.paste = 'wait'; await f.click('paste') }
      assert.equal(f.locks[0].options.signal.aborted, true)
      f.locks[0].resolve(); await f.settle(); assert.equal(f.node('tts-text').props.value, kind === 'text' ? 'Manual latest.' : 'Current. Input.')
      assert.equal(f.values.get(KEY), raw)
    } finally { f.cleanup() }
  }
  const f = await ttsFixture({ voices: [], storage: { [KEY]: raw } })
  try {
    f.io.hold = true; await f.load('saved-one'); const revision = f.props().inputRevision
    await f.setVoices([{ ...local, name: 'wanted' }]); assert.equal(f.props().inputRevision, revision); assert.equal(f.locks[0].options.signal.aborted, false)
    f.locks[0].resolve(); await f.settle(); assert.equal(f.node('tts-text').props.value, manuscript); assert.equal(f.node('tts-voice').props.value, 'wanted'); assert.equal(f.utterances.length, 0)
  } finally { f.cleanup() }
})

test('record apply invalidates older paste, link completion and old link timer in both outcomes', async () => {
  const raw = rawRecords(record())
  for (const rejects of [false, true]) {
    const f = await ttsFixture({ storage: { [KEY]: raw } })
    try {
      f.io.paste = 'wait'; await f.click('paste'); const read = f.reads.at(-1)
      f.io.copy = 'wait'; await f.click('copy-link'); const copy = f.copies.at(-1)
      await f.load('saved-one')
      if (rejects) { read.reject(new Error('late paste')); copy.reject(new Error('late link')) }
      else { read.resolve('Late clipboard overwrite.'); copy.resolve() }
      await f.settle(); assert.equal(f.node('tts-text').props.value, manuscript)
      assert.ok(!f.h.text().includes(f.messages.textToSpeech.tools.pasteFailed)); assert.ok(!f.h.text().includes(f.messages.textToSpeech.share.copyFailed))
      assert.ok(!f.h.text().includes(f.messages.textToSpeech.share.copied)); assert.equal(f.utterances.length, 0)
      f.io.copy = 'ok'; await f.click('copy-link'); const oldTimer = f.timers.findLast(timer => timer.delay === 2000 && !timer.canceled)
      await f.load('saved-one'); await f.click('copy-link'); const before = f.attr('copy-link').props.children
      oldTimer.callback(); await f.settle(); assert.deepEqual(f.attr('copy-link').props.children, before)
      const newUrl = new URL(f.copies.filter(item => typeof item === 'string').at(-1)); assert.equal(newUrl.searchParams.get('t'), manuscript); assert.equal(newUrl.searchParams.get('r'), '1.2')
    } finally { f.cleanup() }
  }
})

test('URL and OCR or notepad handoff win before explicit list load and stale saved split restarts at zero', async () => {
  const raw = rawRecords(record()), delivery = source => JSON.stringify({ source, text: `Private ${source}. Next.`, createdAt: Date.now() })
  for (const source of ['ocr', 'notepad']) {
    const sent = delivery(source), f = await ttsFixture({ url: `https://toolhub.ai.kr/text-to-speech/?from=${source}`, storage: { [KEY]: raw, [HANDOFF]: sent, 'tts.settings': JSON.stringify({ rate: 0.7, pitch: 1.8, volume: 0.8 }) } })
    try {
      assert.equal(f.node('tts-text').props.value, `Private ${source}. Next.`); assert.equal(f.attr('local-only').props.checked, true)
      assert.equal(f.utterances.length, 0); assert.equal(f.synth.canceled, 0); assert.equal(f.values.has(HANDOFF), false); assert.equal(f.values.get(KEY), raw)
      await f.load('saved-one'); assert.equal(f.node('tts-text').props.value, manuscript); assert.equal(f.utterances.length, 0)
    } finally { f.cleanup() }
    const g = await ttsFixture({ url: `https://toolhub.ai.kr/text-to-speech/?from=${source}&t=URL%20wins.&r=1.7`, storage: { [KEY]: raw, [HANDOFF]: sent } })
    try { assert.equal(g.node('tts-text').props.value, 'URL wins.'); assert.equal(g.node('tts-rate').props.value, 1.7); assert.equal(g.values.get(HANDOFF), sent); assert.equal(g.utterances.length, 0) } finally { g.cleanup() }
  }
  const stale = rawRecords(record({ position: { index: 99, start: 7, end: 14, text: 'Second.' } }))
  const f = await ttsFixture({ storage: { [KEY]: stale } })
  try {
    await f.load('saved-one'); assert.equal(f.attr('root').props['data-tts-start-from'], 0); assert.equal(f.utterances.length, 0)
    assert.ok(f.child.all().some(node => node.props?.['data-tts-reading-success'] === 'positionChanged'))
    assert.equal(f.values.get(KEY), stale); await f.click('play'); assert.equal(f.utterances.at(-1).text, 'First.')
    await f.locale('en'); assert.equal(f.node('tts-text').props.value, manuscript)
  } finally { f.cleanup() }
})

let passed = 0
for (const { name, run } of tests) {
  const match = process.argv.find(arg => arg.startsWith('--match='))?.slice(8)
  if (match && !new RegExp(match).test(name)) continue
  await run(); passed++; console.log(`PASS ${name}`)
}
console.log(`Independent reading parent groups: ${passed}`)
