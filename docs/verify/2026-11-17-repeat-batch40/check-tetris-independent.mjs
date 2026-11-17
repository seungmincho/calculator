import assert from 'node:assert/strict'
import { tetrisFixture, element } from './tetris-parent-harness.mjs'

// Author's host supplies controlled I/O only. Expectations and input traces below are independent.
const groups = [], test = (name, run) => groups.push({ name, run })
const moves = f => f.calls.filter(call => call.name === 'move')

test('retargeted/ancestor controls and prevented composition events keep native key ownership', async () => {
  const f = await tetrisFixture(); f.start(); const baseline = f.calls.length
  const targets = [element('path', {}, element('svg', {}, element('A', { href: '#x' }))), element('SPAN', {}, element('DIV', { role: 'presentation menuitem' })), element('DIV', { contenteditable: 'false' }, element('SECTION', { contenteditable: 'plaintext-only' })), element('svg', {}, element('SUMMARY'))]
  for (const target of targets) for (const code of ['ArrowLeft', 'Space', 'Escape', 'Enter']) assert.equal(f.key('keydown', code, { target }).defaultPrevented, false)
  for (const code of ['Space', 'ArrowRight']) {
    assert.equal(f.key('keydown', code, { composedPath: () => [element('SPAN'), element('BUTTON')] }).defaultPrevented, false)
    assert.equal(f.key('keydown', code, { isComposing: true }).defaultPrevented, false)
    assert.equal(f.key('keydown', code, { defaultPrevented: true }).defaultPrevented, true)
  }
  assert.equal(f.calls.length, baseline)
  f.game().over = true; f.advance(1); const game = f.game(); f.key('keydown', 'Enter', { target: element('SPAN', {}, element('A', { href: '#' })) }); assert.equal(f.game(), game)
  f.cleanup()
})

test('hardware pointer click is suppressed but a following explicit assistive click remains a single pulse', async () => {
  const f = await tetrisFixture(); f.start()
  f.pointer('cw', 'onPointerDown', 32); f.pointer('cw', 'onPointerUp', 32, { timeStamp: 10 }); assert.equal(f.count('rotate'), 1)
  f.click('cw', { timeStamp: 11, detail: 1, nativeEvent: { pointerId: 32, pointerType: 'mouse' } }); assert.equal(f.count('rotate'), 1)
  f.click('cw', { timeStamp: 12, detail: 2, nativeEvent: { pointerId: -1, pointerType: '' } }); assert.equal(f.count('rotate'), 2)
  f.padKey('ccw', 'onKeyDown', 'Space'); f.pad('ccw').props.onBlur(); assert.equal(f.padKey('ccw', 'onKeyUp', 'Space').defaultPrevented, true)
  f.padKey('ccw', 'onKeyDown', 'Space'); f.padKey('ccw', 'onKeyUp', 'Space'); f.click('ccw'); assert.equal(f.count('rotate'), 3)
  f.padKey('cw', 'onKeyDown', 'Enter'); f.click('cw'); f.click('cw'); f.padKey('cw', 'onKeyUp', 'Enter'); assert.equal(f.count('rotate'), 4)
  f.click('left'); const before = f.count('move'); for (let i = 0; i < 4; i++) f.advance(100); assert.equal(f.count('move'), before); f.cleanup()
})

test('independent held-owner trace keeps the newest remaining direction through mixed releases', async () => {
  const f = await tetrisFixture(); f.start(); const owners = new Map(); let random = 0x234321, time = 0
  const next = () => { random = (random * 1664525 + 1013904223) >>> 0; return random }
  for (let index = 0; index < 64; index++) {
    const source = next() % 8, pressing = (next() % 3) !== 0, direction = next() % 2 ? 1 : -1
    const key = source < 2 ? 'key:' + source : 'pointer:' + source, name = direction === -1 ? 'left' : 'right', previous = owners.get(key), before = f.count('move')
    time += 200; f.now(time)
    if (source < 2) {
      const code = source === 0 ? 'ArrowLeft' : 'ArrowRight', actual = source === 0 ? -1 : 1
      f.key(pressing ? 'keydown' : 'keyup', code, pressing ? {} : { target: element('TEXTAREA') })
      if (pressing && !previous) owners.set(key, { direction: actual, name: actual === -1 ? 'left' : 'right' }); else if (!pressing) owners.delete(key)
    } else if (pressing) {
      f.pointer(name, 'onPointerDown', source); if (!previous) owners.set(key, { direction, name })
    } else {
      f.pointer(previous?.name ?? name, 'onPointerUp', source); owners.delete(key)
    }
    assert.equal(f.count('move') - before, pressing && !previous ? 1 : 0, `immediate ${index}`)
    const start = f.count('move'); f.advance(100); f.advance(100)
    const expected = [...owners.values()].at(-1)?.direction
    const repeated = moves(f).slice(start)
    if (expected === undefined) assert.equal(repeated.length, 0, `released ${index}`)
    else { assert.ok(repeated.length > 0, `held ${index}`); assert.ok(repeated.every(call => call.args[1] === expected), `direction ${index}`) }
    assert.equal(f.status(), 'playing')
  }
  f.h.window.dispatch('blur'); f.h.render(); f.button('data-tetris-resume'); const count = f.count('move'); f.advance(100); f.advance(100); assert.equal(f.count('move'), count); f.cleanup()
})

test('foreign board pointer and same-id callbacks from old view cannot release or activate the current gesture', async () => {
  const f = await tetrisFixture(); f.start(); const oldBoard = f.board(), oldPad = f.pad('cw').props
  f.gesture('onPointerDown', 7); f.pointer('cw', 'onPointerDown', 8); f.button('data-tetris-pause'); f.button('data-tetris-resume')
  f.gesture('onPointerDown', 7); const count = f.count('rotate')
  f.gesture('onPointerMove', 9, { clientX: 1000, clientY: 1000, timeStamp: 20 }); f.gesture('onPointerCancel', 9); f.gesture('onPointerUp', 7, { timeStamp: 20 }, oldBoard)
  assert.equal(f.count('rotate'), count); assert.equal(f.captured.has(7), true)
  f.click('cw', { detail: 1, nativeEvent: { pointerId: 8, pointerType: 'touch' } }, oldPad); assert.equal(f.count('rotate'), count)
  f.gesture('onPointerUp', 7, { timeStamp: 30 }); assert.equal(f.count('rotate'), count + 1)
  f.pointer('left', 'onPointerDown', 12); f.pointer('left', 'onPointerDown', 13); f.pointer('left', 'onLostPointerCapture', 12); const start = f.count('move'); f.advance(100); f.advance(100); assert.ok(f.count('move') > start)
  const previousLeft = f.pad('left').props; f.start(); const newGame = f.game(); f.pointer('left', 'onPointerDown', 13)
  f.pointer('left', 'onPointerUp', 13, { timeStamp: 1000 }, previousLeft); f.advance(100); f.advance(100); assert.ok(f.calls.filter(call => call.game === newGame && call.name === 'move').length >= 2)
  f.pointer('left', 'onPointerUp', 13, { timeStamp: 1100 }); const stopped = f.count('move'); f.advance(100); f.advance(100); assert.equal(f.count('move'), stopped); f.cleanup()
})

test('gesture invalidation is recoverable and finite coordinate plans remain bounded at parent engine boundary', async () => {
  const f = await tetrisFixture(); f.start()
  for (const width of [0, -1, Infinity, NaN]) { f.io.width = width; f.gesture('onPointerDown', 21); f.gesture('onPointerUp', 21, { timeStamp: 20 }) }
  assert.equal(f.count('rotate'), 0); f.io.width = 320; f.gesture('onPointerDown', 22)
  f.gesture('onPointerMove', 22, { clientX: Infinity, timeStamp: 30 }); assert.equal(f.captured.has(22), false); f.gesture('onPointerUp', 22, { timeStamp: 40 }); assert.equal(f.count('rotate'), 0)
  f.io.width = .0001; f.gesture('onPointerDown', 23); f.gesture('onPointerMove', 23, { clientX: -1e30, clientY: 1e30, timeStamp: 100 })
  assert.equal(f.count('move'), 10); assert.equal(f.count('softDropOne'), 22); f.gesture('onPointerCancel', 23)
  f.io.width = 320; f.gesture('onPointerDown', 24, { timeStamp: 200 }); f.gesture('onPointerUp', 24, { timeStamp: 201 }); assert.equal(f.count('rotate'), 1); f.cleanup()
})

test('Strict replay while playing, restart and duplicate RAF cannot mutate a retired Game', async () => {
  const f = await tetrisFixture(); f.h.replayEffects(); f.start(); const game = f.game(), beforeReplay = f.frames.at(-1)
  f.key('keydown', 'ArrowLeft'); f.h.replayEffects(); f.h.render(); const before = f.calls.length; beforeReplay.callback(100); f.h.render(); assert.equal(f.calls.length, before)
  f.advance(16); assert.equal(f.calls.filter(call => call.name === 'step').at(-1).game, game)
  const next = f.frames.at(-1); f.start(); const current = f.game(); assert.notEqual(current, game); const count = f.calls.length
  next.callback(200); f.h.render(); assert.equal(f.calls.length, count); const frame = f.advance(16); frame.callback(17); f.h.render()
  assert.equal(f.calls.filter(call => call.name === 'step' && call.game === current).length, 1)
  assert.equal(f.frames.filter(item => !item.canceled && !item.fired).length, 1)
  const props = f.pad('hard').props, oldFrames = [...f.frames], beforeCleanup = f.calls.length; f.cleanup()
  f.click('hard', { timeStamp: 1000 }, props); for (const old of oldFrames) old.callback(1001); for (const timer of f.timers) timer.callback(); assert.equal(f.calls.length, beforeCleanup)
})

test('same-game popup supersession and restart preserve only the newest popup identity', async () => {
  const f = await tetrisFixture(); f.start()
  const popup = pts => { f.game().lastClear = { lines: 2, tspin: 'none', combo: 1, b2b: false, points: pts }; f.advance(1); return f.attr('data-tetris-popup', f.h.all().find(node => Object.hasOwn(node.props, 'data-tetris-popup')).props['data-tetris-popup']) }
  popup(100); const first = f.timers.at(-1); const second = popup(200).props['data-tetris-popup']; first.callback(); f.h.render(); assert.equal(f.h.all().find(node => Object.hasOwn(node.props, 'data-tetris-popup')).props['data-tetris-popup'], second)
  const obsolete = f.timers.at(-1); f.start(); const third = popup(300).props['data-tetris-popup']; obsolete.callback(); f.h.render(); assert.equal(f.h.all().find(node => Object.hasOwn(node.props, 'data-tetris-popup')).props['data-tetris-popup'], third)
  f.h.document.hidden = true; f.h.document.dispatch('visibilitychange'); f.h.render(); assert.equal(f.status(), 'paused'); assert.equal(f.h.all().some(node => Object.hasOwn(node.props, 'data-tetris-popup')), false); f.cleanup()
})

test('normal completion writes existing keys once and submits only explicit controlled name payload', async () => {
  const f = await tetrisFixture({ storage: { 'tetris-best-score': '4000', 'tetris-stats': JSON.stringify({ games: 9, totalLines: 30, bestLines: 15 }), 'tetris-handling': JSON.stringify({ das: 100, arr: 0 }) } }); f.io.qualifies = true; f.start()
  f.game().score = 2000; f.game().lines = 10; f.game().over = true; f.advance(100); assert.equal(f.status(), 'over'); assert.equal(f.records.length, 1)
  assert.equal(f.h.stored.get('tetris-best-score'), '4000'); assert.deepEqual(JSON.parse(f.h.stored.get('tetris-stats')), { games: 10, totalLines: 40, bestLines: 15 }); assert.equal(f.h.stored.get('tetris-handling'), '{"das":100,"arr":0}')
  for (const frame of f.frames) frame.callback(999); f.h.render(); assert.equal(f.records.length, 1); assert.equal(f.submissions.length, 0)
  const modal = f.h.find(node => node.type === 'NameInputModal'); assert.equal(modal.props.isOpen, true); await modal.props.onSubmit('independent-fixture'); f.h.render(); assert.equal(f.submissions.length, 1); assert.equal(f.submissions[0][0], 2000); assert.equal(f.submissions[0][1], 'independent-fixture')
  const share = f.h.find(node => node.type === 'ShareResult'); assert.equal(share.props.card.headline, '2,000'); assert.equal(f.savedNames[0], 'independent-fixture'); f.cleanup()
})

let passed = 0
for (const { name, run } of groups) { if (process.argv[2] && !name.includes(process.argv[2])) continue; await run(); passed++; console.log('PASS', name) }
console.log(`Tetris independent actual parent: ${passed} groups passed`)
