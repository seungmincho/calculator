import assert from 'node:assert/strict'
import { componentHarness } from '../2026-11-17-repeat-batch19/component-harness.cjs'
import * as core from '../../../src/utils/minesweeper.ts'
import { captureClassicReplaySource, createClassicPractice } from '../../../src/utils/minesweeperReplay.ts'

const BEST = 'toolhub-minesweeper-best', DAILY = 'toolhub-minesweeper-daily', PREFS = 'toolhub-minesweeper-prefs'
const has = (node, key) => Object.hasOwn(node.props, key)
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
let groups = 0
async function check(name, run) { await run(); groups++; console.log('PASS', name) }

async function fixture({ small = false, pending = null, noGuess = false } = {}) {
  let now = 800000, timerId = 0
  const timers = new Map(), boards = [], calls = { generate: 0, noGuess: 0, records: [], submits: [], names: [], qualified: [], refresh: 0 }
  const stored = new Map([[BEST, '{"beginner":90000}'], [DAILY, '{"1":{"won":false,"ms":1000,"progress":0.2}}'], [PREFS, JSON.stringify({ diff: small ? 'custom' : 'beginner', custom: { w: 5, h: 5, mines: 1 }, noGuess, qmarks: true })]])
  const storagePort = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) }
  const generate = (w, h, mines, first) => {
    const layout = small ? { w, h, mine: Array.from({ length: w * h }, (_, i) => i === 0), count: Array.from({ length: w * h }, (_, i) => i === 1 || i === w || i === w + 1 ? 1 : 0) } : core.generate(w, h, mines, first, core.mulberry32(85431))
    boards.push(layout)
    return layout
  }
  const leaderboard = { config: { formatScore: String }, savedPlayerName: '', checkQualifies(score) { calls.qualified.push(score); return true }, fetchLeaderboard() { calls.refresh++ }, async submitScore(...args) { calls.submits.push(args); if (pending) await pending.promise; return true }, savePlayerName(name) { calls.names.push(name) } }
  const h = await componentHarness('src/components/Minesweeper.tsx', {
    props: {}, storagePort, url: 'https://toolhub.ai.kr/minesweeper/#kept', window: { matchMedia: () => ({ matches: true }) },
    globals: { Date: class extends Date { static now() { return now } }, fetch() { throw new Error('Real network prohibited in independent fixture') },
      setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id }, clearTimeout(id) { timers.delete(id) },
    },
    modules: {
      '@/utils/minesweeper': { ...core, generate(...args) { calls.generate++; return generate(...args) }, generateNoGuess(...args) { calls.noGuess++; return { board: generate(...args), ok: false } } },
      '@/hooks/useLeaderboard': { useLeaderboard: () => leaderboard },
      '@/hooks/useGameAchievements': { useGameAchievements: () => ({ achievements: [], newlyUnlocked: [], unlockedCount: 0, totalCount: 0, dismissNewAchievements() {}, recordGameResult(value) { calls.records.push(value); stored.set('fixture-achievements', JSON.stringify(calls.records)) } }) },
      '@/hooks/useGameSounds': { useGameSounds: () => ({ enabled: false, setEnabled() {}, playWin() {}, playLose() {}, playMove() {}, playInvalid() {} }) },
      '@/components/LeaderboardPanel': { __esModule: true, default: 'LeaderboardPanel' }, '@/components/NameInputModal': { __esModule: true, default: 'NameInputModal' },
      '@/components/GameAchievements': { __esModule: true, default: 'GameAchievements', AchievementToast: 'AchievementToast' }, '@/components/GameConfetti': { __esModule: true, default: 'GameConfetti' },
    },
  })
  h.render()
  const board = () => h.find(node => node.props.role === 'grid')
  const attr = key => board().props[`data-minesweeper-${key}`]
  const event = (i, extra = {}) => ({ target: { closest: () => ({ dataset: { i: String(i) } }) }, pointerId: 1, pointerType: 'mouse', clientX: 0, clientY: 0, detail: 0, preventDefault() {}, ...extra })
  const click = i => { board().props.onClick(event(i)); h.render() }
  const action = key => { h.find(node => has(node, `data-minesweeper-${key}`)).props.onClick(); h.render() }
  const states = () => h.all().filter(node => node.props.role === 'gridcell').map(node => JSON.parse(node.props['aria-label'].slice('cellLabel'.length)).state)
  const clock = () => h.find(node => typeof node.type === 'function' && node.type.name === 'Clock').props
  return { h, calls, timers, boards, stored, board, attr, event, click, action, states, clock,
    modal: () => h.find(node => node.type === 'NameInputModal').props,
    bytes: () => JSON.stringify([...stored].sort()),
    time(ms) { now += ms },
    start(first = 40) { click(first); return boards.at(-1) },
    win(layout) { for (let i = 0; i < layout.mine.length; i++) if (!layout.mine[i]) { now += 40; click(i) } assert.equal(attr('status'), 'won') },
    lose(layout) { now += 300; click(layout.mine.indexOf(true)); assert.equal(attr('status'), 'lost') },
    right(i) { board().props.onPointerDown(event(i)); board().props.onContextMenu(event(i)); h.render() },
    cleanup() { h.cleanup() },
  }
}

await check('Independent 5x5 count/flood oracle preserves cloned arrays and immediate practice win', () => {
  const layout = { w: 5, h: 5, mine: Array.from({ length: 25 }, (_, i) => i === 0), count: Array.from({ length: 25 }, (_, i) => [1, 5, 6].includes(i) ? 1 : 0) }
  const source = captureClassicReplaySource(layout, 24, 'custom', true), before = JSON.stringify(source)
  const practice = createClassicPractice(source)
  assert.equal(practice.status, 'won'); assert.equal(practice.open.filter(Boolean).length, 24); assert.equal(practice.open[0], false)
  assert.deepEqual([practice.start, practice.end, practice.clicks, practice.boom], [0, 0, 0, -1])
  assert.ok(practice.marks.every(value => value === 0)); assert.equal(practice.noGuessFailed, true)
  practice.layout.mine[0] = false; practice.layout.count[1] = 0; practice.open[1] = false; practice.marks[2] = 1
  assert.equal(JSON.stringify(source), before); assert.equal(layout.mine[0], true); assert.equal(layout.count[1], 1)
  assert.deepEqual(createClassicPractice(source).layout.mine, layout.mine)
})

await check('Actual normal loss/win then repeated same-layout practice preserves bytes and never adds record/RPC calls', async () => {
  for (const ending of ['lost', 'won']) {
    const f = await fixture({ noGuess: ending === 'lost' }), layout = f.start(), frozenLayout = JSON.stringify(layout)
    assert.ok(!f.h.all().some(node => has(node, 'data-minesweeper-replay')))
    if (ending === 'lost') f.lose(layout); else f.win(layout)
    assert.equal(f.calls.records.length, 1)
    const bytes = f.bytes(), recordCalls = JSON.stringify(f.calls), generated = f.boards.length
    f.action('replay'); const opening = f.states()
    assert.equal(f.attr('first'), 40); assert.equal(f.attr('clicks'), 0); assert.equal(f.clock().start, 0)
    f.click(40); assert.equal(f.attr('clicks'), 0); assert.equal(f.clock().start, 0)
    const mine = layout.mine.indexOf(true); f.time(4000); f.right(mine)
    assert.ok(f.clock().start > 800000); assert.equal(f.attr('clicks'), 1); assert.equal(f.states()[mine], 'cell.flag')
    f.right(mine); assert.equal(f.states()[mine], 'cell.question')
    f.click(mine); assert.equal(f.attr('status'), 'lost')
    f.action('replay'); assert.deepEqual(f.states(), opening)
    f.lose(layout)
    assert.deepEqual(f.states().map((state, i) => state === 'cell.mine' ? i : -1).filter(i => i >= 0), layout.mine.map((value, i) => value ? i : -1).filter(i => i >= 0))
    f.action('replay'); assert.deepEqual(f.states(), opening); f.win(layout)
    assert.equal(f.modal().isOpen, false); assert.ok(!f.h.all().some(node => node.type === 'ShareResult'))
    f.action('replay'); assert.deepEqual(f.states(), opening)
    assert.equal(f.bytes(), bytes); assert.equal(JSON.stringify(f.calls), recordCalls); assert.equal(f.boards.length, generated); assert.equal(JSON.stringify(layout), frozenLayout)
    if (ending === 'lost') assert.ok(f.h.text().includes('noGuessFailed'))
    f.cleanup()
  }
})

await check('Old modal cannot submit after replay; already started mock submission cannot save its name afterwards', async () => {
  const f = await fixture(), layout = f.start(); f.win(layout)
  assert.equal(f.calls.qualified.length, 1); assert.ok(JSON.parse(f.stored.get(BEST)).beginner < 90000)
  const old = f.modal(); assert.equal(old.isOpen, true)
  f.action('replay'); await old.onSubmit('late-fixture'); assert.equal(f.calls.submits.length, 0); assert.equal(f.calls.names.length, 0); f.cleanup()
  const pending = deferred(), g = await fixture({ pending }), other = g.start(); g.win(other)
  const submit = g.modal().onSubmit; const first = submit('pending-fixture'), duplicate = submit('duplicate-fixture')
  assert.equal(g.calls.submits.length, 1); g.action('replay'); pending.resolve(); await Promise.all([first, duplicate])
  assert.equal(g.calls.names.length, 0); assert.equal(g.modal().isOpen, false); g.cleanup()
})

await check('Small actual parent immediate replay completes repeatedly at zero without records or a stalled ready state', async () => {
  const f = await fixture({ small: true }); f.start(24); assert.equal(f.attr('status'), 'won')
  const bytes = f.bytes(), records = f.calls.records.length
  for (let attempt = 0; attempt < 4; attempt++) {
    f.action('replay'); assert.equal(f.attr('practice'), 'true'); assert.equal(f.attr('status'), 'won')
    assert.equal(f.attr('clicks'), 0); assert.equal(f.clock().start, 0); assert.equal(f.clock().end, 0)
    assert.ok(f.h.text().includes('replay.automaticWin')); assert.equal(f.modal().isOpen, false)
  }
  assert.equal(f.bytes(), bytes); assert.equal(f.calls.records.length, records); assert.equal(f.calls.submits.length, 0); assert.equal(f.calls.generate, 1)
  f.cleanup()
})

await check('Stale same-pointer timers/events cannot affect replay; current pointer, IME and unmount boundaries remain', async () => {
  const f = await fixture(), layout = f.start(), mine = layout.mine.indexOf(true), old = f.board().props
  old.onPointerDown(f.event(mine, { pointerType: 'touch', pointerId: 7 }))
  const timer = [...f.timers.values()].find(value => value.delay === 350)
  f.lose(layout); f.action('replay'); const generation = f.attr('generation')
  const current = f.board().props
  current.onPointerDown(f.event(mine, { pointerType: 'touch', pointerId: 7 }))
  const validTimer = [...f.timers.values()].find(value => value.delay === 350)
  timer.callback(); old.onPointerUp(f.event(mine, { pointerType: 'touch', pointerId: 7 })); old.onPointerCancel(f.event(mine, { pointerType: 'touch', pointerId: 7 }))
  old.onClick(f.event(mine)); old.onContextMenu(f.event(mine)); old.onKeyDown({ key: 'f', nativeEvent: {}, preventDefault() {} }); f.h.render()
  assert.equal(f.attr('clicks'), 0); assert.equal(f.attr('generation'), generation)
  validTimer.callback(); f.h.render(); assert.equal(f.attr('clicks'), 1); assert.equal(f.states()[mine], 'cell.flag')
  f.board().props.onClick(f.event(mine, { detail: 1 })); f.h.render(); assert.equal(f.attr('clicks'), 1)
  f.board().props.onKeyDown({ key: 'f', keyCode: 229, nativeEvent: { isComposing: true }, preventDefault() {} }); f.h.render(); assert.equal(f.attr('clicks'), 1)
  f.cleanup(); validTimer.callback(); old.onClick(f.event(mine)); assert.equal(f.calls.submits.length, 0)
})

await check('Same classic/same difficulty/new game and daily roundtrip leave practice; daily never offers replay', async () => {
  for (const exit of ['sameClassic', 'sameDifficulty', 'newGame', 'daily']) {
    const f = await fixture(), layout = f.start(); f.lose(layout); f.action('replay')
    if (exit === 'sameClassic') f.h.find(node => node.props.role === 'tab' && node.props['aria-selected']).props.onClick()
    if (exit === 'sameDifficulty') f.h.find(node => node.props['data-minesweeper-difficulty'] === 'beginner').props.onClick()
    if (exit === 'newGame') f.h.find(node => has(node, 'data-minesweeper-new-game')).props.onClick()
    if (exit === 'daily') f.h.find(node => node.props.role === 'tab' && !node.props['aria-selected']).props.onClick()
    f.h.render(); assert.equal(f.attr('practice'), 'false'); assert.equal(f.attr('status'), 'ready')
    assert.ok(!f.h.all().some(node => has(node, 'data-minesweeper-replay')))
    if (exit === 'daily') {
      assert.equal(f.h.window.location.search, '?mode=daily')
      const daily = core.dailyBoard(core.dayNumber(800000)).board
      f.lose(daily); assert.equal(f.calls.records.at(-1).difficulty, 'daily')
      assert.ok(!f.h.all().some(node => has(node, 'data-minesweeper-replay')))
      f.h.button('modeClassic').props.onClick(); f.h.render(); assert.equal(f.attr('first'), ''); assert.equal(f.attr('practice'), 'false')
      assert.equal(f.h.window.location.search, '')
    }
    f.cleanup()
  }
})

console.log(`Minesweeper independent: ${groups} groups passed (actual parent; all leaderboard/storage/clock ports controlled; network prohibited)`)
