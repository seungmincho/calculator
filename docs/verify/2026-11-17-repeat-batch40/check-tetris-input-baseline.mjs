// Extract real handlers and exercise them without a real game or leaderboard.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../../../src/components/Tetris.tsx', import.meta.url), 'utf8')
const compile = text => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const keyStart = source.indexOf('const isTyping = (e: KeyboardEvent)')
const keyEnd = source.indexOf("window.addEventListener('keydown', down)", keyStart)
const gestureStart = source.indexOf('const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>)')
const gestureEnd = source.indexOf('const handleLeaderboardSubmit', gestureStart)
assert.ok(keyStart >= 0 && keyEnd > keyStart && gestureStart >= 0 && gestureEnd > gestureStart)
const calls = []
const context = vm.createContext({
  statusRef: { current: 'playing' }, gameRef: { current: {} }, gestRef: { current: null },
  showNameModalRef: { current: false }, performance: { now: () => 100 }, COLS: 10,
  KEYMAP: { Space: 'hard', ArrowLeft: 'left' },
  press: action => calls.push(`press:${action}`), release: action => calls.push(`release:${action}`),
  pause: () => calls.push('pause'), resume: () => calls.push('resume'), start: () => calls.push('start'),
  rotate: () => calls.push('rotate'), hardDrop: () => calls.push('hardDrop'), holdPiece: () => calls.push('hold'),
  move: () => calls.push('move'), softDropOne: () => calls.push('softDrop'), syncRef: { current() {} },
})
vm.runInContext(compile(`${source.slice(keyStart, keyEnd)}; globalThis.keys = { down, up };`), context)
vm.runInContext(compile(`${source.slice(gestureStart, gestureEnd)}; globalThis.gesture = { onPointerDown, onPointerMove, onPointerUp, pad };`), context)
const event = (code, tagName) => ({ code, target: { tagName, isContentEditable: false }, repeat: false, preventDefault() { calls.push('preventDefault') } })
const probes = []
context.keys.down(event('Space', 'BUTTON'))
assert.ok(calls.includes('press:hard'))
probes.push({ name: 'Space on focused button intercepted as hard drop', calls: calls.splice(0) })
context.statusRef.current = 'over'
context.keys.down(event('Enter', 'A'))
assert.ok(calls.includes('start'))
probes.push({ name: 'Enter on focused link restarts finished game', calls: calls.splice(0) })
context.statusRef.current = 'playing'
context.keys.down(event('Space', 'TEXTAREA'))
assert.equal(calls.length, 0)
probes.push({ name: 'existing textarea exclusion works', calls: [] })
const button = context.gesture.pad('left')
assert.equal(typeof button.onClick, 'undefined')
assert.equal(typeof button.onKeyDown, 'undefined')
probes.push({ name: 'pad has no native keyboard activation handler', missing: ['onClick', 'onKeyDown'] })
const pointer = id => ({ pointerId: id, clientX: 10, clientY: 10, currentTarget: { setPointerCapture() {} } })
context.gesture.onPointerDown(pointer(1))
context.gesture.onPointerUp(pointer(2))
assert.ok(calls.includes('rotate'))
assert.equal(context.gestRef.current, null)
probes.push({ name: 'unrelated pointer releases and acts on first gesture', calls: calls.splice(0) })
const report = { reproductionOnly: true, sourceSha256: createHash('sha256').update(source).digest('hex'), groups: probes.length, probes }
if (process.argv.includes('--record')) writeFileSync(new URL('before-fix.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
