import assert from 'node:assert/strict'
import { tetrisFixture, element } from './tetris-parent-harness.mjs'

let groups = 0
async function check(name, run) { await run(); groups++; console.log('PASS', name) }
await check('Strict effect replay starts one usable loop; each reservation executes at most once', async () => {
  const f = await tetrisFixture(); f.h.replayEffects(); f.h.replayEffects(); assert.equal(f.status(), 'idle'); f.start()
  assert.equal(f.status(), 'playing'); assert.equal(f.frames.filter(frame => !frame.canceled && !frame.fired).length, 1)
  const frame = f.advance(16); assert.equal(f.count('step'), 1); frame.callback(17); f.h.render(); assert.equal(f.count('step'), 1)
  assert.equal(f.key('keydown', 'ArrowLeft').defaultPrevented, true); assert.equal(f.count('move'), 1)
  f.cleanup(); const calls = f.calls.length; for (const old of f.frames) old.callback(500); assert.equal(f.calls.length, calls)
})
await check('interactive native controls, SVG ancestors, IME and browser chords do not steal game keys', async () => {
  const f = await tetrisFixture(); f.start()
  for (const target of [element('BUTTON'), element('A', { href: '/' }), element('SUMMARY'), element('INPUT'), element('TEXTAREA'), element('SELECT'), element('DIV', { contenteditable: 'true' }), element('path', {}, element('BUTTON')), element('DIV', { role: 'slider' })]) {
    for (const code of ['Space', 'Enter', 'KeyP', 'ArrowLeft']) assert.equal(f.key('keydown', code, { target }).defaultPrevented, false)
  }
  for (const flags of [{ isComposing: true }, { keyCode: 229 }, { metaKey: true }, { altKey: true }, { ctrlKey: true }]) assert.equal(f.key('keydown', 'Space', flags).defaultPrevented, false)
  assert.equal(f.count('hardDrop'), 0); assert.equal(f.count('move'), 0); assert.equal(f.status(), 'playing')
  f.key('keydown', 'ControlLeft', { ctrlKey: true }); assert.equal(f.count('rotate'), 1)
  f.key('keydown', 'KeyX', { shiftKey: true }); assert.equal(f.count('rotate'), 2)
  f.game().over = true; f.advance(16); const games = f.games.length
  assert.equal(f.key('keydown', 'Enter', { target: element('A', { href: '/' }) }).defaultPrevented, false); assert.equal(f.games.length, games)
  f.cleanup()
})
await check('native pad Space/Enter and assistive clicks pulse once; repeated key activation stays suppressed', async () => {
  const f = await tetrisFixture(); f.start()
  assert.equal(f.padKey('cw', 'onKeyDown', 'Space').defaultPrevented, false)
  assert.equal(f.padKey('cw', 'onKeyDown', 'Space', { repeat: true }).defaultPrevented, true)
  f.padKey('cw', 'onKeyUp', 'Space'); f.click('cw'); assert.equal(f.count('rotate'), 1)
  f.padKey('ccw', 'onKeyDown', 'Enter'); f.click('ccw'); f.click('ccw'); assert.equal(f.count('rotate'), 2)
  assert.equal(f.padKey('ccw', 'onKeyDown', 'Enter', { repeat: true }).defaultPrevented, true)
  f.padKey('ccw', 'onKeyUp', 'Enter'); f.click('cw', { detail: 2 }); assert.equal(f.count('rotate'), 3)
  f.click('left'); const moves = f.count('move'); f.advance(100); f.advance(100); f.advance(100); assert.equal(f.count('move'), moves)
  assert.equal(f.padKey('hard', 'onKeyDown', 'Enter', { nativeEvent: { isComposing: true } }).defaultPrevented, true)
  f.cleanup()
})
await check('pointer press/up/lost capture consumes click exactly once and capture failure never leaves a hold', async () => {
  const f = await tetrisFixture(); f.start(); f.pointer('cw', 'onPointerDown', 11); f.pointer('cw', 'onPointerUp', 11); f.pointer('cw', 'onLostPointerCapture', 11)
  f.click('cw', { detail: 1, nativeEvent: { pointerId: 11, pointerType: 'touch' } }); assert.equal(f.count('rotate'), 1)
  f.io.failCapture = true; f.pointer('right', 'onPointerDown', 12); assert.equal(f.count('move'), 1)
  f.advance(100); f.advance(100); f.advance(100); assert.equal(f.count('move'), 1)
  f.click('right', { detail: 1, nativeEvent: { pointerId: 12, pointerType: 'mouse' } }); assert.equal(f.count('move'), 1)
  f.io.failCapture = false; f.pointer('right', 'onPointerDown', 13); assert.equal(f.count('move'), 2); f.pointer('right', 'onPointerCancel', 13); f.cleanup()
})
await check('keyboard plus multiple fingers maintain the latest remaining direction and normal DAS/ARR', async () => {
  const f = await tetrisFixture(); f.start(); f.key('keydown', 'ArrowLeft'); f.pointer('left', 'onPointerDown', 1); f.pointer('right', 'onPointerDown', 2)
  assert.equal(f.count('move'), 3); f.pointer('right', 'onPointerUp', 2); f.advance(100); assert.equal(f.count('move'), 3); f.advance(70); assert.equal(f.count('move'), 4)
  assert.equal(f.calls.filter(call => call.name === 'move').at(-1).args[1], -1)
  f.pointer('left', 'onPointerUp', 1); f.advance(50); assert.equal(f.count('move'), 5)
  f.key('keyup', 'ArrowLeft', { target: element('INPUT') }); f.advance(100); assert.equal(f.count('move'), 5)
  f.key('keydown', 'ArrowDown'); f.pointer('down', 'onPointerDown', 3); f.pointer('down', 'onPointerUp', 3); f.advance(16)
  assert.equal(f.calls.filter(call => call.name === 'step').at(-1).args[2], true); f.key('keyup', 'ArrowDown'); f.advance(16); assert.equal(f.calls.filter(call => call.name === 'step').at(-1).args[2], false)
  f.cleanup()
})
await check('board has a single pointer, bounded movement, invalid width protection and capture failure recovery', async () => {
  const f = await tetrisFixture(); f.start(); f.gesture('onPointerDown', 1); f.gesture('onPointerDown', 2); f.gesture('onPointerUp', 2, { timeStamp: 50 }); assert.equal(f.count('rotate'), 0)
  f.gesture('onPointerUp', 1, { timeStamp: 100 }); assert.equal(f.count('rotate'), 1)
  f.io.width = 0; f.gesture('onPointerDown', 3); f.gesture('onPointerUp', 3, { timeStamp: 10 }); assert.equal(f.count('rotate'), 1)
  f.io.width = .001; f.gesture('onPointerDown', 4); const moveBefore = f.count('move'), softBefore = f.count('softDropOne')
  f.gesture('onPointerMove', 4, { clientX: 1e100, clientY: 1e100, timeStamp: 10 }); assert.equal(f.count('move') - moveBefore, 10); assert.equal(f.count('softDropOne') - softBefore, 22)
  f.gesture('onPointerCancel', 4, { timeStamp: 20 }); f.io.width = 320; f.io.failCapture = true; f.gesture('onPointerDown', 5); f.gesture('onPointerUp', 5, { timeStamp: 30 }); assert.equal(f.count('rotate'), 1)
  f.io.failCapture = false; f.gesture('onPointerDown', 6); f.gesture('onLostPointerCapture', 6); f.gesture('onPointerUp', 6, { timeStamp: 50 }); assert.equal(f.count('rotate'), 1)
  f.gesture('onPointerDown', 7); f.gesture('onPointerUp', 7, { timeStamp: 100 }); assert.equal(f.count('rotate'), 2); f.cleanup()
})
await check('pause/resume and new game invalidate old pointer callbacks, keyboard Space and current captures', async () => {
  const f = await tetrisFixture(); f.start(); const oldBoard = f.board(), oldPad = f.pad('hard').props
  f.gesture('onPointerDown', 1); f.pointer('hard', 'onPointerDown', 2); f.padKey('cw', 'onKeyDown', 'Space')
  f.button('data-tetris-pause'); assert.equal(f.captured.size, 0); f.button('data-tetris-resume')
  f.gesture('onPointerDown', 3); const rotates = f.count('rotate'), drops = f.count('hardDrop')
  f.gesture('onPointerUp', 1, { timeStamp: 10 }, oldBoard); f.click('hard', { nativeEvent: { pointerId: 2, pointerType: 'touch' } }, oldPad)
  assert.equal(f.padKey('cw', 'onKeyUp', 'Space').defaultPrevented, true); assert.equal(f.count('rotate'), rotates); assert.equal(f.count('hardDrop'), drops)
  f.gesture('onPointerUp', 3, { timeStamp: 50 }); assert.equal(f.count('rotate'), rotates + 1)
  f.pointer('left', 'onPointerDown', 4); const releasedBefore = f.released.length; f.start(); assert.ok(f.released.length > releasedBefore); f.advance(100); f.advance(100)
  assert.equal(f.calls.filter(call => call.game === f.game() && call.name === 'move').length, 0); f.cleanup()
})
await check('playing to playing restart owns a new RAF; negative/nonfinite timestamps do not change elapsed play', async () => {
  const f = await tetrisFixture(); f.start(); const previous = f.frames.at(-1), previousGame = f.game(); f.start(); const currentGame = f.game(); assert.notEqual(currentGame, previousGame)
  const before = f.calls.length; previous.callback(100); f.h.render(); assert.equal(f.calls.length, before)
  f.advance(16); let active = f.frames.at(-1); active.fired = true; active.callback(-100); f.h.render(); assert.equal(f.calls.filter(call => call.name === 'step').at(-1).args[1], 0)
  active = f.frames.at(-1); active.fired = true; active.callback(Infinity); f.h.render(); assert.equal(f.calls.filter(call => call.name === 'step').at(-1).args[1], 0)
  f.advance(16); assert.equal(f.calls.filter(call => call.name === 'step').at(-1).args[1], 16); assert.ok(f.calls.filter(call => call.name === 'step').every(call => call.game === currentGame)); f.cleanup()
})
await check('old popup timeout cannot erase a later popup across new games or pause', async () => {
  const f = await tetrisFixture(); f.start()
  const clear = () => { f.game().lastClear = { lines: 1, tspin: 'none', b2b: false, combo: 0, points: 100 }; f.advance(16) }
  clear(); const old = f.timers.filter(timer => timer.delay === 1200).at(-1); f.start(); clear(); const latest = f.h.all().find(node => Object.hasOwn(node.props, 'data-tetris-popup'))
  // Tokens are monotonic, but the exact number is not a public contract.
  const id = latest.props['data-tetris-popup']; old.callback(); f.h.render(); assert.equal(f.h.all().find(node => Object.hasOwn(node.props, 'data-tetris-popup')).props['data-tetris-popup'], id)
  f.button('data-tetris-pause'); assert.equal(f.h.all().some(node => Object.hasOwn(node.props, 'data-tetris-popup')), false); f.cleanup()
})
await check('game over preserves local best/stats and one achievement; name submission uses only the controlled port', async () => {
  const f = await tetrisFixture({ storage: { 'tetris-best-score': '7', 'tetris-stats': JSON.stringify({ games: 2, totalLines: 9, bestLines: 8 }) } }); f.io.qualifies = true; f.start()
  f.game().score = 1234; f.game().lines = 12; f.game().over = true; f.game().events = ['gameover']; const pending = f.frames.at(-1); f.advance(16)
  assert.equal(f.status(), 'over'); assert.equal(f.h.stored.get('tetris-best-score'), '1234'); assert.deepEqual(JSON.parse(f.h.stored.get('tetris-stats')), { games: 3, totalLines: 21, bestLines: 12 }); assert.equal(f.records.length, 1)
  pending.callback(100); f.h.render(); assert.equal(f.records.length, 1); assert.equal(f.frames.filter(frame => !frame.canceled && !frame.fired).length, 0)
  const modal = f.h.find(node => node.type === 'NameInputModal'); assert.equal(modal.props.isOpen, true); assert.equal(f.submissions.length, 0); await modal.props.onSubmit('fixture'); f.h.render(); assert.equal(f.submissions.length, 1); assert.equal(f.submissions[0][0], 1234); assert.deepEqual(f.savedNames, ['fixture'])
  assert.equal(f.h.find(node => node.type === 'ShareResult').props.card.headline, '1,234'); f.cleanup()
})
await check('blur/hidden release held controls; localized controls preserve handling values and 44px targets', async () => {
  for (const locale of ['ko', 'en']) {
    const f = await tetrisFixture({ locale }); f.start(); f.key('keydown', 'ArrowLeft'); f.h.window.dispatch('blur'); f.h.render(); assert.equal(f.status(), 'paused'); f.button('data-tetris-resume'); f.advance(100); f.advance(100); assert.equal(f.count('move'), 1)
    f.h.document.hidden = true; f.h.document.dispatch('visibilitychange'); f.h.render(); assert.equal(f.status(), 'paused')
    f.attr('data-tetris-handling', 'arr').props.onChange({ target: { value: '0' } }); f.h.render(); assert.deepEqual(JSON.parse(f.h.stored.get('tetris-handling')), { das: 170, arr: 0 })
    for (const node of f.h.all().filter(node => Object.hasOwn(node.props, 'data-tetris-pad'))) { assert.ok(node.props.className.includes('h-14')); assert.ok(node.props.className.includes('focus-visible')); assert.ok(node.props['aria-label']); assert.equal(node.props.disabled, true) }
    f.cleanup()
  }
})
console.log(`Tetris actual parent: ${groups} groups passed`)
