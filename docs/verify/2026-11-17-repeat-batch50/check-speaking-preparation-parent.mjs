import assert from 'node:assert/strict'
import { recorderFixture, find } from './speaking-recorder-harness.mjs'

const nodes = (f, key) => f.h.all().filter(node => Object.hasOwn(node.props, key))
const phase = f => find(f.h, 'data-speaking-recorder-phase').props['data-speaking-recorder-phase']
const selectedAudio = f => f.h.find(node => typeof node.type === 'function' && node.type.name === 'TakeAudio' && node.props.take.audio).props.take
async function edit(f, id, value) { find(f.h, 'id', id).props.onChange({ target: { value } }); await f.sync() }
const legacy = { version: 1, id: 'saved-practice', mode: 'report', createdAt: 10, updatedAt: 20, takes: [{ id: 'old-take', createdAt: 11, transcript: '보존하는 저장 원문', seconds: 60, audio: new Blob(['saved synthetic audio'], { type: 'audio/webm' }) }] }
let groups = 0
async function check(name, run, options = {}) {
  if (process.argv[2] && !name.includes(process.argv[2])) return
  const f = await recorderFixture({ parent: true, ...options })
  try { await run(f); groups++; console.log(`PASS ${name}`) } finally { f.close() }
}

await check('main default recording and basic rerecord both use selected delay without model or storage work', async f => {
  assert.equal(find(f.h, 'data-speaking-preparation', 0).props['aria-pressed'], true)
  await f.click('data-speaking-record'); await f.grant(); assert.equal(phase(f), 'recording')
  await f.finish(); assert.equal(nodes(f, 'data-speaking-take').length, 1)
  const first = selectedAudio(f); assert.equal(first.seconds, 1); assert.equal(await first.audio.text(), 'synthetic')
  await f.click('data-speaking-preparation', 3); await f.click('data-speaking-rerecord'); await f.grant()
  assert.equal(phase(f), 'preparing'); assert.equal(find(f.h, 'data-speaking-countdown').props['data-speaking-countdown'], 3)
  assert.equal(f.recorders.length, 1); assert.equal(nodes(f, 'data-speaking-take').length, 1)
  assert.equal(f.h.find(node => node.props.role === 'timer').props.children.join(''), '00:00')
  await f.tick(f.clock.now + 3000); await f.finish(f.recorders[1], 1500, 'second synthetic')
  assert.equal(selectedAudio(f).seconds, 1.5); assert.equal(nodes(f, 'data-speaking-take').length, 2)
  assert.ok(find(f.h, 'data-testid', 'speaking-comparison'))
  assert.equal(f.models, 0); assert.equal(f.decodes, 0); assert.equal(f.saves.length, 0)
})

await check('current and captured controls cannot replace session or edit input during permission/preparation/stopping', async f => {
  await f.click('data-speaking-text-take'); await edit(f, 'speaking-transcript', '기존 연습 원문'); await edit(f, 'speaking-session-title', '기존 제목')
  const recordRow = find(f.h, 'data-speaking-record', 'saved-practice')
  const open = recordRow.props.children[1].props.children[0].props.onClick
  const old = {
    mode: find(f.h, 'data-speaking-mode', 'report').props.onClick,
    fresh: find(f.h, 'data-speaking-new').props.onClick,
    text: find(f.h, 'data-speaking-text-take').props.onClick,
    file: find(f.h, 'data-speaking-file').props.onChange,
    title: find(f.h, 'id', 'speaking-session-title').props.onChange,
    transcript: find(f.h, 'id', 'speaking-transcript').props.onChange,
    option: find(f.h, 'data-speaking-preparation', 0).props.onClick,
    retry: find(f.h, 'data-speaking-rerecord').props.onClick,
  }
  await f.click('data-speaking-preparation', 5)
  find(f.h, 'data-speaking-record').props.onClick()
  old.text(); old.mode(); old.retry(); open(); await f.sync()
  assert.equal(f.permissions.length, 1); assert.equal(nodes(f, 'data-speaking-take').length, 1)
  await f.grant()
  for (const fn of [old.mode, old.fresh, old.text, old.option, old.retry, open]) fn()
  old.file({ target: { files: [new Blob(['unused'])], value: 'file' } })
  old.title({ target: { value: 'late title' } }); old.transcript({ target: { value: 'late text' } }); await f.sync()
  assert.equal(find(f.h, 'data-speaking-mode', 'intro').props['aria-pressed'], true)
  assert.equal(find(f.h, 'id', 'speaking-session-title').props.value, '기존 제목')
  assert.equal(find(f.h, 'id', 'speaking-transcript').props.value, '기존 연습 원문')
  assert.equal(find(f.h, 'data-speaking-preparation', 5).props['aria-pressed'], true)
  assert.equal(f.permissions.length, 1); assert.equal(f.decodes, 0); assert.equal(f.models, 0)
  for (const key of ['data-speaking-file', 'data-speaking-text-take', 'data-speaking-new', 'data-speaking-rerecord']) assert.equal(find(f.h, key).props.disabled, true)
  await f.tick(5000); const rec = f.recorders[0]; f.clock.now = 6000
  await f.click('data-speaking-record'); assert.equal(phase(f), 'stopping')
  old.text(); old.mode(); old.retry(); await f.sync(); assert.equal(f.permissions.length, 1)
  rec.ondataavailable({ data: new Blob(['end']) }); rec.onstop(); await f.sync()
  assert.equal(nodes(f, 'data-speaking-take').length, 2)
}, { records: [legacy] })

await check('permission cancellation and hidden countdown preserve prior take and require a fresh explicit start', async f => {
  await f.click('data-speaking-text-take'); await edit(f, 'speaking-transcript', '유지할 원문')
  await f.click('data-speaking-preparation', 5); await f.click('data-speaking-rerecord')
  await f.click('data-speaking-record-cancel'); const late = await f.grant()
  assert.equal(late.track.stopped, 1); assert.equal(phase(f), 'idle')
  await f.click('data-speaking-rerecord'); const stream = await f.grant(); const callback = f.timerCallbacks.at(-1)
  f.h.document.visibilityState = 'hidden'; f.h.document.dispatch('visibilitychange'); await f.sync()
  f.h.document.visibilityState = 'visible'; f.h.document.dispatch('visibilitychange'); f.clock.now = 50000; callback(); await f.sync()
  assert.equal(phase(f), 'idle'); assert.equal(stream.track.stopped, 1); assert.equal(f.recorders.length, 0)
  assert.equal(nodes(f, 'data-speaking-take').length, 1); assert.equal(find(f.h, 'id', 'speaking-transcript').props.value, '유지할 원문')
  await f.click('data-speaking-preparation', 0); await f.click('data-speaking-rerecord'); await f.grant(); await f.finish()
  assert.equal(nodes(f, 'data-speaking-take').length, 2)
})

await check('five-take limit, new practice, record opening and saved Blob remain compatible', async f => {
  for (let i = 0; i < 5; i++) await f.click('data-speaking-text-take')
  assert.equal(find(f.h, 'data-speaking-record').props.disabled, true)
  assert.equal(find(f.h, 'data-speaking-rerecord').props.disabled, true)
  find(f.h, 'data-speaking-record').props.onClick(); find(f.h, 'data-speaking-rerecord').props.onClick(); await f.sync()
  assert.equal(f.permissions.length, 0)
  await f.click('data-speaking-preparation', 3); await f.click('data-speaking-new')
  assert.equal(nodes(f, 'data-speaking-take').length, 0); assert.equal(find(f.h, 'data-speaking-preparation', 3).props['aria-pressed'], true)
  find(f.h, 'data-speaking-record', 'saved-practice').props.children[1].props.children[0].props.onClick(); await f.sync()
  assert.equal(find(f.h, 'data-speaking-mode', 'report').props['aria-pressed'], true)
  assert.equal(await selectedAudio(f).audio.text(), 'saved synthetic audio')
  await f.click('data-speaking-rerecord'); await f.grant(); assert.equal(phase(f), 'preparing')
}, { records: [legacy] })

await check('saving still permits latest title/transcript edits and records contain no preparation option', async f => {
  await f.click('data-speaking-text-take'); await edit(f, 'speaking-transcript', '저장 전 원문')
  await f.click('data-speaking-preparation', 5); await f.click('data-speaking-save')
  assert.equal(f.saves.length, 1); assert.equal(find(f.h, 'id', 'speaking-transcript').props.disabled, false)
  await edit(f, 'speaking-transcript', '저장 중 최신 원문'); await edit(f, 'speaking-session-title', '최신 제목')
  assert.equal(f.saves[0].session.takes[0].transcript, '저장 전 원문')
  assert.equal(Object.hasOwn(f.saves[0].session, 'preparationSeconds'), false)
  f.saves[0].resolve({ session: { ...f.saves[0].session, updatedAt: 99, revision: 'saved' }, basis: { kind: 'revision', updatedAt: 99, revision: 'saved' } }); await f.sync()
  assert.equal(find(f.h, 'id', 'speaking-transcript').props.value, '저장 중 최신 원문')
  assert.equal(find(f.h, 'id', 'speaking-session-title').props.value, '최신 제목')
  assert.equal(find(f.h, 'data-speaking-preparation', 5).props['aria-pressed'], true)
  const share = f.h.find(node => node.type === 'ShareResult')
  assert.equal(new URL(share.props.url).searchParams.has('preparation'), false)
  assert.equal(f.h.stored.size, 0)
})

await check('KO/EN and Strict initial replay preserve selection/countdown/recorded input; unmount has no late take', async f => {
  f.h.replayEffects(); await f.sync()
  await f.click('data-speaking-text-take'); await edit(f, 'speaking-transcript', '언어를 바꿔도 유지')
  await f.click('data-speaking-preparation', 3); await f.click('data-speaking-rerecord'); await f.grant()
  await f.locale('en'); assert.ok(f.h.text().includes('Recording countdown: 3s'))
  assert.equal(find(f.h, 'id', 'speaking-transcript').props.value, '언어를 바꿔도 유지')
  assert.equal(find(f.h, 'data-speaking-preparation', 3).props['aria-pressed'], true)
  assert.ok(find(f.h, 'data-speaking-record-cancel').props.className.includes('min-h-11'))
  await f.tick(2000); assert.ok(f.h.text().includes('Recording countdown: 1s'))
  await f.locale('ko'); assert.ok(f.h.text().includes('1초 후'))
  await f.tick(3000); const rec = f.recorders[0], oldStop = rec.onstop, oldData = rec.ondataavailable
  const takeCount = nodes(f, 'data-speaking-take').length; f.close(); oldData({ data: new Blob(['obsolete']) }); oldStop()
  assert.equal(nodes(f, 'data-speaking-take').length, takeCount); assert.equal(rec.media.track.stopped, 1)
})
console.log(`Speaking preparation actual parent: ${groups} groups passed`)
