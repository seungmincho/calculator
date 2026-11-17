import assert from 'node:assert/strict'
import fs from 'node:fs'

// Reuse only the author's host/clipboard/timer ports. No author checks are executed.
const authorUrl = new URL('./check-team-history-parent.mjs', import.meta.url)
const author = fs.readFileSync(authorUrl, 'utf8')
const marker = "await check('Strict effect"
assert.ok(author.includes(marker), 'Author fixture boundary must remain explicit')
const hostSource = author.slice(0, author.indexOf(marker))
  .replace("'./team-parent-harness.mjs'", JSON.stringify(new URL('./team-parent-harness.mjs', authorUrl).href))
  .replace("'../../../src/utils/teamRosters.ts'", JSON.stringify(new URL('../../../src/utils/teamRosters.ts', authorUrl).href))
const { fixture, initialBoard } = await import(`data:text/javascript;base64,${Buffer.from(hostSource + '\nexport { fixture, initialBoard };').toString('base64')}`)
const plain = value => JSON.parse(JSON.stringify(value))
const has = (node, key) => Object.hasOwn(node.props, key)
const snapshot = f => ({ teams: f.teams(), locked: plain(f.board()?.locked ?? []), mode: f.panel().props['data-team-result-mode'] })
let groups = 0
async function check(name, run) {
  if (process.argv[2] && !name.includes(process.argv[2])) return
  await run(); groups++; console.log('PASS', name)
}

await check('Strict replay remains usable; actual cleanup rejects all captured board/export handlers', async () => {
  for (const shared of [null, initialBoard]) {
    const f = await fixture({ shared })
    for (let replay = 0; replay < 3; replay++) f.h.replayEffects()
    if (!shared) f.click('divide', 'initial')
    const member = f.teams()[0][0]
    f.lock(member); assert.equal(f.past(), 1)
    f.click('undo'); f.click('redo'); assert.deepEqual(plain(f.board().locked), [member])
    const before = snapshot(f), past = f.past(), future = f.future()
    const old = f.board(), undo = f.node('undo').props.onClick, redo = f.node('redo').props.onClick
    const divide = f.node('divide', 'again').props.onClick, rotate = f.node('rotate').props.onClick
    const copy = f.node('result-copy').props.onClick, download = f.node('result-download').props.onClick
    f.cleanup()
    old.onSelect(member); old.onMove(member, 1); old.onLock(member); undo(); redo(); divide(); rotate(); await copy(); download(); f.h.render()
    assert.deepEqual(snapshot(f), before); assert.equal(f.past(), past); assert.equal(f.future(), future)
    assert.equal(f.copied.length, 0); assert.equal(f.downloads.length, 0); assert.equal(f.intervals.size, 0)
    assert.equal(f.writes.length, 0)
  }
})

await check('Actual event history follows an independent board timeline, no-op preserves redo, branch clears it', async () => {
  const f = await fixture(), timeline = [snapshot(f)]
  let cursor = 0
  const commit = state => { timeline.splice(++cursor); timeline.push(state); assert.deepEqual(snapshot(f), state); assert.equal(f.past(), cursor); assert.equal(f.future(), 0) }
  f.move('A', 1); commit({ teams: [['B', 'C'], ['D', 'E', 'F', 'A']], locked: [], mode: 'random' })
  f.lock('E'); commit({ ...timeline[cursor], locked: ['E'] })
  f.select('B'); f.select('D'); commit({ teams: [['D', 'C'], ['B', 'E', 'F', 'A']], locked: ['E'], mode: 'random' })
  f.move('F', 0); commit({ teams: [['D', 'C', 'F'], ['B', 'E', 'A']], locked: ['E'], mode: 'random' })
  for (let i = 0; i < 3; i++) { f.click('undo'); cursor--; assert.deepEqual(snapshot(f), timeline[cursor]); assert.equal(f.future(), timeline.length - 1 - cursor) }
  f.select('B'); assert.equal(f.board().selected, 'B'); const old = f.board()
  f.click('redo'); cursor++; assert.deepEqual(snapshot(f), timeline[cursor]); assert.equal(f.board().selected, null)
  old.onMove('C', 1); old.onSelect('A'); old.onLock('F'); f.h.render(); assert.deepEqual(snapshot(f), timeline[cursor]); assert.equal(f.board().selected, null)
  f.move('B', 0); assert.equal(f.future(), 2); assert.equal(f.past(), cursor)
  f.lock('C'); commit({ ...timeline[cursor], locked: ['E', 'C'] })
  f.click('undo'); cursor--; assert.deepEqual(snapshot(f), timeline[cursor]); f.click('redo'); cursor++; assert.deepEqual(snapshot(f), timeline[cursor])
  assert.equal(f.focus.at(-1), 'undo'); assert.equal(f.writes.length, 0); f.cleanup()
})

await check('Current skills and next mode stay outside history while result mode and rotation metadata restore', async () => {
  const f = await fixture({ shared: { ...initialBoard, mode: 'balanced' } })
  f.click('rotate'); const rotation = snapshot(f)
  const repeated = f.h.find(n => has(n, 'data-repeated-pairs')).props['data-repeated-pairs']
  f.move(rotation.teams[0][0], 1); const edited = snapshot(f); f.click('undo')
  f.skill('A', 1); f.skill('F', 5); f.mode('random'); f.mode('captain')
  assert.equal(f.future(), 1); assert.equal(f.board().skills.A, 1); assert.equal(f.board().skills.F, 5)
  f.click('redo'); assert.deepEqual(snapshot(f), edited); assert.equal(f.board().showSkills, true)
  assert.ok(f.h.text().includes(f.messages.teamDivider.rotation.editedHint))
  f.click('undo'); assert.deepEqual(snapshot(f), rotation)
  assert.equal(f.h.find(n => has(n, 'data-repeated-pairs')).props['data-repeated-pairs'], repeated)
  assert.equal(f.board().skills.A, 1); assert.equal(f.board().skills.F, 5)
  assert.equal(f.h.find(n => n.props.type === 'radio' && n.props.value === 'captain').props.checked, true)
  const share = new URL(f.h.find(n => n.type === 'ShareResult').props.url)
  const state = JSON.parse(decodeURIComponent(share.hash.slice(7)))
  assert.equal(state.mode, 'balanced'); assert.deepEqual(state.teams, rotation.teams); assert.equal(state.skills.A, 1)
  assert.equal(f.writes.length, 0); f.cleanup()
})

await check('Captain duplicate/stale picks cannot reassign members; final board becomes one fresh seed', async () => {
  const f = await fixture(); f.move('A', 1); f.mode('captain'); f.click('divide', 'again')
  const expected = [['A'], ['B']]
  let turn = 0
  while (f.panel().props['data-team-drafting']) {
    const buttons = f.h.all().filter(n => has(n, 'data-team-draft-pick'))
    const last = buttons.at(-1), name = last.props['data-team-draft-pick'], stalePick = last.props.onClick
    stalePick(); stalePick(); f.h.render(); expected[turn % 2].push(name); turn++
    assert.deepEqual(f.teams(), expected)
    stalePick(); f.h.render(); assert.deepEqual(f.teams(), expected)
  }
  assert.equal(f.past(), 0); assert.equal(f.future(), 0); assert.equal(f.panel().props['data-team-result-mode'], 'captain')
  assert.equal(new Set(f.teams().flat()).size, 6)
  f.lock('A'); f.click('undo'); assert.deepEqual(f.teams(), expected)
  f.click('divide', 'again'); const oldPick = f.h.find(n => has(n, 'data-team-draft-pick')).props.onClick
  f.cleanup(); oldPick(); f.h.render(); assert.deepEqual(f.teams(), [['A'], ['B']])
})

await check('Late reveal callbacks cannot change an undo restoration or a newer run, including after cleanup', async () => {
  const f = await fixture({ motion: true }); f.mode('balanced'); f.click('divide', 'again')
  const first = f.oldIntervals.at(-1), skip = f.node('reveal-skip').props.onClick
  first.callback(); f.h.render(); assert.equal(f.board().revealCount, 1)
  f.click('reveal-skip'); f.click('undo'); const restored = snapshot(f), count = f.oldIntervals.length
  for (let n = 0; n < 10; n++) first.callback()
  skip(); f.h.render(); assert.deepEqual(snapshot(f), restored); assert.equal(f.board().revealCount, Infinity); assert.equal(f.oldIntervals.length, count)
  f.click('redo'); f.mode('random'); f.click('divide', 'again'); const second = f.oldIntervals.at(-1)
  first.callback(); skip(); f.h.render(); assert.equal(f.board().revealCount, 0); assert.equal(f.intervals.has(second.id), true)
  const latest = snapshot(f); f.cleanup(); second.callback(); first.callback(); skip(); f.h.render()
  assert.deepEqual(snapshot(f), latest); assert.equal(f.intervals.size, 0)
})

await check('Copy completion is tied to latest export text and latest request, not the next distribution mode', async () => {
  const f = await fixture({ shared: { ...initialBoard, mode: 'balanced' } })
  f.copyMode('pending'); await f.copy(); const first = f.jobs[0]
  f.mode('captain'); assert.equal(f.node('result-copy').props.disabled, true)
  first.resolve(); await f.settle(); assert.equal(f.node('result-copy').props['data-team-result-copied'], true)
  f.mode('balanced'); f.copyMode('failure'); await f.copy(); const originalText = f.recovery().props.text
  f.copyMode('pending'); f.recovery().props.onRetry(); f.h.render(); const outdated = f.jobs[1]
  f.skill('A', 1); assert.equal(f.recovery(), undefined); assert.equal(f.node('result-copy').props['data-team-result-copied'], false)
  f.copyMode('success'); await f.copy(); const newText = f.copied.at(-1); assert.notEqual(newText, originalText)
  const fallbackCalls = f.fallbackCalls(); outdated.reject(new Error('old request')); await f.settle()
  assert.equal(f.fallbackCalls(), fallbackCalls); assert.equal(f.node('result-copy').props['data-team-result-copied'], true)
  f.h.tick(2000); assert.equal(f.node('result-copy').props['data-team-result-copied'], false)
  f.cleanup()
})

await check('TXT and copy match an independently assembled current board after undo, skill and locale changes', async () => {
  const f = await fixture({ shared: { ...initialBoard, mode: 'balanced' } })
  const urlBefore = f.h.window.location.href
  f.move('C', 1); f.lock('D'); f.click('undo'); f.skill('D', 5); f.locale('en')
  const m = f.messages.teamDivider
  const expected = `${m.teamLabel} 1 (2${m.memberUnit} · ${m.skillSum.replace('{sum}', '9')})\nA(5), B(4)\n\n${m.teamLabel} 2 (4${m.memberUnit} · ${m.skillSum.replace('{sum}', '12')})\nD(5), E(1), F(3), C(3)`
  await f.copy(); assert.equal(f.copied.at(-1), expected)
  f.click('result-download'); const first = f.downloads[0]
  assert.equal(await first.blob.text(), expected); assert.equal(first.name, 'team-divider.txt'); assert.equal(first.blob.type, 'text/plain;charset=utf-8')
  f.click('undo'); f.click('result-download'); const second = f.downloads[1]
  assert.notEqual(await second.blob.text(), expected); assert.equal(await first.blob.text(), expected)
  f.cleanup(); assert.equal(new Set(f.revoked).size, 2); assert.equal(f.revoked.length, 2)
  assert.equal(f.h.window.location.href, urlBefore); assert.equal(f.writes.length, 0)
})

await check('History focus always chooses an enabled native button; stale member selections cannot survive restoration', async () => {
  const f = await fixture(); f.move('A', 1); f.select('B'); f.click('undo')
  assert.equal(f.board().selected, null); assert.equal(f.focus.at(-1), 'redo'); assert.equal(f.node('redo').props.disabled, false)
  f.click('redo'); assert.equal(f.focus.at(-1), 'undo'); assert.equal(f.node('undo').props.disabled, false)
  f.lock('F'); f.click('undo'); assert.equal(f.focus.at(-1), 'undo')
  for (const action of ['undo', 'redo']) {
    const n = f.node(action); assert.equal(n.type, 'button'); assert.ok(n.props.className.includes('min-h-11')); assert.equal(n.props.onKeyDown, undefined)
  }
  f.attendance('F', false); assert.equal(f.past(), 0); assert.equal(f.future(), 0); assert.deepEqual(f.teams(), [])
  f.click('divide', 'initial'); assert.equal(f.teams().flat().length, 5); assert.equal(f.past(), 0)
  f.cleanup()
})

console.log(`Team actual-parent independent review: ${groups} groups passed; no pure-history re-run, controlled hooks/host refs, native browser focus separate.`)
