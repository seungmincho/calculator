// node scripts/check-tetris-gesture.ts
import assert from 'node:assert/strict'
import { createTetrisGesture, type TetrisGesturePoint } from '../src/utils/tetrisGesture.ts'
import { newGame, move, softDropOne, rotate, hardDrop, holdPiece, COLS, ROWS } from '../src/utils/tetrisEngine.ts'

let groups = 0
const check = (name: string, run: () => void) => { run(); groups++; console.log(`PASS ${name}`) }
const point = (patch: Partial<TetrisGesturePoint> = {}): TetrisGesturePoint => ({ pointerId: 1, target: 'board', x: 100, y: 100, at: 0, width: 320, ...patch })
const ready = () => { const gesture = createTetrisGesture(COLS, ROWS); gesture.reset(1, true); return gesture }

check('a single pointer owns the board; unrelated down/move/up/cancel cannot alter its tap', () => {
  const gesture = ready(), token = gesture.begin(point())!
  assert.equal(gesture.begin(point({ pointerId: 2 })), null)
  assert.equal(gesture.begin(point()), null)
  assert.deepEqual(gesture.move(token, point({ pointerId: 2, x: 300, at: 10 })), [])
  assert.deepEqual(gesture.end(token, point({ pointerId: 2, at: 20 })), [])
  assert.equal(gesture.cancel(token, 2), false)
  assert.equal(gesture.getToken(), token)
  assert.deepEqual(gesture.end(token, point({ at: 100 })), [{ type: 'rotate' }])
  assert.equal(gesture.getToken(), null)
})

check('target/token identity and pause/new-game epochs reject old moves and release callbacks', () => {
  const gesture = ready(), old = gesture.begin(point())!
  assert.deepEqual(gesture.end({ ...old }, point({ at: 50 })), [])
  assert.deepEqual(gesture.end(old, point({ target: 'other', at: 50 })), [])
  gesture.reset(2, false); gesture.reset(3, true)
  const next = gesture.begin(point({ at: 100 }))!
  assert.equal(gesture.cancel(old), false)
  assert.deepEqual(gesture.end(old, point({ at: 200 })), [])
  assert.equal(gesture.getToken(), next)
  assert.deepEqual(gesture.end(next, point({ at: 200 })), [{ type: 'rotate' }])
})

check('hidden/disabled and invalid initial coordinates or board width have no action', () => {
  const gesture = createTetrisGesture(COLS, ROWS)
  assert.equal(gesture.begin(point()), null)
  gesture.reset(1, true)
  for (const patch of [{ width: 0 }, { width: -1 }, { width: NaN }, { width: Infinity }, { x: Infinity }, { y: NaN }, { at: Infinity }, { pointerId: -1 }, { pointerId: 0.5 }]) assert.equal(gesture.begin(point(patch)), null)
  assert.throws(() => createTetrisGesture(0, ROWS), RangeError)
  assert.throws(() => createTetrisGesture(COLS, Infinity), RangeError)
  assert.equal(gesture.begin(point(), 0), null)
})

check('normal movement preserves 1-cell horizontal and 1.2-cell down thresholds and residuals', () => {
  const gesture = ready(), token = gesture.begin(point())!
  assert.deepEqual(gesture.move(token, point({ x: 131, y: 138, at: 1 })), [])
  assert.deepEqual(gesture.move(token, point({ x: 165, y: 178, at: 2 })), [{ type: 'move', direction: 1, count: 2 }, { type: 'soft', count: 2 }])
  assert.deepEqual(gesture.move(token, point({ x: 165, y: 178, at: 3 })), [])
  assert.deepEqual(gesture.move(token, point({ x: 132, y: 100, at: 4 })), [{ type: 'move', direction: -1, count: 1 }])
  assert.deepEqual(gesture.end(token, point({ x: 132, y: 100, at: 500 })), [])
})

check('tap/flick strict boundaries match the existing control thresholds', () => {
  for (const [patch, expected] of [
    [{ x: 111, y: 111, at: 349 }, [{ type: 'rotate' }]],
    [{ x: 112, y: 100, at: 100 }, []], [{ at: 350 }, []],
    [{ y: 151, at: 299 }, [{ type: 'hard' }]], [{ y: 150, at: 299 }, []],
    [{ y: 151, at: 300 }, []], [{ y: 49, at: 299 }, [{ type: 'hold' }]],
    [{ x: 140, y: 160, at: 100 }, []],
  ] as const) {
    const gesture = ready(), token = gesture.begin(point())!
    assert.deepEqual(gesture.end(token, point(patch)), expected)
  }
})

check('invalid move/end cancels only its owning gesture and never leaves a later tap armed', () => {
  for (const patch of [{ width: 0 }, { width: Number.MIN_VALUE }, { x: Infinity }, { at: NaN }, { at: -1 }]) {
    const gesture = ready(), token = gesture.begin(point())!
    assert.deepEqual(gesture.move(token, point(patch)), [])
    assert.equal(gesture.getToken(), null)
    assert.deepEqual(gesture.end(token, point({ at: 100 })), [])
  }
  const gesture = ready(), token = gesture.begin(point())!
  assert.deepEqual(gesture.move(token, point({ at: 50 })), [])
  assert.deepEqual(gesture.end(token, point({ at: 49 })), [])
  assert.equal(gesture.getToken(), null)
})

check('huge finite deltas produce bounded plans and do not accumulate catch-up work', () => {
  const gesture = ready(), token = gesture.begin(point())!
  const huge = point({ x: 1e100, y: 1e100, at: 10, width: 0.001 })
  assert.deepEqual(gesture.move(token, huge), [{ type: 'move', direction: 1, count: COLS }, { type: 'soft', count: ROWS }])
  assert.deepEqual(gesture.move(token, { ...huge, at: 20 }), [])
  const overflow = ready(), first = overflow.begin(point({ x: -Number.MAX_VALUE }))!
  assert.deepEqual(overflow.move(first, point({ x: Number.MAX_VALUE, at: 1 })), [])
  assert.equal(overflow.getToken(), null)
})

check('cancel/lost-capture never performs a tap; a fresh pointer remains usable', () => {
  const gesture = ready(), token = gesture.begin(point())!
  assert.equal(gesture.cancel(token), true)
  assert.equal(gesture.cancel(token), false)
  assert.deepEqual(gesture.end(token, point({ at: 50 })), [])
  const next = gesture.begin(point({ pointerId: 7, at: 100 }))!
  assert.deepEqual(gesture.end(next, point({ pointerId: 7, at: 200 })), [{ type: 'rotate' }])
  assert.equal(gesture.reset(0, true), false)
})

check('action plans are immutable and apply through unchanged real engine operations', () => {
  const gesture = ready(), token = gesture.begin(point())!
  const actual = newGame(() => 0.37), expected = newGame(() => 0.37)
  const plan = gesture.move(token, point({ x: 164, y: 177, at: 10 }))
  for (const action of plan) {
    if (action.type === 'move') for (let i = 0; i < action.count; i++) move(actual, action.direction)
    if (action.type === 'soft') for (let i = 0; i < action.count; i++) softDropOne(actual)
  }
  move(expected, 1); move(expected, 1); softDropOne(expected); softDropOne(expected)
  assert.deepEqual(actual.piece, expected.piece); assert.equal(actual.score, expected.score)
  assert.throws(() => (plan as unknown[]).push({ type: 'hard' }), TypeError)
  assert.throws(() => { (plan[0] as { count: number }).count = 999 }, TypeError)
  for (const kind of ['rotate', 'hard', 'hold'] as const) {
    const a = newGame(() => 0.37), b = newGame(() => 0.37)
    const g = ready(), t = g.begin(point())!
    const end = kind === 'rotate' ? point({ at: 10 }) : point({ y: kind === 'hard' ? 200 : 0, at: 10 })
    const plan = g.end(t, end)
    assert.equal(plan[0].type, kind)
    for (const action of plan) {
      if (action.type === 'rotate') rotate(a, 1)
      if (action.type === 'hard') hardDrop(a)
      if (action.type === 'hold') holdPiece(a)
    }
    if (kind === 'rotate') rotate(b, 1)
    if (kind === 'hard') hardDrop(b)
    if (kind === 'hold') holdPiece(b)
    assert.deepEqual(a.piece, b.piece); assert.deepEqual(a.board, b.board); assert.equal(a.score, b.score)
  }
})

console.log(`${groups} tetris gesture groups passed`)
