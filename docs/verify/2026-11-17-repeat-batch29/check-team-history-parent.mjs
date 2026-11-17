import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from './team-parent-harness.mjs'
import { TEAM_ROSTERS_KEY } from '../../../src/utils/teamRosters.ts'

const has = (node, key) => Object.hasOwn(node.props, key)
const clone = value => JSON.parse(JSON.stringify(value))
const flush = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch29/translations-team-actions.json', 'utf8'))
const messagesFor = locale => {
  const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'))
  Object.assign(messages.teamDivider, patch[locale].teamDivider); return messages
}
const initialBoard = { teams: [['A', 'B', 'C'], ['D', 'E', 'F']], skills: { A: 5, B: 4, C: 3, D: 2, E: 1, F: 3 }, mode: 'random' }
let groups = 0
async function check(name, run) { if (process.argv.includes('--strict') && !name.startsWith('Strict')) return; await run(); groups++; console.log('PASS', name) }

async function fixture({ shared = initialBoard, motion = false } = {}) {
  const messages = messagesFor('ko'), storage = new Map(), writes = [], intervals = new Map(), oldIntervals = [], focus = [], downloads = [], urls = new Map(), revoked = [], copied = [], jobs = []
  let timer = 0, url = 0, seed = 99, copyMode = 'success', fallback = false, fallbackCalls = 0, clickFailure = false
  const math = Object.create(Math); math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  class Url extends URL { static createObjectURL(blob) { const value = `blob:team-${++url}`; urls.set(value, blob); return value } static revokeObjectURL(value) { revoked.push(value) } }
  class Host {
    constructor() { this.style = {} }
    focus() {} select() {} setSelectionRange() {} remove() {}
    click() { if (clickFailure) throw new Error('download denied'); downloads.push({ blob: urls.get(this.href), name: this.download, url: this.href }) }
  }
  const h = await componentHarness('src/components/TeamDivider.tsx', {
    props: {}, messages, url: 'https://toolhub.ai.kr/team-divider/' + (shared ? '#board=' + encodeURIComponent(JSON.stringify(shared)) : ''), window: { matchMedia: () => ({ matches: !motion }) },
    globals: { Math: math, crypto, AbortController, URL: Url, HTMLElement: Host,
      setInterval(callback, delay) { const id = ++timer; assert.equal(delay, 80); intervals.set(id, callback); oldIntervals.push({ id, callback }); return id }, clearInterval(id) { intervals.delete(id) },
      fetch() { throw new Error('Unexpected external request') },
    },
    storagePort: { getItem: key => storage.get(key) ?? null, setItem(key, value) { writes.push({ key, value }); storage.set(key, value) } },
    document: { activeElement: new Host(), body: { appendChild() {} }, createElement: () => new Host(), execCommand() { fallbackCalls++; return fallback } },
    navigator: { clipboard: { writeText(text) { copied.push(text); if (copyMode === 'failure') return Promise.reject(new Error('denied')); if (copyMode === 'pending') { const task = deferred(); jobs.push(task); return task.promise }; return Promise.resolve() } } },
    modules: { '@/components/GuideSection': { __esModule: true, default: 'GuideSection' }, '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' }, '@/components/TeamRosterBackup': { __esModule: true, default: 'TeamRosterBackup' } },
    beforeEffects(tree) {
      const visit = node => {
        if (!node || typeof node !== 'object') return
        if (Array.isArray(node)) { node.forEach(visit); return }
        if (node.props?.ref && (has(node, 'data-team-undo') || has(node, 'data-team-redo'))) node.props.ref.current = { disabled: node.props.disabled, focus() { focus.push(has(node, 'data-team-undo') ? 'undo' : 'redo') } }
        visit(node.props?.children)
      }; visit(tree)
    },
  })
  h.render()
  const node = (name, value = '') => h.find(item => item.props[`data-team-${name}`] === value)
  const panel = () => h.find(item => item.props.id === 'team-divider-result')
  const board = () => h.all().find(item => typeof item.type === 'function' && item.type.name === 'InteractiveTeamBoard')?.props
  const recovery = () => h.all().find(item => typeof item.type === 'function' && item.type.name === 'TeamResultCopyRecovery')
  const settle = async () => { await flush(); h.render() }
  return { h, messages, node, panel, board, recovery, storage, writes, intervals, oldIntervals, focus, downloads, urls, revoked, copied, jobs, settle,
    past: () => panel().props['data-team-history-past'], future: () => panel().props['data-team-history-future'], teams: () => clone(board()?.teams ?? []),
    click(name, value = '') { node(name, value).props.onClick(); h.render() },
    mode(value) { h.find(item => item.props.type === 'radio' && item.props.value === value).props.onChange(); h.render() },
    skill(name, value) { h.find(item => item.type === 'select' && item.props['aria-label'] === messages.teamDivider.skillFor.replace('{name}', name)).props.onChange({ target: { value: String(value) } }); h.render() },
    move(name, index) { board().onMove(name, index); h.render() },
    select(name) { board().onSelect(name); h.render() },
    lock(name) { board().onLock(name); h.render() },
    attendance(name, checked) { h.find(item => item.props.type === 'checkbox' && item.props['aria-label'] === messages.teamDivider.attendance.attending.replace('{name}', name)).props.onChange({ target: { checked } }); h.render() },
    copyMode(value, legacy = false) { copyMode = value; fallback = legacy }, fallbackCalls: () => fallbackCalls,
    async copy() { node('result-copy').props.onClick(); await settle() },
    clickFailure(value) { clickFailure = value },
    locale(locale) { messages.teamDivider = messagesFor(locale).teamDivider; h.render() },
    cleanup() { h.cleanup() },
  }
}

await check('Strict effect setup-cleanup-setup leaves initial board actions and shared-result actions usable', async () => {
  const fresh = await fixture({ shared: null }); fresh.h.replayEffects(); fresh.click('divide', 'initial')
  assert.equal(fresh.teams().flat().length, 6); fresh.cleanup()
  const shared = await fixture(); shared.h.replayEffects(); shared.move('A', 1)
  assert.equal(shared.past(), 1); await shared.copy(); assert.equal(shared.copied.length, 1); shared.cleanup()
})

await check('Shared seed, move/swap/lock undo+redo restore exact board and focus; 20 transitions remain bounded', async () => {
  const f = await fixture(); assert.equal(f.past(), 0); assert.deepEqual(f.teams(), initialBoard.teams)
  const staleMove = f.board().onMove
  f.move('A', 1); const moved = f.teams(); assert.equal(f.past(), 1)
  f.click('undo'); assert.deepEqual(f.teams(), initialBoard.teams); assert.equal(f.focus.at(-1), 'redo')
  staleMove('B', 1); f.h.render(); assert.deepEqual(f.teams(), initialBoard.teams)
  f.click('redo'); assert.deepEqual(f.teams(), moved); assert.equal(f.focus.at(-1), 'undo')
  f.select('A'); f.select('B'); const swapped = f.teams(); assert.ok(swapped[0].includes('A')); assert.ok(swapped[1].includes('B'))
  f.lock('B'); assert.deepEqual(clone(f.board().locked), ['B']); f.click('undo'); assert.deepEqual(clone(f.board().locked), []); f.click('redo'); assert.deepEqual(clone(f.board().locked), ['B'])
  for (let index = 0; index < 25; index++) f.lock('B')
  assert.equal(f.past(), 20)
  for (let index = 0; index < 20; index++) f.click('undo')
  assert.equal(f.past(), 0); assert.equal(f.future(), 20); assert.equal(f.focus.at(-1), 'redo')
  for (let index = 0; index < 20; index++) f.click('redo')
  assert.equal(f.past(), 20); assert.equal(f.future(), 0); assert.equal(f.focus.at(-1), 'undo'); assert.equal(f.writes.length, 0)
  f.cleanup()
})

await check('No-op move and identical redivision preserve redo; real board edit branches history', async () => {
  const f = await fixture()
  for (const name of ['A', 'B', 'D', 'E', 'F', 'C']) f.lock(name)
  f.click('undo'); const before = f.teams(), past = f.past(); assert.equal(f.future(), 1)
  f.move('C', 0); assert.equal(f.past(), past); assert.equal(f.future(), 1)
  f.click('divide', 'again'); assert.deepEqual(f.teams(), before); assert.equal(f.past(), past); assert.equal(f.future(), 1)
  f.move('C', 1); assert.equal(f.future(), 0); assert.equal(f.past(), past + 1)
  f.cleanup()
})

await check('Rotation comparison metadata restores while current skills/next mode remain outside undo and redo', async () => {
  const f = await fixture({ shared: { ...initialBoard, mode: 'balanced' } }); f.click('rotate')
  const rotated = f.teams(), repeated = () => f.h.find(node => has(node, 'data-repeated-pairs')).props['data-repeated-pairs']
  const pairOracle = teams => {
    let pairs = 0
    for (const team of teams) for (let a = 0; a < team.length; a++) for (let b = a + 1; b < team.length; b++) if (initialBoard.teams.findIndex(previous => previous.includes(team[a])) === initialBoard.teams.findIndex(previous => previous.includes(team[b]))) pairs++
    return pairs
  }
  const baselinePrefix = f.messages.teamDivider.rotation.skillBaseline.split('{count}')[0]
  const baseline = () => f.h.all().find(node => node.type === 'p' && typeof node.props.children === 'string' && node.props.children.startsWith(baselinePrefix))?.props.children
  const count = repeated(), originalBaseline = baseline(); assert.equal(count, pairOracle(rotated)); assert.ok(originalBaseline)
  f.move(rotated[0][0], 1); const edited = f.teams(); assert.ok(f.h.text().includes(f.messages.teamDivider.rotation.editedHint))
  f.click('undo'); assert.deepEqual(f.teams(), rotated); assert.equal(repeated(), count); assert.equal(baseline(), originalBaseline)
  const skillName = rotated[0][0], current = f.board().skills[skillName]; f.skill(skillName, current === 5 ? 1 : 5)
  assert.equal(f.future(), 1); const retained = f.board().skills[skillName]
  f.mode('captain'); assert.equal(f.future(), 1); f.click('redo'); assert.deepEqual(f.teams(), edited); assert.equal(f.board().skills[skillName], retained)
  assert.equal(f.panel().props['data-team-result-mode'], 'balanced'); assert.equal(f.h.find(node => node.props.type === 'radio' && node.props.value === 'captain').props.checked, true)
  assert.ok(f.h.text().includes(f.messages.teamDivider.rotation.editedHint)); assert.equal(repeated(), pairOracle(edited)); f.click('undo'); assert.equal(f.board().skills[skillName], retained); assert.equal(baseline(), undefined)
  const share = f.h.find(node => node.type === 'ShareResult').props.url
  const restored = JSON.parse(decodeURIComponent(new URL(share).hash.slice(7))); assert.equal(restored.mode, 'balanced'); assert.deepEqual(restored.teams, rotated)
  f.cleanup()
})

await check('Attendance/reset and full-roster save/load keep schema and all names; teams/share include only attendees', async () => {
  const f = await fixture(); f.move('A', 1); f.click('undo'); f.attendance('F', false)
  assert.equal(f.past(), 0); assert.equal(f.future(), 0); assert.deepEqual(f.teams(), [])
  f.click('divide', 'initial'); assert.equal(f.teams().flat().includes('F'), false)
  const share = f.h.find(node => node.type === 'ShareResult').props.url
  assert.equal(JSON.parse(decodeURIComponent(new URL(share).hash.slice(7))).teams.flat().includes('F'), false)
  f.h.find(node => node.type === 'input' && node.props.placeholder === f.messages.teamDivider.rosters.placeholder).props.onChange({ target: { value: 'Full roster' } }); f.h.render()
  await f.h.button(f.messages.teamDivider.rosters.save).props.onClick(); await f.settle()
  const records = JSON.parse(f.storage.get(TEAM_ROSTERS_KEY)); assert.equal(records[0].names.length, 6); assert.ok(records[0].names.includes('F'))
  f.h.button(f.messages.teamDivider.rosters.load).props.onClick(); f.h.render(); assert.deepEqual(f.teams(), []); assert.equal(f.past(), 0); assert.equal(f.future(), 0)
  f.click('divide', 'initial'); assert.equal(f.teams().flat().length, 6)
  f.h.find(node => node.type === 'button' && node.props.children === 3).props.onClick(); f.h.render(); assert.deepEqual(f.teams(), []); assert.equal(f.past(), 0)
  f.click('divide', 'initial'); assert.equal(f.teams().length, 3); assert.equal(f.writes.length, 1)
  f.cleanup()
})

await check('Captain starts a new seed, rejects stale picks after cancel/completion and handles exact captain count', async () => {
  const f = await fixture(); f.move('A', 1); f.mode('captain'); f.click('divide', 'again'); assert.equal(f.past(), 0); assert.equal(f.future(), 0)
  assert.equal(f.panel().props['data-team-drafting'], true); assert.equal(f.board().disabled, true)
  const oldPick = f.h.find(node => has(node, 'data-team-draft-pick')).props.onClick
  f.h.button(f.messages.teamDivider.board.cancelDraft).props.onClick(); f.h.render(); oldPick(); f.h.render(); assert.deepEqual(f.teams(), [])
  f.click('divide', 'initial')
  while (f.panel().props['data-team-drafting']) { f.h.find(node => has(node, 'data-team-draft-pick')).props.onClick(); f.h.render() }
  const completed = f.teams(); assert.equal(completed.flat().length, 6); assert.equal(f.past(), 0)
  oldPick(); f.h.render(); assert.deepEqual(f.teams(), completed)
  f.lock(completed[0][0]); assert.equal(f.past(), 1); f.click('undo'); assert.equal(f.panel().props['data-team-result-mode'], 'captain')
  for (const name of ['C', 'D', 'E', 'F']) f.attendance(name, false)
  f.click('divide', 'initial'); assert.deepEqual(f.teams(), [['A'], ['B']]); assert.equal(f.panel().props['data-team-drafting'], false); assert.equal(f.past(), 0)
  f.cleanup()
})

await check('Reveal uses own timer generation; old tick/skip never stop a new reveal and history restore is immediate', async () => {
  const f = await fixture({ motion: true }); f.mode('balanced'); f.click('divide', 'again')
  assert.equal(f.panel().props['data-team-dividing'], true); assert.equal(f.node('undo').props.disabled, true)
  const previous = f.oldIntervals.at(-1), oldSkip = f.node('reveal-skip').props.onClick, during = f.teams()
  f.click('undo'); assert.deepEqual(f.teams(), during)
  f.click('reveal-skip'); assert.equal(f.intervals.size, 0); assert.equal(f.board().revealCount, Infinity)
  f.mode('random'); f.click('divide', 'again'); const active = f.oldIntervals.at(-1)
  previous.callback(); oldSkip(); f.h.render(); assert.equal(f.intervals.has(active.id), true); assert.equal(f.board().revealCount, 0)
  for (let tick = 0; tick < 20 && f.intervals.has(active.id); tick++) { active.callback(); f.h.render() }
  assert.equal(f.panel().props['data-team-dividing'], false); const count = f.oldIntervals.length
  f.click('undo'); assert.equal(f.board().revealCount, Infinity); assert.equal(f.intervals.size, 0); assert.equal(f.oldIntervals.length, count)
  f.cleanup(); active.callback(); assert.equal(f.intervals.size, 0)
})

await check('Copy and TXT share exact current text; false/retry and late input/undo/locale/close/unmount never claim stale success', async () => {
  const f = await fixture({ shared: { ...initialBoard, mode: 'balanced' } })
  await f.copy(); const text = f.copied.at(-1); assert.ok(text.includes('A(5)')); assert.equal(f.node('result-copy').props['data-team-result-copied'], true)
  f.click('result-download'); assert.equal(await f.downloads[0].blob.text(), text); assert.equal(f.downloads[0].name, 'team-divider.txt')
  f.copyMode('failure'); await f.copy(); assert.equal(f.node('result-copy').props['data-team-result-copied'], false); assert.equal(f.recovery().props.text, text)
  f.copyMode('success'); f.recovery().props.onRetry(); await f.settle(); assert.equal(f.recovery(), undefined)
  f.clickFailure(true); f.click('result-download'); assert.ok(f.h.text().includes(f.messages.teamDivider.resultActions.downloadFailed)); assert.equal(f.teams().flat().length, 6)
  f.h.tick(1000); f.cleanup(); assert.equal(f.revoked.length, f.urls.size)
  for (const change of ['move', 'undo', 'attendance', 'skill', 'locale', 'close', 'unmount']) {
    const f = await fixture({ shared: { ...initialBoard, mode: 'balanced' } }); f.lock('A')
    f.copyMode('failure'); await f.copy(); f.copyMode('pending'); f.recovery().props.onRetry(); f.h.render(); const previous = f.fallbackCalls()
    if (change === 'move') f.move('B', 1)
    if (change === 'undo') f.click('undo')
    if (change === 'attendance') f.attendance('F', false)
    if (change === 'skill') f.skill('A', 1)
    if (change === 'locale') f.locale('en')
    if (change === 'close') { f.recovery().props.onClose(); f.h.render() }
    if (change === 'unmount') f.cleanup()
    f.jobs[0].reject(new Error('late clipboard')); await f.settle(); assert.equal(f.fallbackCalls(), previous)
    if (change !== 'unmount') { assert.equal(f.recovery(), undefined); const copy = f.h.all().find(node => has(node, 'data-team-result-copied')); if (copy) assert.equal(copy.props['data-team-result-copied'], false); f.cleanup() }
  }
})

await check('Actual board child clears drag/hover on epoch without remounting member identity', async () => {
  const moved = [], props = { teams: [['A'], ['B']], skills: {}, locked: [], selected: null, disabled: false, showSkills: false, revealCount: Infinity, interactionEpoch: 1, onSelect() {}, onLock() {}, onMove: (...args) => moved.push(args) }
  const h = await componentHarness('src/components/InteractiveTeamBoard.tsx', { props, messages: messagesFor('ko') }); h.render()
  const member = () => h.find(node => node.props['data-member'] === 'A'), target = () => h.find(node => node.props['data-team'] === 1)
  const key = member().key, event = { dataTransfer: { setData() {} }, preventDefault() {} }
  member().props.onDragStart(event); h.render(); target().props.onDragOver(event); h.render(); assert.ok(target().props.className.includes('border-primary'))
  h.setProps({ ...props, interactionEpoch: 2 }); assert.equal(member().key, key); assert.equal(target().props.className.includes('border-primary'), false)
  target().props.onDrop(event); h.render(); assert.equal(moved.length, 0)
  h.cleanup()
})

console.log(`Team history parent: ${groups} groups passed (actual parent/board, controlled host refs/clipboard/timers; DOM focus/browser separate)`)
