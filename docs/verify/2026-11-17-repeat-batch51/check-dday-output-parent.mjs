import assert from 'node:assert/strict'
import { ddayHost } from './dday-output-harness.mjs'

let groups = 0
const check = async (name, run) => { await run(); groups++; console.log('PASS', name) }
const downloaded = f => f.node(f.cal, 'data-dday-calendar').props['data-dday-calendar-status']
const resolveHashes = async f => { for (const job of f.hashJobs.splice(0)) job.resolve(); await f.settle(20) }
const saved = (count = 2) => Array.from({ length: count }, (_, index) => ({ id: `id-${index}`, title: `일정 ${index};한글😀`, date: '2028-02-29', pinned: index === 0 }))

await check('actual normal/failed copy, full manual field/selection/retry and explicit URL restore over pinned record', async () => {
  const f = await ddayHost(); await f.copy(); assert.equal(f.copies.length, 1); assert.equal(f.recovery, null)
  f.io.clipboard = 'reject'; await f.copy(); assert.equal(f.legacy.length, 1); assert.ok(f.recovery)
  const text = f.node(f.recovery, 'data-dday-copy-manual').props.value; assert.ok(text.startsWith('TEST-A ')); assert.ok(text.endsWith('title=TEST-A'))
  f.node(f.recovery, 'data-dday-copy-select').props.onClick(); assert.deepEqual(f.selections.at(-1), [0, text.length])
  f.io.selectionFail = true; f.node(f.recovery, 'data-dday-copy-select').props.onClick(); f.recovery.render(); assert.ok(f.recovery.all().some(n => n.props.role === 'status'))
  f.io.clipboard = 'resolve'; f.node(f.recovery, 'data-dday-copy-retry').props.onClick(); await f.settle(); assert.equal(f.recovery, null); assert.equal(f.copies.at(-1), text)
  const url = text.split('\n').at(-1), receiver = await ddayHost({ url, saved: [{ id: 'pinned', title: 'OTHER', date: '2030-01-01', pinned: true }] })
  assert.equal(receiver.h.find(n => n.props.id === 'dday-title').props.value, 'TEST-A'); assert.equal(receiver.h.find(n => n.props.id === 'dday-date').props.value, '2028-02-29'); receiver.cleanup(); f.cleanup()
})
await check('copy input/date/locale ABA and unmount consume late success/rejection without legacy or recovery', async () => {
  for (const change of ['edit', 'locale', 'unmount']) {
    const f = await ddayHost(); f.io.clipboard = 'wait'; await f.copy()
    if (change === 'edit') { await f.edit('dday-title', 'B'); await f.edit('dday-date', '2029-01-01'); await f.edit('dday-title', 'TEST-A'); await f.edit('dday-date', '2028-02-29') }
    else if (change === 'locale') { await f.language('en'); await f.language('ko') } else f.cleanup()
    f.copyJobs.shift().reject(new Error('late owner')); await f.settle(); assert.equal(f.legacy.length, 0); assert.equal(f.recovery, null); if (change !== 'unmount') f.cleanup()
  }
})
await check('normal ICS uses real SHA/Blob; duplicate start blocked and new success releases URL once', async () => {
  const f = await ddayHost(); f.io.hash = 'wait'
  const action = f.node(f.cal, 'data-dday-calendar-download').props.onClick; action(); action(); await f.settle(); assert.equal(f.hashJobs.length, 1)
  await resolveHashes(f); assert.equal(downloaded(f), 'downloaded'); assert.equal(f.files.length, 1)
  const text = await f.urls[0].blob.text(); assert.ok(text.includes('DTSTART;VALUE=DATE:20280229\r\n')); assert.ok(text.includes('DTEND;VALUE=DATE:20280301\r\n')); assert.ok(text.includes('SUMMARY:TEST-A\r\n'))
  f.cleanup(); assert.deepEqual(f.revoked, [f.urls[0].url]); assert.equal(f.writes.some(([key]) => key === 'dday-saved'), false)
})
await check('ICS pending edit/cancel/mode/locale/unmount suppresses old file; explicit retry uses newest snapshot', async () => {
  for (const change of ['edit', 'cancel', 'mode', 'locale', 'unmount']) {
    const f = await ddayHost(); f.io.hash = 'wait'; await f.export(); assert.equal(downloaded(f), 'busy')
    if (change === 'edit') await f.edit('dday-title', 'NEW')
    else if (change === 'cancel') { f.node(f.cal, 'data-dday-calendar-cancel').props.onClick(); await f.settle(); assert.equal(downloaded(f), 'cancelled') }
    else if (change === 'mode') await f.mode('anniv')
    else if (change === 'locale') await f.language('en')
    else f.cleanup()
    await resolveHashes(f); assert.equal(f.files.length, 0); assert.equal(f.urls.length, 0)
    if (change !== 'unmount') { if (change === 'mode') await f.mode('dday'); f.io.hash = 'resolve'; await f.export(); assert.equal(f.files.length, 1); if (change === 'edit') assert.ok((await f.urls[0].blob.text()).includes('SUMMARY:NEW\r\n')); f.cleanup() }
  }
})
await check('own copy, actual ShareResult PNG/link and ICS obey both directions of output ownership', async () => {
  const f = await ddayHost(); f.io.image = 'wait'; await f.shareAction('save'); assert.equal(f.imageJobs.length, 1)
  await f.export(); assert.equal(f.files.length, 1); f.imageJobs.shift().resolve(); await f.settle(); assert.equal(f.files.length, 1)
  f.io.hash = 'wait'; await f.export(); await f.shareAction('copy'); await resolveHashes(f); assert.equal(f.files.length, 1)
  f.io.clipboard = 'wait'; await f.copy(); f.io.hash = 'resolve'; await f.export(); const own = f.copyJobs.shift(); own.reject(new Error('own old')); await f.settle(); assert.equal(f.legacy.length, 0); assert.equal(f.recovery, null)
  await f.shareAction('copy'); const shared = f.copyJobs.shift(); f.io.clipboard = 'resolve'; await f.copy(); shared.reject(new Error('shared old')); await f.settle(); assert.equal(f.legacy.length, 0)
  f.io.clipboard = 'wait'; await f.copy(); const next = f.copyJobs.shift(); f.io.image = 'resolve'; await f.shareAction('save'); next.reject(new Error('old own again')); await f.settle(); assert.equal(f.legacy.length, 0); assert.equal(f.files.at(-1).name, 'dday-2028-02-29.png'); f.cleanup()
})
await check('saved100 real ICS retains order/IDs and rejects stale raw while preserving all selections and storage', async () => {
  const records = saved(100), f = await ddayHost({ saved: records }), original = f.storage.get('dday-saved')
  f.node(f.cal, 'data-dday-calendar-source', 'saved').props.onClick(); await f.settle(); f.node(f.cal, 'data-dday-calendar-all').props.onClick(); await f.settle(); await f.export()
  assert.equal(f.files.length, 1); const text = await f.urls[0].blob.text(); assert.equal((text.match(/BEGIN:VEVENT\r\n/g) ?? []).length, 100); assert.equal((text.match(/UID:/g) ?? []).length, 100)
  assert.ok(text.indexOf('SUMMARY:일정 0\\;') < text.indexOf('SUMMARY:일정 99\\;')); assert.equal(f.storage.get('dday-saved'), original)
  f.io.hash = 'wait'; await f.export(); assert.equal(f.hashJobs.length, 100); f.storage.set('dday-saved', JSON.stringify(records.slice(1))); await resolveHashes(f)
  assert.equal(f.files.length, 1); assert.equal(downloaded(f), 'error'); assert.equal(f.cal.all().filter(n => n.type === 'input' && n.props.checked).length, 100); assert.equal(f.writes.some(([key]) => key === 'dday-saved'), false); f.cleanup()
})
await check('download failures preserve input/selection, no success on URL/click failure; invalid saved/101 guard', async () => {
  for (const failure of ['urlFail', 'clickFail']) {
    const f = await ddayHost(); f.io[failure] = true; await f.export(); assert.equal(downloaded(f), 'error'); assert.equal(f.files.length, 0); assert.equal(f.h.find(n => n.props.id === 'dday-title').props.value, 'TEST-A')
    if (failure === 'clickFail') assert.deepEqual(f.revoked, [f.urls[0].url]); f.io[failure] = false; await f.export(); assert.equal(downloaded(f), 'downloaded'); f.cleanup()
  }
  const f = await ddayHost({ saved: saved(101) }); f.node(f.cal, 'data-dday-calendar-source', 'saved').props.onClick(); await f.settle()
  for (const record of saved(101)) { f.node(f.cal, 'data-dday-calendar-select', record.id).props.onChange(); await f.settle(1) }
  const button = f.node(f.cal, 'data-dday-calendar-download'); assert.equal(button.props.disabled, true); button.props.onClick(); await f.settle(); assert.equal(f.files.length, 0); f.cleanup()
  const broken = await ddayHost({ saved: '{broken' }); broken.node(broken.cal, 'data-dday-calendar-source', 'saved').props.onClick(); await broken.settle(); assert.equal(broken.node(broken.cal, 'data-dday-calendar-download').props.disabled, true); assert.equal(broken.storage.get('dday-saved'), '{broken'); broken.cleanup()
})
await check('Strict replay and old delayed completion cannot overwrite a new request; other mode URL stays supported', async () => {
  const f = await ddayHost(); f.h.replayEffects(); f.cal.replayEffects(); f.share.replayEffects(); await f.settle()
  const oldSource = f.node(f.cal, 'data-dday-calendar-source', 'saved').props.onClick
  f.io.hash = 'wait'; await f.export(); const old = f.hashJobs.shift(), oldCancel = f.node(f.cal, 'data-dday-calendar-cancel').props.onClick
  oldSource(); await f.settle(); assert.equal(downloaded(f), 'busy')
  oldCancel(); await f.settle(); await f.export(); oldCancel(); await f.settle(); assert.equal(downloaded(f), 'busy')
  await resolveHashes(f); assert.equal(f.files.length, 1)
  old.reject(new Error('old SHA')); await f.settle(); assert.equal(downloaded(f), 'downloaded'); assert.equal(f.files.length, 1); f.cleanup()
  for (const [query, id, expected] of [['mode=diff&start=2028-02-28&end=2028-03-01', 'diff-start', '2028-02-28'], ['mode=add&base=2028-01-31&value=1&unit=months', 'add-base', '2028-01-31'], ['mode=anniv&start=2020-02-29&type=marriage&inc=0', 'anniv-start', '2020-02-29']]) {
    const other = await ddayHost({ url: `https://toolhub.ai.kr/dday-calculator/?${query}` }); assert.equal(other.h.find(n => n.props.id === id).props.value, expected); other.cleanup()
  }
})
console.log(`D-day actual parent/calendar/share: ${groups} groups passed`)
