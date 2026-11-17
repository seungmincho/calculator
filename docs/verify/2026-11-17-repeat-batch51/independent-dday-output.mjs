import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { ddayHost } from './dday-output-harness.mjs'

const all = (h, key) => h.all().filter(node => Object.hasOwn(node.props, key))
const status = f => f.node(f.cal, 'data-dday-calendar').props['data-dday-calendar-status']
const resolve = async (f, jobs = f.hashJobs.splice(0)) => { for (const job of jobs) job.resolve(); await f.settle(20) }
const fileText = async (f, index = f.files.length - 1) => f.urls.find(item => item.url === f.files[index].href).blob.text()
function events(text) {
  const unfolded = text.replace(/\r\n[ \t]/g, '')
  return unfolded.split('BEGIN:VEVENT\r\n').slice(1).map(block => {
    const lines = block.split('END:VEVENT')[0].trim().split('\r\n'), result = {}
    for (const line of lines) { const colon = line.indexOf(':'); result[line.slice(0, colon)] = line.slice(colon + 1) }
    result.SUMMARY = result.SUMMARY.replace(/\\([n,;\\])/g, (_, escape) => escape === 'n' ? '\n' : escape)
    return result
  })
}
function expectedUid(record) {
  const identity = JSON.stringify(['toolhub-dday-v1', record.id === undefined ? 'current' : 'saved', record.id ?? '', record.title, record.date])
  return `dday-${createHash('sha256').update(identity, 'utf8').digest('hex')}@toolhub.ai.kr`
}
const records = Array.from({ length: 100 }, (_, i) => ({ id: `ind-${String(i).padStart(3, '0')}`, title: `일정 ${i},세미;슬래시\\\n다음 줄😀`, date: '2028-02-29', pinned: i === 99 }))
let groups = 0
async function check(name, run, options) {
  if (process.argv[2] && !name.includes(process.argv[2])) return
  const f = await ddayHost(options)
  try { await run(f); groups++; console.log(`PASS ${name}`) } finally { f.cleanup() }
}

await check('own text has current dates and explicit URL; absence/false/throw preserve complete recovery and retry', async f => {
  const title = '공백 & 기념일,한글😀', savedWrites = f.writes.filter(([key]) => key === 'dday-saved').length
  await f.edit('dday-title', title)
  f.h.window.history.replaceState({ keep: 1 }, '', `${f.h.window.location.href}&extra=x&extra=y#keep`); await f.settle()
  await f.copy()
  const copied = f.copies.at(-1), link = new URL(copied.split('\n').at(-1))
  const days = (Date.UTC(2028, 1, 29) - Date.UTC(2026, 10, 17)) / 86400000
  assert.ok(copied.startsWith(`${title} D-${days}`))
  assert.equal(link.searchParams.get('date'), '2028-02-29'); assert.equal(link.searchParams.get('title'), title)
  assert.deepEqual(link.searchParams.getAll('extra'), ['x', 'y']); assert.equal(link.hash, '#keep')
  const originalClipboard = f.h.context.navigator.clipboard
  f.h.context.navigator.clipboard = undefined
  await f.copy(); assert.ok(f.recovery)
  assert.equal(f.node(f.recovery, 'data-dday-copy-manual').props.value, copied)
  const oldClose = f.node(f.recovery, 'data-dday-copy-close').props.onClick
  f.node(f.recovery, 'data-dday-copy-select').props.onClick(); assert.deepEqual(f.selections.at(-1), [0, copied.length])
  f.io.selectionFail = true; f.node(f.recovery, 'data-dday-copy-select').props.onClick(); f.recovery.render()
  assert.equal(f.node(f.recovery, 'data-dday-copy-manual').props.value, copied)
  f.h.context.navigator.clipboard = originalClipboard; f.io.clipboard = 'reject'; f.io.fallback = 'throw'
  f.node(f.recovery, 'data-dday-copy-retry').props.onClick(); await f.settle(); assert.ok(f.recovery)
  f.io.fallback = true; f.node(f.recovery, 'data-dday-copy-retry').props.onClick(); await f.settle(); assert.equal(f.recovery, null)
  oldClose(); await f.settle(); assert.equal(f.h.text().includes('복사됨'), true)
  assert.equal(f.writes.filter(([key]) => key === 'dday-saved').length, savedWrites)
  const recipient = await ddayHost({ url: link.href, saved: [{ id: 'other', title: 'OTHER', date: '2031-01-01', pinned: true }] })
  try { assert.equal(recipient.h.find(node => node.props.id === 'dday-title').props.value, title); assert.equal(recipient.h.find(node => node.props.id === 'dday-date').props.value, '2028-02-29') } finally { recipient.cleanup() }
})

await check('selected order and all100 output retain existing identities, escaping and raw list while current matching UID agrees', async f => {
  const raw = f.storage.get('dday-saved')
  f.node(f.cal, 'data-dday-calendar-source', 'saved').props.onClick(); await f.settle()
  for (const index of [49, 0, 99]) { f.node(f.cal, 'data-dday-calendar-select', records[index].id).props.onChange(); await f.settle(1) }
  await f.export(); const first = events(await fileText(f))
  assert.deepEqual(first.map(event => event.UID), [49, 0, 99].map(i => expectedUid(records[i])))
  f.node(f.cal, 'data-dday-calendar-all').props.onClick(); await f.settle(); await f.export()
  const output = events(await fileText(f)), order = [records[99], ...records.slice(0, 99)]
  assert.equal(output.length, 100)
  output.forEach((event, index) => {
    assert.equal(event.UID, expectedUid(order[index])); assert.equal(event.SUMMARY, order[index].title)
    assert.equal(event['DTSTART;VALUE=DATE'], '20280229'); assert.equal(event['DTEND;VALUE=DATE'], '20280301')
  })
  await f.language('en'); await f.export(); assert.deepEqual(events(await fileText(f)), output)
  assert.equal(f.storage.get('dday-saved'), raw); assert.equal(f.writes.filter(([key]) => key === 'dday-saved').length, 0)
  f.node(f.cal, 'data-dday-calendar-source', 'current').props.onClick(); await f.settle()
  await f.edit('dday-title', records[49].title); await f.export()
  assert.equal(events(await fileText(f))[0].UID, expectedUid(records[49]))
}, { saved: records })

await check('external changes during SHA reject complete selected file and preserve all selected checkboxes and raw bytes', async f => {
  f.node(f.cal, 'data-dday-calendar-source', 'saved').props.onClick(); await f.settle()
  f.node(f.cal, 'data-dday-calendar-all').props.onClick(); await f.settle()
  f.io.hash = 'wait'; await f.export(); const pending = f.hashJobs.splice(0)
  assert.equal(pending.length, 100)
  const external = JSON.stringify(records.map((record, index) => index === 25 ? { ...record, title: '다른 탭 변경' } : record))
  f.storage.set('dday-saved', external); await resolve(f, pending)
  assert.equal(status(f), 'error'); assert.equal(f.files.length, 0); assert.equal(f.urls.length, 0)
  assert.equal(all(f.cal, 'data-dday-calendar-select').filter(node => node.props.checked).length, 100)
  assert.equal(f.storage.get('dday-saved'), external); assert.equal(f.writes.filter(([key]) => key === 'dday-saved').length, 0)
  // A malformed later value also remains physically untouched; no selected subset is emitted.
  f.storage.set('dday-saved', '{broken'); f.io.hash = 'resolve'; await f.export()
  assert.equal(status(f), 'error'); assert.equal(f.files.length, 0); assert.equal(f.storage.get('dday-saved'), '{broken')
}, { saved: records })

await check('parent copy, real ShareResult and pending ICS alternate ownership; old failures do not launch legacy or download', async f => {
  f.io.hash = 'wait'; await f.export(); const firstHash = f.hashJobs.splice(0)
  f.io.clipboard = 'wait'; await f.copy(); const ownCopy = f.copyJobs.shift()
  await f.shareAction('copy'); const shareCopy = f.copyJobs.shift()
  ownCopy.reject(Error('obsolete result')); await resolve(f, firstHash)
  assert.equal(f.files.length, 0); assert.equal(f.legacy.length, 0); assert.equal(f.recovery, null)
  await f.export(); shareCopy.reject(Error('obsolete link')); await f.settle(); assert.equal(f.legacy.length, 0)
  await resolve(f); assert.equal(f.files.length, 1)
  f.io.image = 'wait'; await f.shareAction('save'); const image = f.imageJobs.shift()
  f.io.clipboard = 'resolve'; await f.copy(); image.resolve(); await f.settle()
  assert.equal(f.files.length, 1)
  f.io.hash = 'resolve'; await f.export(); assert.equal(f.files.length, 2)
  assert.equal(f.recovery, null)
})

await check('cancel/restart, input and locale ABA, stale child events and mode exit cannot revive old SHA work', async f => {
  f.io.hash = 'wait'; await f.export(); const a = f.hashJobs.shift()
  const oldCancel = f.node(f.cal, 'data-dday-calendar-cancel').props.onClick
  const oldCurrent = f.node(f.cal, 'data-dday-calendar-source', 'current').props.onClick
  oldCancel(); await f.settle(); assert.equal(status(f), 'cancelled')
  await f.export(); const b = f.hashJobs.shift(); oldCancel(); oldCurrent(); await f.settle(); assert.equal(status(f), 'busy')
  await resolve(f, [a]); assert.equal(f.files.length, 0); assert.equal(status(f), 'busy')
  await f.edit('dday-title', 'B'); await f.edit('dday-title', 'TEST-A'); await resolve(f, [b])
  assert.equal(f.files.length, 0); assert.equal(status(f), 'idle')
  await f.export(); const c = f.hashJobs.shift(); await f.language('en'); await f.language('ko'); await resolve(f, [c]); assert.equal(f.files.length, 0)
  await f.export(); const d = f.hashJobs.shift(); await f.mode('diff'); await f.mode('dday'); await resolve(f, [d]); assert.equal(f.files.length, 0)
  f.io.hash = 'resolve'; await f.export(); assert.equal(f.files.length, 1)
  assert.equal(events(await fileText(f))[0].SUMMARY, 'TEST-A')
})

await check('copy feedback and manual retry cannot survive locale/input ABA or dismiss a newer output', async f => {
  const oldTimers = [], schedule = f.h.context.setTimeout
  f.h.context.setTimeout = (callback, delay) => { if (delay === 2000) oldTimers.push(callback); return schedule(callback, delay) }
  f.io.clipboard = 'reject'; await f.copy(); const oldRetry = f.node(f.recovery, 'data-dday-copy-retry').props.onClick, oldClose = f.node(f.recovery, 'data-dday-copy-close').props.onClick
  await f.edit('dday-date', '2028-03-01'); await f.edit('dday-date', '2028-02-29')
  assert.equal(f.recovery, null); const count = f.copies.length; oldRetry(); oldClose(); await f.settle(); assert.equal(f.copies.length, count)
  f.io.clipboard = 'resolve'; await f.copy(); await f.language('en'); await f.language('ko')
  assert.equal(f.h.text().includes('복사됨'), false)
  f.io.clipboard = 'wait'; await f.copy(); const old = f.copyJobs.shift()
  await f.edit('dday-title', 'B'); await f.edit('dday-title', 'TEST-A'); f.io.clipboard = 'reject'; await f.copy()
  const current = f.node(f.recovery, 'data-dday-copy-manual').props.value
  old.resolve(); oldTimers.forEach(callback => callback()); f.h.tick(2000); await f.settle()
  assert.equal(f.node(f.recovery, 'data-dday-copy-manual').props.value, current)
})

await check('101selected guard emits nothing; existing pin and load retain every stored event and explicit date', async f => {
  const before = JSON.parse(f.storage.get('dday-saved'))
  f.node(f.cal, 'data-dday-calendar-source', 'saved').props.onClick(); await f.settle()
  for (const item of before) { f.node(f.cal, 'data-dday-calendar-select', item.id).props.onChange(); await f.settle(1) }
  f.io.hash = 'wait'
  const action = f.node(f.cal, 'data-dday-calendar-download'); assert.equal(action.props.disabled, true)
  action.props.onClick(); await f.settle(); assert.equal(f.hashJobs.length, 0); assert.equal(f.files.length, 0)
  assert.equal(all(f.cal, 'data-dday-calendar-select').filter(node => node.props.checked).length, 101)
  f.node(f.cal, 'data-dday-calendar-select', before[100].id).props.onChange(); await f.settle()
  assert.equal(f.node(f.cal, 'data-dday-calendar-download').props.disabled, false)
  const row = f.h.find(node => node.type === 'li' && node.key === before[25].id)
  row.props.children[2].props.onClick(); await f.settle()
  const after = JSON.parse(f.storage.get('dday-saved'))
  assert.deepEqual(after.map(({ id, title, date }) => ({ id, title, date })), before.map(({ id, title, date }) => ({ id, title, date })))
  assert.deepEqual(after.filter(item => item.pinned).map(item => item.id), [before[25].id])
  f.h.find(node => node.type === 'li' && node.key === before[25].id).props.children[0].props.onClick(); await f.settle()
  assert.equal(f.h.find(node => node.props.id === 'dday-date').props.value, before[25].date)
  assert.equal(f.h.find(node => node.props.id === 'dday-title').props.value, before[25].title)
}, { saved: [...records, { id: 'limit-extra', title: '101번째 원본', date: '2029-01-01' }] })

await check('actual URL cleanup/failure, Strict replay and unmount consume all submitted Blob resources and pending ports', async f => {
  f.h.replayEffects(); f.cal.replayEffects(); f.share.replayEffects(); await f.settle()
  f.io.clickFail = true; await f.export(); assert.equal(status(f), 'error'); assert.equal(f.files.length, 0)
  assert.equal(f.urls.length, 1); assert.deepEqual(f.revoked, [f.urls[0].url])
  f.io.clickFail = false; await f.export(); assert.equal(f.files.length, 1)
  f.cal.tick(30000); await f.settle(); assert.equal(f.revoked.length, 2)
  await f.export(); f.io.hash = 'wait'; await f.export(); const hash = f.hashJobs.shift()
  f.io.clipboard = 'wait'; await f.copy(); const clipboard = f.copyJobs.shift()
  f.io.image = 'wait'; await f.shareAction('save'); const image = f.imageJobs.shift()
  const before = f.files.length; f.cleanup(); hash.resolve(); clipboard.reject(Error('closed')); image.resolve(); await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(f.files.length, before); assert.equal(f.legacy.length, 0)
  assert.equal(new Set(f.revoked).size, f.urls.length); assert.equal(f.revoked.length, f.urls.length)
})

console.log(`D-day independent actual output: ${groups} groups passed`)
