import assert from 'node:assert/strict'
import { runningFixture, by } from './running-parent-harness.mjs'

// Reuse the I/O/hook host only. No author assertions or running calculation helpers.
const base = { distanceKm: 25, custom: true, mode: 'time', valueSeconds: 7500, splitKm: 1, goals: [6000, 9000] }
const url = (data = base) => `https://toolhub.ai.kr/running-pace/?tag=one&tag=two&rpV=1&rp=${encodeURIComponent(JSON.stringify(data))}#part`
const plain = value => JSON.parse(JSON.stringify(value))
const all = (host, key, value) => host.all().filter(node => value === undefined ? Object.hasOwn(node.props, key) : node.props[key] === value)
const status = f => all(f.parent, 'data-running-output')[0]?.props['data-running-output'] ?? null
const payload = f => JSON.parse(f.parent.window.location.searchParams.get('rp'))
const clock = seconds => `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
const tick = () => new Promise(resolve => setImmediate(resolve))
async function goal(f, index, field, value) { all(f.child, 'data-running-goal-field', field)[index].props.onChange({ target: { value } }); await f.sync() }
async function use(run, options) { const f = await runningFixture(options); try { await run(f) } finally { f.close() } }
// Small independent quoted-delimiter reader: compares actual clipboard/Blob transport.
function table(text, delimiter) {
  const rows = []; let row = [], cell = '', quoted = false
  text = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted }
    else if (!quoted && char === delimiter) { row.push(cell); cell = '' }
    else if (!quoted && char === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = '' }
    else cell += char
  }
  assert.equal(quoted, false); row.push(cell); rows.push(row); return rows
}
let groups = 0
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log(`PASS ${name}`) }

await check('initial partial edits and Strict replay win only touched URL fields; hash navigation preserves drafts', () => use(async f => {
  assert.equal(f.writes.length, 0)
  f.parent.replayEffects()
  await f.edit(f.parent, 'running-minutes', '07')
  await f.click(f.child, 'data-running-goal-action', 'addCurrent')
  assert.equal(f.writes.length, 0)
  f.parent.setHydrated(true)
  f.parent.replayEffects()
  await f.start()
  assert.equal(by(f.parent, 'id', 'running-hours').props.value, '2')
  assert.equal(by(f.parent, 'id', 'running-minutes').props.value, '07')
  assert.equal(by(f.parent, 'id', 'running-seconds').props.value, '0')
  assert.equal(by(f.parent, 'id', 'running-distance').props.value, '25')
  assert.deepEqual(payload(f), { ...base, valueSeconds: 7620, goals: [420] })
  assert.deepEqual(f.parent.window.location.searchParams.getAll('tag'), ['one', 'two'])
  assert.equal(f.parent.window.location.hash, '#part')
  assert.ok(f.writes.every(write => write.state === f.historyState))
  const goalId = all(f.child, 'data-running-goal')[0].props['data-running-goal']
  await goal(f, 0, 'seconds', '')
  const hashOnly = `${f.parent.window.location.href.split('#')[0]}#new`
  await f.pop(hashOnly)
  assert.equal(all(f.child, 'data-running-goal')[0].props['data-running-goal'], goalId)
  assert.equal(all(f.child, 'data-running-goal-field', 'seconds')[0].props.value, '')
  assert.equal(f.share, null)
  await f.pop(url({ ...base, mode: 'pace', valueSeconds: 301, goals: [1234] }))
  assert.equal(by(f.parent, 'id', 'running-pace-minutes').props.value, '5')
  assert.equal(by(f.parent, 'id', 'running-pace-seconds').props.value, '1')
  assert.deepEqual(payload(f).goals, [1234])
}, { url: url(), hydrated: false }))

await check('blocked malformed URL retains bytes; an early edit and later write failure never claim a shareable result', async () => {
  const raw = 'https://toolhub.ai.kr/running-pace/?tag=one&rpV=1&rp=%7Bbroken%7D&tag=two#raw'
  await use(async f => {
    await f.start(); assert.equal(f.parent.window.location.href, raw); assert.equal(f.writes.length, 0)
    assert.equal(f.share, null); assert.equal(by(f.parent, 'data-running-single-action', 'copy').props.disabled, true)
    await f.edit(f.parent, 'running-minutes', '40')
    assert.equal(payload(f).valueSeconds, 2400); assert.ok(f.share)
    const saved = f.parent.window.location.href
    f.parent.window.history.replaceState = () => { throw new Error('write denied') }
    await f.edit(f.parent, 'running-seconds', '17')
    assert.equal(f.parent.window.location.href, saved)
    assert.equal(by(f.parent, 'id', 'running-seconds').props.value, '17')
    assert.ok(by(f.parent, 'data-running-query-error', 'writeFailed')); assert.equal(f.share, null)
    await f.click(f.parent, 'data-running-single-action', 'copy')
    assert.ok(f.copied.at(-1).includes('0:40:17'))
  }, { url: raw })
  await use(async f => {
    await f.edit(f.parent, 'running-minutes', ''); await f.start()
    assert.equal(by(f.parent, 'id', 'running-minutes').props.value, '')
    assert.equal(f.parent.window.location.searchParams.has('rp'), false)
    assert.equal(f.share, null)
    assert.ok(by(f.parent, 'data-running-query-error', 'draft'))
  }, { url: raw })
})

await check('existing single conversion and duplicate goal identity survive mode, distance and incomplete drafts', () => use(async f => {
  await f.start()
  await f.click(f.parent, 'data-running-single-action', 'copy')
  assert.ok(f.copied[0].includes('0:50:00')); assert.ok(f.copied[0].includes('5:00/km')); assert.ok(f.copied[0].includes('12.00 km/h'))
  await f.click(f.child, 'data-running-goal-action', 'addCurrent'); await f.click(f.child, 'data-running-goal-action', 'addCurrent')
  const original = f.parent.find(node => node.type === 'ComparisonPort').props.goals
  const originalJSON = JSON.stringify(original), ids = original.map(item => item.id)
  assert.equal(new Set(ids).size, 2)
  await f.click(f.parent, 'data-running-mode', 'pace')
  await f.edit(f.parent, 'running-pace-minutes', '4'); await f.edit(f.parent, 'running-pace-seconds', '17')
  await f.click(f.parent, 'data-running-mode', 'time')
  assert.equal(by(f.parent, 'id', 'running-minutes').props.value, '42'); assert.equal(by(f.parent, 'id', 'running-seconds').props.value, '50')
  await f.click(f.parent, 'data-running-distance', 5)
  assert.deepEqual(payload(f).goals, [3000, 3000]); assert.equal(JSON.stringify(original), originalJSON)
  await goal(f, 0, 'minutes', '51')
  assert.deepEqual(payload(f).goals, [3060, 3000])
  await f.click(f.child, 'data-running-goal-action', 'addBlank')
  const oldExport = by(f.child, 'data-running-export', 'csv').props.onClick
  assert.equal(by(f.child, 'data-running-export', 'csv').props.disabled, true)
  assert.equal(by(f.child, 'data-running-goal-action', 'addCurrent').props.disabled, true)
  await f.edit(f.parent, 'running-minutes', '')
  assert.equal(f.share, null)
  oldExport(); await f.sync(); assert.equal(f.files.length, 0)
  all(f.child, 'data-running-goal-action', 'remove')[2].props.onClick(); await f.sync()
  await f.click(f.child, 'data-running-export', 'csv')
  assert.equal(f.files.length, 1); assert.equal(by(f.parent, 'data-running-single-action', 'copy').props.disabled, true)
  assert.equal(JSON.stringify(original), originalJSON)
}))

await check('actual500row transport and print contain every click-time value despite page10 and later edits', () => use(async f => {
  await f.start()
  for (let i = 0; i < 9; i++) await f.click(f.child, 'data-running-page', 'next')
  assert.equal(by(f.child, 'data-running-page', 'next').props.disabled, true)
  const preview = f.child.find(node => node.type === 'tbody').props.children
  assert.equal(preview.length, 50); assert.ok(JSON.stringify(preview[0]).includes('451 km'))
  await f.click(f.child, 'data-running-export', 'tsv')
  const tsvText = f.copied.at(-1), tsv = table(tsvText, '\t')
  await f.click(f.child, 'data-running-export', 'csv')
  const blob = f.files.at(-1).blob, bytes = new Uint8Array(await blob.arrayBuffer())
  assert.deepEqual(Array.from(bytes.slice(0, 3)), [239, 187, 191])
  const csvText = await blob.text(), csv = table(csvText, ',')
  assert.deepEqual(csv, tsv); assert.equal(csv.length, 501)
  for (let i = 1; i <= 500; i++) {
    const row = ['500', '1', String(i)]
    for (const pace of [100, 150, 200]) row.push(String(500 * pace), String(pace), String(3600 / pace), String(i * pace), clock(i * pace))
    assert.deepEqual(csv[i], row)
  }
  await f.click(f.child, 'data-running-export', 'print')
  assert.equal(all(f.printHost, 'data-running-print-row').length, 500)
  await f.frame(); assert.equal(f.prints.length, 1)
  const printed = f.prints[0].snapshot
  for (let i = 1; i <= 500; i++) assert.deepEqual(plain(printed.rows[i - 1]), { distance: `${i} km`, values: [clock(i * 100), clock(i * 150), clock(i * 200)] })
  await f.afterPrint()
  await goal(f, 1, 'minutes', '1')
  assert.equal(await blob.text(), csvText); assert.equal(f.copied.at(-1), tsvText)
  assert.deepEqual(plain(printed.rows[499].values), [clock(50000), clock(75000), clock(100000)])
  assert.equal(by(f.child, 'data-running-page', 'previous').props.disabled, true)
}, { url: url({ distanceKm: 500, custom: true, mode: 'time', valueSeconds: 50000, splitKm: 1, goals: [50000, 75000, 100000] }) }))

await check('pending Clipboard and ShareResult alternate ownership; A-B-A and old recovery cannot overwrite newer work', () => use(async f => {
  await f.start(); f.copyMode('wait')
  await f.click(f.child, 'data-running-export', 'tsv'); const tableCopy = f.pendingCopies.shift()
  await f.shareAction('copy'); const linkCopy = f.pendingCopies.shift()
  tableCopy.reject(new Error('older table denied')); await f.sync()
  assert.equal(f.legacyCalls, 0); assert.equal(status(f), null)
  await f.click(f.parent, 'data-running-single-action', 'copy'); const singleCopy = f.pendingCopies.shift()
  linkCopy.reject(new Error('older link denied')); await f.sync(); assert.equal(f.legacyCalls, 0)
  singleCopy.resolve(); await f.sync(); assert.equal(status(f), 'copied')
  await f.edit(f.parent, 'running-seconds', '1'); await f.edit(f.parent, 'running-seconds', '0')
  assert.equal(status(f), null)
  f.copyMode('no'); await f.click(f.child, 'data-running-export', 'tsv')
  const failed = by(f.parent, 'data-running-copy-manual').props.value
  const oldRetry = by(f.parent, 'data-running-recovery', 'retry').props.onClick
  const oldClose = by(f.parent, 'data-running-recovery', 'close').props.onClick
  f.copyMode('ok'); await f.shareAction('copy')
  const count = f.copied.length; oldRetry(); oldClose(); await f.sync()
  assert.equal(f.copied.length, count); assert.equal(status(f), null)
  assert.ok(failed.includes('\t')); assert.equal(all(f.share, 'data-share-recovery').length, 0)
  await f.click(f.child, 'data-running-export', 'tsv'); assert.equal(status(f), 'copied')
  await f.locale('en', 'ko'); assert.equal(status(f), null)
  await f.click(f.parent, 'data-running-single-action', 'copy'); assert.equal(status(f), 'copied')
  await f.locale('en', 'en'); assert.equal(status(f), null)
  await f.locale('ko'); assert.equal(status(f), null)
}, { url: url() }))

await check('canceled print callbacks and listeners cannot print or clear the current snapshot after edit, locale or sharing', () => use(async f => {
  await f.start(); await f.click(f.child, 'data-running-export', 'print')
  const first = f.allFrames.at(-1)
  await goal(f, 0, 'seconds', '1'); await goal(f, 0, 'seconds', '0')
  first(); await f.sync(); assert.equal(f.prints.length, 0); assert.equal(f.printHost, null)
  await f.click(f.parent, 'data-running-single-action', 'print'); const second = f.allFrames.at(-1)
  await f.locale('en', 'ko'); await f.locale('ko'); second(); await f.sync(); assert.equal(f.prints.length, 0)
  await f.click(f.child, 'data-running-export', 'print'); const third = f.allFrames.at(-1)
  await f.shareAction('copy'); third(); await f.sync(); assert.equal(f.prints.length, 0)
  await f.click(f.child, 'data-running-export', 'print')
  first(); second(); third(); await f.sync(); assert.equal(f.prints.length, 0)
  await f.frame(); assert.equal(f.prints.length, 1); assert.equal(f.prints[0].rows, 25)
  await f.afterPrint(); assert.equal(f.printHost, null); assert.equal(status(f), null)
  f.printThrows(true); await f.click(f.parent, 'data-running-single-action', 'print'); await f.frame()
  assert.equal(status(f), 'printFailed'); assert.equal(f.printHost, null)
  f.printThrows(false); await f.click(f.parent, 'data-running-single-action', 'print'); await f.frame(); assert.equal(f.prints.length, 2)
}, { url: url() }))

await check('effect replay and unmount own native promises, image callbacks, print callbacks and Blob URLs exactly once', () => use(async f => {
  f.parent.replayEffects(); await f.start(); f.parent.replayEffects(); await f.start()
  await f.click(f.child, 'data-running-export', 'csv')
  await f.click(f.child, 'data-running-export', 'csv')
  assert.equal(f.urls.size, 2)
  f.copyMode('wait'); await f.click(f.parent, 'data-running-single-action', 'copy'); const native = f.pendingCopies.shift()
  await f.shareAction('save'); const image = f.images.shift()
  await f.click(f.child, 'data-running-export', 'print'); const frame = f.allFrames.at(-1)
  const copyHandler = by(f.parent, 'data-running-single-action', 'copy').props.onClick
  const csvHandler = by(f.child, 'data-running-export', 'csv').props.onClick
  const oldUrlCount = f.urls.size, files = f.files.length, copies = f.copied.length
  f.close(); native.reject(new Error('closed')); image.resolve(new Blob(['obsolete'])); frame(); copyHandler(); csvHandler(); await tick()
  assert.equal(f.legacyCalls, 0); assert.equal(f.files.length, files); assert.equal(f.copied.length, copies); assert.equal(f.prints.length, 0)
  assert.equal(f.urls.size, 0); assert.equal(f.revoked.length, oldUrlCount); assert.equal(new Set(f.revoked).size, oldUrlCount)
}, { url: url() }))

console.log(`RunningPace independent actual parent: ${groups} groups passed`)
