/* eslint-disable @typescript-eslint/no-require-imports */
// Actual parent event fixture. React/clock/storage/sound/RPC ports are controlled; no network writes.
const assert = require('node:assert/strict')
const path = require('node:path')
const { componentHarness } = require('../2026-11-17-repeat-batch19/component-harness.cjs')
const core = require('../../../src/utils/minesweeper.ts')
const root = path.resolve(__dirname, '../../..')
const entry = path.join(root, 'src/components/Minesweeper.tsx')
const BEST = 'toolhub-minesweeper-best', DAILY = 'toolhub-minesweeper-daily', PREFS = 'toolhub-minesweeper-prefs'
const clone = value => JSON.parse(JSON.stringify(value))
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
let groups = 0
async function check(name, run) { await run(); groups++; console.log('PASS', name) }

async function fixture(options = {}) {
  let now = 100000, nextTimer = 0
  const timers = new Map(), cleared = [], layouts = [], calls = { achievement: [], submit: [], names: [], qualifies: [], fetch: 0, win: 0, loss: 0, generate: 0, noGuess: 0 }
  const stored = new Map(Object.entries(options.storage ?? {})), writes = []
  const storagePort = { getItem: key => stored.get(key) ?? null, setItem(key, value) { writes.push([key, value]); stored.set(key, value) }, removeItem(key) { writes.push([key, null]); stored.delete(key) } }
  const make = (w, h, mines, first) => {
    const board = options.layout ? options.layout(w, h, mines, first) : core.generate(w, h, mines, first, core.mulberry32(42))
    layouts.push(clone(board)); return board
  }
  const leaderboard = { config: { formatScore: String }, savedPlayerName: '', checkQualifies(value) { calls.qualifies.push(value); return true },
    fetchLeaderboard() { calls.fetch++ }, async submitScore(...args) { calls.submit.push(args); await options.submit?.promise; return true }, savePlayerName(name) { calls.names.push(name) } }
  const h = await componentHarness(entry, {
    storagePort, url: 'https://toolhub.ai.kr/minesweeper/', window: { matchMedia: () => ({ matches: true }) },
    modules: {
      '@/utils/minesweeper': { ...core, generate(...args) { calls.generate++; return make(...args) }, generateNoGuess(...args) { calls.noGuess++; return { board: make(...args), ok: false } } },
      '@/hooks/useLeaderboard': { useLeaderboard: () => leaderboard },
      '@/hooks/useGameAchievements': { useGameAchievements: () => ({ achievements: [], newlyUnlocked: [], unlockedCount: 0, totalCount: 0, dismissNewAchievements() {}, recordGameResult(value) { calls.achievement.push(value); storagePort.setItem('game_achievements', JSON.stringify(calls.achievement)) } }) },
      '@/hooks/useGameSounds': { useGameSounds: () => ({ enabled: false, setEnabled() {}, playWin() { calls.win++ }, playLose() { calls.loss++ }, playMove() {}, playInvalid() {} }) },
      '@/components/LeaderboardPanel': { __esModule: true, default: 'LeaderboardPanel' }, '@/components/NameInputModal': { __esModule: true, default: 'NameInputModal' },
      '@/components/GameAchievements': { __esModule: true, default: 'GameAchievements', AchievementToast: 'AchievementToast' }, '@/components/GameConfetti': { __esModule: true, default: 'GameConfetti' },
    },
    globals: { Date: class extends Date { static now() { return now } },
      setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, delay }); return id },
      clearTimeout(id) { if (timers.has(id)) cleared.push(timers.get(id)); timers.delete(id) },
    },
  })
  h.render()
  const board = () => h.find(node => node.props?.role === 'grid')
  const get = attr => board().props[`data-minesweeper-${attr}`]
  const find = attr => h.find(node => Object.hasOwn(node.props ?? {}, `data-minesweeper-${attr}`))
  const event = (i, extra = {}) => ({ target: { closest: () => ({ dataset: { i: String(i) } }) }, detail: 0, preventDefault() {}, pointerId: 7, pointerType: 'mouse', clientX: 0, clientY: 0, ...extra })
  const click = i => { board().props.onClick(event(i)); h.render() }
  const button = attr => { find(attr).props.onClick(); h.render() }
  const clock = () => h.find(node => typeof node.type === 'function' && node.type.name === 'Clock').props
  const modal = () => h.find(node => node.type === 'NameInputModal').props
  const start = (first = 40) => { click(first); assert.ok(layouts.length); return layouts.at(-1) }
  const win = layout => { for (let i = 0; i < layout.mine.length; i++) if (!layout.mine[i]) { now += 25; click(i) }; assert.equal(get('status'), 'won') }
  const loss = layout => { now += 100; click(layout.mine.indexOf(true)); assert.equal(get('status'), 'lost') }
  const replay = () => { button('replay'); assert.equal(get('practice'), 'true') }
  const bytes = () => JSON.stringify([...stored].sort())
  return { h, calls, timers, cleared, layouts, stored, writes, board, get, find, event, click, button, clock, modal, start, win, loss, replay, bytes,
    time(value) { now = value }, advance(value) { now += value }, cleanup() { h.cleanup() } }
}

async function main() {
  await check('normal preset win retains one achievement/BEST/eligible submission and consumes duplicate modal callbacks', async () => {
    const f = await fixture(), layout = f.start(); f.win(layout)
    assert.equal(f.calls.achievement.length, 1); assert.equal(f.calls.achievement[0].result, 'win')
    assert.equal(f.calls.qualifies.length, 1); assert.equal(f.calls.fetch, 1); assert.ok(JSON.parse(f.stored.get(BEST)).beginner > 0)
    const modal = f.modal(); assert.equal(modal.isOpen, true)
    await modal.onSubmit('fixture'); await modal.onSubmit('duplicate'); f.h.render()
    assert.equal(f.calls.submit.length, 1); assert.deepEqual(f.calls.names, ['fixture']); assert.equal(f.modal().isOpen, false)
    assert.ok(f.h.all().some(node => node.type === 'ShareResult')); f.cleanup()
  })
  await check('practice win/loss/repeat preserve original layout, first/opening, bytes and all record ports', async () => {
    const f = await fixture(), original = f.start(); f.loss(original)
    const bytes = f.bytes(), writes = f.writes.length, records = f.calls.achievement.length
    f.replay(); const first = f.get('first'); assert.equal(first, 40); assert.equal(f.get('clicks'), 0)
    assert.equal(f.clock().start, 0); assert.equal(f.clock().end, 0); assert.equal(f.get('status'), 'ready')
    const opening = f.h.all().filter(node => node.props?.role === 'gridcell').map(node => node.props['aria-label'])
    f.click(first); assert.equal(f.clock().start, 0); assert.equal(f.get('clicks'), 0)
    f.time(200000); f.win(original); assert.ok(f.clock().start >= 200000); assert.equal(f.modal().isOpen, false)
    assert.ok(!f.h.all().some(node => node.type === 'ShareResult')); assert.ok(f.h.text().includes('replay.noRecord'))
    f.replay(); assert.deepEqual(f.h.all().filter(node => node.props?.role === 'gridcell').map(node => node.props['aria-label']), opening)
    f.loss(original); f.replay(); f.win(original)
    assert.equal(f.calls.generate, 1); assert.equal(f.calls.achievement.length, records); assert.equal(f.writes.length, writes); assert.equal(f.bytes(), bytes)
    assert.equal(f.calls.qualifies.length, 0); assert.equal(f.calls.fetch, 0); assert.equal(f.calls.submit.length, 0); assert.equal(f.calls.names.length, 0)
    assert.equal(f.calls.win, 2); assert.equal(f.calls.loss, 2); f.cleanup()
  })
  await check('old modal after replay cannot submit; in-flight normal submission cannot save a name after replay', async () => {
    const f = await fixture(), layout = f.start(); f.win(layout); const old = f.modal().onSubmit; f.replay(); await old('late'); assert.equal(f.calls.submit.length, 0); f.cleanup()
    const pending = deferred(), g = await fixture({ submit: pending }), other = g.start(); g.win(other)
    const task = g.modal().onSubmit('already-started'); assert.equal(g.calls.submit.length, 1); g.replay(); pending.resolve(); await task
    assert.equal(g.calls.names.length, 0); assert.equal(g.modal().isOpen, false); g.cleanup()
  })
  await check('first valid flag starts practice clock, ignored open does not, question marks reset', async () => {
    const prefs = JSON.stringify({ diff: 'beginner', custom: { w: 20, h: 12, mines: 40 }, qmarks: true })
    const f = await fixture({ storage: { [PREFS]: prefs } }), layout = f.start(); f.loss(layout); f.replay()
    f.click(40); assert.equal(f.clock().start, 0)
    const mine = layout.mine.indexOf(true), right = () => { f.board().props.onPointerDown(f.event(mine)); f.board().props.onContextMenu(f.event(mine)); f.h.render() }
    f.time(300000); right(); assert.equal(f.clock().start, 300000); assert.equal(f.get('clicks'), 1)
    right(); assert.ok(f.h.find(node => node.props?.['data-i'] === mine).props['aria-label'].includes('cell.question'))
    f.loss(layout); f.replay(); assert.equal(f.clock().start, 0); assert.equal(f.get('clicks'), 0)
    assert.ok(f.h.find(node => node.props?.['data-i'] === mine).props['aria-label'].includes('cell.closed')); f.cleanup()
  })
  await check('same mode/difficulty, new game, changed difficulty/custom and daily roundtrip leave practice', async () => {
    for (const escape of ['same-mode', 'same-difficulty', 'new-game', 'exit-practice', 'different-difficulty', 'custom', 'daily']) {
      const f = await fixture(), layout = f.start(); f.loss(layout); f.replay()
      if (escape === 'same-mode') f.h.find(node => node.props?.role === 'tab' && node.props['aria-selected']).props.onClick()
      else if (escape === 'same-difficulty' || escape === 'different-difficulty' || escape === 'custom') f.h.find(node => node.props?.['data-minesweeper-difficulty'] === (escape === 'same-difficulty' ? 'beginner' : escape === 'custom' ? 'custom' : 'intermediate')).props.onClick()
      else if (escape === 'daily') f.h.find(node => node.props?.role === 'tab' && !node.props['aria-selected']).props.onClick()
      else f.find(escape).props.onClick()
      f.h.render(); assert.equal(f.get('practice'), 'false', escape); assert.equal(f.get('status'), 'ready', escape)
      assert.ok(!f.h.all().some(node => Object.hasOwn(node.props ?? {}, 'data-minesweeper-replay')))
      if (escape === 'daily') {
        f.h.button('modeClassic').props.onClick(); f.h.render(); assert.equal(f.get('practice'), 'false'); assert.equal(f.get('first'), '')
      }
      f.cleanup()
    }
  })
  await check('automatic small first-opening win is 0ms/0clicks, repeatable, with custom apply exit', async () => {
    const prefs = JSON.stringify({ diff: 'custom', custom: { w: 5, h: 5, mines: 1 } })
    const f = await fixture({ storage: { [PREFS]: prefs }, layout(w, h) { const mine = new Array(w * h).fill(false); mine[0] = true; return core.withCounts(w, h, mine) } })
    f.start(24); assert.equal(f.get('status'), 'won'); const bytes = f.bytes(), records = f.calls.achievement.length
    for (let i = 0; i < 3; i++) { f.replay(); assert.equal(f.get('status'), 'won'); assert.equal(f.get('clicks'), 0); assert.equal(f.clock().start, 0); assert.equal(f.clock().end, 0); assert.ok(f.h.text().includes('replay.automaticWin')) }
    assert.equal(f.calls.generate, 1); assert.equal(f.calls.achievement.length, records); assert.equal(f.bytes(), bytes); assert.equal(f.modal().isOpen, false)
    f.h.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); f.h.render(); assert.equal(f.get('practice'), 'false'); assert.equal(f.get('status'), 'ready'); f.cleanup()
  })
  await check('no-guess fallback metadata survives replay without another generator call', async () => {
    const prefs = JSON.stringify({ diff: 'beginner', custom: { w: 20, h: 12, mines: 40 }, noGuess: true })
    const f = await fixture({ storage: { [PREFS]: prefs } }), layout = f.start(); f.loss(layout); f.replay()
    assert.equal(f.calls.noGuess, 1); assert.equal(f.calls.generate, 0); assert.ok(f.h.text().includes('noGuessFailed')); f.cleanup()
  })
  await check('old touch timer, pointer/mouse/context/key callbacks cannot mutate a replaced board; current touch/key still work', async () => {
    const f = await fixture(), layout = f.start(); const closed = layout.mine.indexOf(true), old = f.board().props
    old.onPointerDown(f.event(closed, { pointerType: 'touch' })); const timer = [...f.timers.values()].find(value => value.delay === 350)
    f.loss(layout); f.replay(); const generation = f.get('generation')
    timer.callback(); old.onClick(f.event(closed)); old.onContextMenu(f.event(closed)); old.onMouseDown(f.event(closed, { buttons: 3, button: 1 })); old.onKeyDown({ key: 'f', keyCode: 70, nativeEvent: {}, preventDefault() {} }); old.onPointerUp(f.event(closed)); f.h.render()
    assert.equal(f.get('clicks'), 0); assert.equal(f.clock().start, 0); assert.equal(f.get('generation'), generation)
    const current = f.board().props; current.onPointerDown(f.event(closed, { pointerType: 'touch', pointerId: 9 })); f.h.render()
    const valid = [...f.timers.values()].find(value => value.delay === 350); valid.callback(); f.h.render(); assert.equal(f.get('clicks'), 1)
    f.board().props.onClick(f.event(closed, { detail: 1 })); f.h.render(); assert.equal(f.get('clicks'), 1)
    f.board().props.onKeyDown({ key: 'f', keyCode: 70, nativeEvent: {}, preventDefault() {} }); f.h.render(); assert.equal(f.get('clicks'), 2)
    f.cleanup(); valid.callback(); assert.equal(f.calls.submit.length, 0)
  })
  await check('pointer cancel/move cancels queued long press; normal mouse right click and IME exclusion remain', async () => {
    const f = await fixture(), layout = f.start(); const mine = layout.mine.indexOf(true)
    for (const cancel of ['cancel', 'move']) {
      f.board().props.onPointerDown(f.event(mine, { pointerType: 'touch' })); const timer = [...f.timers.values()].find(value => value.delay === 350)
      if (cancel === 'cancel') f.board().props.onPointerCancel(f.event(mine, { pointerType: 'touch' }))
      else f.board().props.onPointerMove(f.event(mine, { pointerType: 'touch', clientX: 15 }))
      timer.callback(); f.h.render(); assert.equal(f.get('clicks'), 1)
    }
    f.board().props.onPointerDown(f.event(mine)); f.board().props.onContextMenu(f.event(mine)); f.h.render(); assert.equal(f.get('clicks'), 2)
    f.board().props.onKeyDown({ key: 'f', keyCode: 229, nativeEvent: { isComposing: true }, preventDefault() {} }); f.h.render(); assert.equal(f.get('clicks'), 2); f.cleanup()
  })
  await check('daily completion still records once and exposes no classic practice action', async () => {
    const f = await fixture(); f.h.find(node => node.props?.role === 'tab' && !node.props['aria-selected']).props.onClick(); f.h.render()
    const board = core.dailyBoard(core.dayNumber(100000)).board; f.loss(board)
    assert.equal(f.calls.achievement.length, 1); assert.equal(f.calls.achievement[0].difficulty, 'daily'); assert.ok(f.stored.has(DAILY))
    assert.equal(f.calls.qualifies.length, 0); assert.equal(f.modal().isOpen, false); assert.ok(!f.h.all().some(node => Object.hasOwn(node.props ?? {}, 'data-minesweeper-replay'))); f.cleanup()
  })
  await check('actual Clock starts at zero, advances on timer, stops at end and resets for the next ready round', async () => {
    let now = 500000
    const modules = Object.fromEntries(['@/hooks/useLeaderboard', '@/hooks/useGameAchievements', '@/hooks/useGameSounds', '@/components/LeaderboardPanel', '@/components/NameInputModal', '@/components/GameAchievements', '@/components/GameConfetti'].map(name => [name, {}]))
    const h = await componentHarness(entry, { namedExport: 'Clock', modules, props: { start: 0, end: 0, running: false }, globals: { Date: class extends Date { static now() { return now } } } })
    h.render(); assert.equal(h.text(), core.fmtTime(0))
    h.setProps({ start: now, end: 0, running: true }); assert.equal(h.text(), core.fmtTime(0))
    now += 2500; h.tick(47); assert.equal(h.text(), core.fmtTime(2500))
    h.setProps({ start: 500000, end: 501300, running: false }); assert.equal(h.text(), core.fmtTime(1300))
    now += 10000; h.tick(47); assert.equal(h.text(), core.fmtTime(1300))
    h.setProps({ start: 0, end: 0, running: false }); assert.equal(h.text(), core.fmtTime(0)); h.cleanup()
  })
  console.log(`Minesweeper actual parent: ${groups} groups PASS (all leaderboard calls mocked)`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
