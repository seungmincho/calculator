// node scripts/check-tetris-input.ts
import assert from 'node:assert/strict'
import {
  createTetrisActivationGate, createTetrisInputOwners, isTetrisInteractiveTarget, tetrisKeyIntent,
  TETRIS_KEY_ACTIONS, type TetrisInputSource, type TetrisInputAction,
} from '../src/utils/tetrisInput.ts'

let groups = 0
const check = (name: string, run: () => void) => { run(); groups++; console.log(`PASS ${name}`) }
const key = (code: string): TetrisInputSource => ({ kind: 'key', code })
const pointer = (pointerId: number, target: string): TetrisInputSource => ({ kind: 'pointer', pointerId, target })
const element = (tagName: string, attributes: Record<string, string> = {}, parentElement?: unknown) => ({ tagName, parentElement, getAttribute: (name: string) => attributes[name] ?? null })
const nativeClick = (epoch: number, target: string, at = 100) => ({ epoch, target, at, pointerId: -1, pointerType: '', detail: 0 })

check('interactive ancestors, SVG closest and shadow paths are protected without DOM globals', () => {
  for (const tag of ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'SUMMARY']) assert.equal(isTetrisInteractiveTarget(element('path', {}, element(tag))), true)
  assert.equal(isTetrisInteractiveTarget(element('span', {}, element('a', { href: '' }))), true)
  assert.equal(isTetrisInteractiveTarget(element('a')), false)
  for (const role of ['button', 'slider', 'tab', 'menuitemcheckbox', 'gridcell', 'textbox']) assert.equal(isTetrisInteractiveTarget(element('svg', {}, element('div', { role }))), true)
  assert.equal(isTetrisInteractiveTarget({ tagName: 'path', closest: () => element('button') }), true)
  assert.equal(isTetrisInteractiveTarget(element('custom-host'), [element('button')]), true)
  assert.equal(isTetrisInteractiveTarget(element('canvas', { tabindex: '0', role: 'application' })), false)
  assert.equal(isTetrisInteractiveTarget(element('div', { contenteditable: 'plaintext-only' })), true)
  assert.equal(isTetrisInteractiveTarget({ isContentEditable: true }), true)
  assert.equal(isTetrisInteractiveTarget({ closest() { throw new Error('unsupported selector') }, parentElement: element('button') }), true)
  const circular: { parentElement?: unknown } = {}; circular.parentElement = circular
  assert.equal(isTetrisInteractiveTarget(circular), false)
})

check('baseline button Space/link Enter, IME and canceled keys yield no game intent', () => {
  assert.equal(tetrisKeyIntent({ code: 'Space', target: element('button') }, 'playing'), null)
  assert.equal(tetrisKeyIntent({ code: 'Enter', target: element('a', { href: '/next' }) }, 'over'), null)
  for (const extra of [{ defaultPrevented: true }, { isComposing: true }, { keyCode: 229 }]) assert.equal(tetrisKeyIntent({ code: 'Space', ...extra }, 'playing'), null)
  assert.equal(tetrisKeyIntent({ code: 'Enter' }, 'over', true), null)
  assert.equal(tetrisKeyIntent({ code: 'ArrowLeft', composedPath: () => [element('input')] }, 'playing'), null)
  assert.equal(tetrisKeyIntent({ code: 'Space' }, 'paused'), null)
  assert.equal(tetrisKeyIntent({ code: 'KeyQ' }, 'playing'), null)
})

check('existing key map and background control meanings remain intact; repeat owns no new action', () => {
  const expected = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'cw', KeyX: 'cw', KeyZ: 'ccw', ControlLeft: 'ccw', ControlRight: 'ccw', Space: 'hard', KeyC: 'hold', ShiftLeft: 'hold', ShiftRight: 'hold' }
  assert.deepEqual(TETRIS_KEY_ACTIONS, expected)
  for (const [code, action] of Object.entries(expected)) {
    assert.deepEqual(tetrisKeyIntent({ code }, 'playing'), { kind: 'action', action, source: key(code) })
    assert.deepEqual(tetrisKeyIntent({ code, repeat: true }, 'playing'), { kind: 'repeat' })
  }
  assert.deepEqual(tetrisKeyIntent({ code: 'Escape' }, 'playing'), { kind: 'pause' })
  assert.deepEqual(tetrisKeyIntent({ code: 'KeyP' }, 'paused'), { kind: 'resume' })
  assert.deepEqual(tetrisKeyIntent({ code: 'Enter' }, 'idle'), { kind: 'start' })
  assert.deepEqual(tetrisKeyIntent({ code: 'NumpadEnter', repeat: true }, 'over'), { kind: 'repeat' })
})

check('browser modifier shortcuts pass through while standalone Control and Shift bindings remain', () => {
  for (const code of ['KeyP', 'KeyC', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'ControlLeft', 'ControlRight']) {
    for (const modifiers of [{ metaKey: true }, { altKey: true }]) {
      for (const status of ['playing', 'paused', 'over'] as const) assert.equal(tetrisKeyIntent({ code, ...modifiers }, status), null)
    }
  }
  for (const code of ['KeyP', 'KeyC', 'ArrowLeft', 'Space', 'Enter']) assert.equal(tetrisKeyIntent({ code, ctrlKey: true }, 'playing'), null)
  for (const code of ['ControlLeft', 'ControlRight']) assert.deepEqual(tetrisKeyIntent({ code, ctrlKey: true }, 'playing'), { kind: 'action', action: 'ccw', source: key(code) })
  for (const code of ['ShiftLeft', 'ShiftRight', 'KeyC', 'KeyX']) assert.deepEqual(tetrisKeyIntent({ code, shiftKey: true }, 'playing'), { kind: 'action', action: TETRIS_KEY_ACTIONS[code], source: key(code) })
})

check('disabled owners do not press; duplicate source and malformed pointer/action are rejected', () => {
  const input = createTetrisInputOwners()
  assert.equal(input.press(key('ArrowLeft'), 'left'), null)
  assert.equal(input.pulse('hard'), null)
  input.reset(true)
  const first = input.press(key('ArrowLeft'), 'left')!
  assert.equal(first.resetDas, true)
  assert.equal(input.press(key('ArrowLeft'), 'left'), null)
  assert.equal(input.press(pointer(-1, 'left'), 'left'), null)
  assert.equal(input.press(pointer(Infinity, 'left'), 'left'), null)
  assert.equal(input.press(pointer(1, ''), 'left'), null)
  assert.equal(input.press(key('KeyX'), 'invalid' as TetrisInputAction), null)
  assert.equal(input.getSnapshot().owners.length, 1)
})

check('one key and two same-direction fingers release independently without restarting active DAS', () => {
  const input = createTetrisInputOwners(); input.reset(true)
  const a = input.press(key('ArrowLeft'), 'left')!.token
  const b = input.press(pointer(11, 'left'), 'left')!.token
  const c = input.press(pointer(12, 'left'), 'left')!.token
  assert.equal(input.release(b)!.resetDas, false)
  assert.equal(input.getSnapshot().direction, -1)
  assert.equal(input.release(a)!.snapshot.left, true)
  assert.equal(input.release(c)!.snapshot.direction, 0)
  assert.equal(input.release(c), null)
})

check('latest remaining horizontal owner wins; unrelated release cannot change that direction', () => {
  const input = createTetrisInputOwners(); input.reset(true)
  const a = input.press(key('ArrowLeft'), 'left')!.token
  const b = input.press(pointer(1, 'right'), 'right')!.token
  const c = input.press(pointer(2, 'left'), 'left')!.token
  assert.equal(input.getSnapshot().direction, -1)
  assert.equal(input.release(a)!.resetDas, false)
  assert.equal(input.release(c)!.snapshot.direction, 1)
  assert.equal(input.getSnapshot().left, false)
  assert.equal(input.release(b)!.resetDas, true)
  const down1 = input.press(key('ArrowDown'), 'down')!.token, down2 = input.press(pointer(3, 'down'), 'down')!.token
  assert.equal(input.release(down1)!.snapshot.down, true)
  assert.equal(input.release(down2)!.snapshot.down, false)
})

check('distinct rotation keys activate once each; old/cloned/cross-controller tokens cannot release new input', () => {
  const input = createTetrisInputOwners(); input.reset(true)
  const first = input.press(key('KeyX'), 'cw')!.token
  assert.ok(input.press(key('ArrowUp'), 'cw'))
  assert.equal(input.press(key('KeyX'), 'cw'), null)
  assert.equal(input.release({ ...first }), null)
  input.reset(false); input.reset(true)
  const next = input.press(key('KeyX'), 'cw')!.token
  assert.equal(input.release(first), null)
  assert.equal(input.getToken(key('KeyX')), next)
  const other = createTetrisInputOwners(); other.reset(true)
  assert.equal(input.release(other.press(key('KeyX'), 'cw')!.token), null)
  assert.equal(input.press(pointer(7, 'left'), 'left', first.epoch), null)
})

check('source snapshots are immutable, a pointer cannot own two buttons, pulse never leaves held state', () => {
  const input = createTetrisInputOwners(); input.reset(true)
  const source = { kind: 'pointer' as const, pointerId: 9, target: 'left' }
  const token = input.press(source, 'left')!.token
  source.target = 'right'
  assert.equal(token.source.kind === 'pointer' && token.source.target, 'left')
  assert.equal(input.getToken(pointer(9, 'right')), null)
  assert.equal(input.press(pointer(9, 'right'), 'right'), null)
  assert.throws(() => (input.getSnapshot().owners as unknown[]).push('bad'), TypeError)
  assert.throws(() => { (token as { action: string }).action = 'right' }, TypeError)
  input.release(token)
  for (const action of ['left', 'right', 'down', 'cw', 'ccw', 'hard', 'hold'] as const) assert.equal(input.pulse(action), action)
  assert.equal(input.getSnapshot().owners.length, 0)
})

check('pointer down/up/lost-capture followed by click produces no second activation', () => {
  const gate = createTetrisActivationGate(); gate.reset(1, true)
  const token = gate.pointerDown(3, 'cw', 100)!
  assert.ok(token); assert.equal(gate.pointerDown(3, 'cw', 101), null)
  assert.equal(gate.pointerEnd(token, 120), true)
  assert.equal(gate.pointerEnd(token, 121), true)
  assert.equal(gate.click({ epoch: 1, target: 'cw', pointerId: 3, pointerType: 'touch', at: 125 }), 'duplicate')
  assert.equal(gate.click({ epoch: 1, target: 'hard', pointerId: 3, pointerType: 'touch', at: 125 }), 'stale')
  assert.equal(gate.click({ epoch: 1, target: 'cw', pointerId: 44, pointerType: 'mouse', at: 125 }), 'stale')
  const replacement = gate.pointerDown(3, 'cw', 130)!
  assert.notEqual(replacement, token)
  assert.equal(gate.pointerEnd(token, 140), false)
  assert.equal(gate.pointerEnd(replacement, 140), true)
})

check('native Space/Enter activations are allowed once and repeat keydown/click does not repeat', () => {
  for (const code of ['Space', 'Enter', 'NumpadEnter']) {
    const gate = createTetrisActivationGate(); gate.reset(1, true)
    assert.equal(gate.keyDown(code, 'hold'), true)
    assert.equal(gate.keyDown(code, 'hold', 1, true), false)
    assert.equal(gate.keyDown(code, 'hold'), false)
    if (code === 'Space') assert.equal(gate.keyUp(code, 'hold'), true)
    assert.equal(gate.click(nativeClick(1, 'hold')), 'activate')
    if (code !== 'Space') {
      assert.equal(gate.click(nativeClick(1, 'hold')), 'duplicate')
      assert.equal(gate.keyUp(code, 'hold'), true)
    }
    assert.equal(gate.click(nativeClick(1, 'hold')), 'activate') // A separate assistive activation has no held key.
  }
})

check('pause/new epoch rejects old pointer and Space keyup while new assistive activation still works', () => {
  const gate = createTetrisActivationGate(); gate.reset(1, true)
  const old = gate.pointerDown(2, 'hard', 10)!
  gate.keyDown('Space', 'hard')
  gate.reset(2, false); gate.reset(3, true)
  assert.equal(gate.pointerEnd(old, 100), true)
  assert.equal(gate.click({ epoch: 3, target: 'hard', pointerId: 2, pointerType: 'touch', at: 100 }), 'stale')
  assert.equal(gate.keyUp('Space', 'hard'), false)
  assert.equal(gate.click(nativeClick(1, 'hard')), 'stale')
  assert.equal(gate.click(nativeClick(3, 'hard')), 'activate')
  assert.equal(gate.pointerDown(4, 'hard', 101, 1), null)
  assert.equal(gate.reset(2, true), false)
})

check('legacy click suppression consumes a matching recent pointer once; detail alone never blocks AT', () => {
  const gate = createTetrisActivationGate(); gate.reset(1, true)
  const first = gate.pointerDown(8, 'left', 10)!; gate.pointerEnd(first, 50)
  assert.equal(gate.click({ epoch: 1, target: 'left', at: 60, detail: 1 }), 'duplicate')
  assert.equal(gate.click({ epoch: 1, target: 'left', at: 65, detail: 1 }), 'activate')
  assert.equal(gate.click({ epoch: 1, target: 'right', at: 66, detail: 2 }), 'activate')
  const second = gate.pointerDown(8, 'left', 100)!; gate.pointerEnd(second, 150)
  assert.equal(gate.click({ epoch: 1, target: 'left', at: 1351, detail: 1 }), 'activate')
  assert.equal(gate.click({ ...nativeClick(1, 'left'), pointerId: 0 }), 'activate') // Empty pointerType is explicitly non-pointer.
  assert.equal(gate.click({ ...nativeClick(1, 'left'), defaultPrevented: true }), 'stale')
})

check('bounded pointer tombstones and canceled pad keys cannot revive a discarded gesture', () => {
  const gate = createTetrisActivationGate(); gate.reset(1, true)
  for (let id = 0; id < 40; id++) { const token = gate.pointerDown(id, 'down', id)!; gate.pointerEnd(token, id + 1) }
  assert.equal(gate.click({ epoch: 1, target: 'down', pointerId: 0, pointerType: 'touch', at: 100 }), 'stale')
  assert.equal(gate.click({ epoch: 1, target: 'down', pointerId: 39, pointerType: 'touch', at: 100 }), 'duplicate')
  gate.keyDown('Space', 'down'); gate.cancelKeys('down')
  assert.equal(gate.keyUp('Space', 'down'), false)
  assert.equal(gate.click(nativeClick(1, 'down')), 'activate')
  gate.reset(2, false)
  assert.equal(gate.click(nativeClick(2, 'down')), 'stale')
  assert.equal(gate.keyDown('Space', 'down'), false)
})

console.log(`${groups} tetris input groups passed`)
