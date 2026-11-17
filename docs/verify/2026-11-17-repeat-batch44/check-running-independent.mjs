import assert from 'node:assert/strict'
import fs from 'node:fs'
import { calculateRunning, formatClock } from '../../../src/utils/runningPace.ts'
import { captureRunningComparison, evaluateRunningGoals, currentRunningGoal } from '../../../src/utils/runningPaceComparison.ts'
import { createRunningDraft, captureRunningQuery, restoreRunningQuery, updateRunningQuery, createRunningInitialOwner } from '../../../src/utils/runningPaceQuery.ts'
import { createRunningActionGuard, copyRunningText, serializeRunningComparison } from '../../../src/utils/runningPaceActions.ts'

const goal = (id, h, m, s) => ({ id, hours: String(h), minutes: String(m), seconds: String(s) })
const clock = seconds => `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
let groups = 0, samples = 0
async function check(name, run) { if (process.argv.includes('--copy-only')) return; await run(); groups++; console.log('PASS', name) }

await check('independent integer half-seconds across every even kilometre distance and multiple clock scales', () => {
  for (let distance = 2; distance <= 500; distance += 2) for (const seconds of [1, 29, 599, 28803, 359999]) {
    const result = calculateRunning(distance, 'time', seconds, 1), half = result.splits.find(row => row.distanceKm === distance / 2)
    const expected = (seconds + 1) / 2
    assert.equal(formatClock(half.elapsedSeconds, true), clock(expected)); samples++
    assert.equal(result.splits.at(-1).elapsedSeconds, seconds)
  }
  for (const [distance, seconds] of [[21.0975, 8639], [42.195, 19799], [123.4567, 359999]]) {
    const result = calculateRunning(distance, 'time', seconds, 1), denominator = BigInt(Math.round(distance * 10000))
    for (const row of result.splits) {
      const numerator = BigInt(seconds) * BigInt(Math.round(row.distanceKm * 10000)), whole = numerator / denominator, remainder = numerator % denominator
      const rounded = Number(whole + (remainder * 2n >= denominator ? 1n : 0n))
      assert.equal(formatClock(row.elapsedSeconds, true), clock(rounded)); samples++
    }
  }
})
await check('fractional public calculations keep their precision and oversized current finishes remain single-mode valid', () => {
  for (const [distance, mode, value] of [[10.123456, 'time', 123.75], [100, 'time', 400001], [42.195, 'pace', 273.5]]) {
    const result = calculateRunning(distance, mode, value, 1), finish = mode === 'time' ? value : distance * value
    assert.equal(result.finishSeconds, finish); assert.equal(result.splits[0].elapsedSeconds, finish / distance)
  }
  assert.equal(currentRunningGoal(calculateRunning(500, 'pace', 5999, 1)).kind, 'aboveClockRange')
  assert.equal(currentRunningGoal(calculateRunning(0.0001, 'pace', 1, 1)).kind, 'belowOneSecond')
})
await check('blank goals remain in place, ties have zero delta and captures are independent of later edits', () => {
  const goals = [goal('slow', 1, 1, 1), goal('blank', 0, '', 0), goal('fast', 1, 0, 0)]
  const rows = evaluateRunningGoals(42.195, goals, 5)
  assert.deepEqual(rows.rows.map(row => [row.id, row.finishSeconds, row.deltaSeconds]), [['slow', 3661, 61], ['blank', null, null], ['fast', 3600, 0]])
  assert.equal(rows.allValid, false); assert.equal(captureRunningComparison(42.195, goals, 5), null)
  goals[1] = goal('tie', 1, 0, 0)
  const result = evaluateRunningGoals(42.195, goals, 5); assert.deepEqual(result.rows.map(row => row.shortest), [false, true, true])
  const capture = captureRunningComparison(42.195, goals, 5); goals[2].hours = '99'
  assert.equal(capture.goals[2].finishSeconds, 3600); assert.ok(Object.isFrozen(capture.splits[0].elapsedSeconds))
  assert.equal(capture.splits.at(-1).distanceKm, 42.195)
})
await check('strict numeric URL preserves foreign duplicates/hash and early partial editing does not discard other restored fields', () => {
  const draft = { ...createRunningDraft(), preset: 'custom', customDistance: '42.195', hours: '3', minutes: '15', seconds: '7', goals: [goal('a', 3, 0, 0), goal('b', 4, 0, 0)] }
  const shared = updateRunningQuery('https://example.test/running-pace/?extra=a&extra=b#split', draft)
  assert.equal(shared.kind, 'ready'); const url = new URL(shared.href); assert.deepEqual(url.searchParams.getAll('extra'), ['a', 'b']); assert.equal(url.hash, '#split')
  const restored = restoreRunningQuery(url.searchParams); assert.equal(restored.kind, 'ready'); assert.deepEqual(captureRunningQuery(restored.draft), captureRunningQuery(draft))
  const owner = createRunningInitialOwner(); owner.edit({ seconds: '' }); const chosen = owner.finish(restored)
  assert.equal(chosen.draft.seconds, ''); assert.equal(chosen.draft.hours, '3'); assert.equal(chosen.draft.customDistance, '42.195'); assert.equal(chosen.draft.goals.length, 2); assert.equal(owner.finish(restored), null)
  const invalid = updateRunningQuery(shared.href, chosen.draft); assert.equal(invalid.shareUrl, null); assert.equal(new URL(invalid.href).searchParams.has('rpV'), false); assert.deepEqual(new URL(invalid.href).searchParams.getAll('extra'), ['a', 'b'])
  url.searchParams.append('rpV', '1'); assert.equal(restoreRunningQuery(url.searchParams).kind, 'invalid')
  url.searchParams.set('rpV', '99'); assert.equal(restoreRunningQuery(url.searchParams).kind, 'unsupported')
})
await check('full500 TSV rows carry all three unrounded clocks, CSV quotes localized labels and has exactly one BOM', () => {
  const snapshot = captureRunningComparison(500, [goal('a', 90, 0, 1), goal('b', 95, 0, 1), goal('c', 99, 59, 59)], 1)
  const labels = { distanceKm: 'km', splitIntervalKm: 'interval', splitDistanceKm: 'mark', goals: ['A', 'B', 'C'], totalSeconds: 'seconds', paceSecondsPerKm: 'pace', speedKmh: 'speed', elapsedSeconds: 'elapsed', elapsedClock: 'clock' }
  const lines = serializeRunningComparison(snapshot, labels, 'tsv').split('\r\n'); assert.equal(lines.length, 501)
  for (let index = 1; index <= 500; index++) {
    const cells = lines[index].split('\t'); assert.equal(cells.length, 18); assert.equal(Number(cells[2]), index)
    for (let j = 0; j < 3; j++) {
      const seconds = [324001, 342001, 359999][j], offset = 3 + j * 5
      assert.equal(Number(cells[offset]), seconds); assert.equal(Number(cells[offset + 3]), seconds * index / 500)
    }
  }
  const csv = serializeRunningComparison(snapshot, { ...labels, distanceKm: '거리,"km"', goals: ['=danger', 'B', 'C'] }, 'csv')
  assert.equal(csv[0], '\uFEFF'); assert.equal(csv.slice(1).includes('\uFEFF'), false); assert.ok(csv.startsWith('\uFEFF"거리,""km""",')); assert.ok(csv.includes("'=danger · seconds"))
})

const descriptors = new Map(['navigator', 'document', 'HTMLElement'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
let commands = 0, restores = 0
try {
  const guard = createRunningActionGuard(); guard.activate(); guard.setContext('A'); const token = guard.begin()
  class Element { isConnected = true; focus() { restores++ } }
  const previous = new Element(), field = { value: '', style: {}, readOnly: false, focus() { guard.invalidate() }, select() {}, setSelectionRange() {}, remove() {} }
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element })
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { activeElement: previous, body: { appendChild() {} }, createElement: () => field, execCommand() { commands++; return true } } })
  const outcome = await copyRunningText('old result', () => guard.current(token))
  if (process.argv.includes('--record-copy-boundary')) {
    assert.equal(outcome, 'stale'); assert.equal(commands, 1)
    fs.writeFileSync('docs/verify/2026-11-17-repeat-batch44/copy-before-fix.json', JSON.stringify({ source: 'actual copyRunningText native fallback with focus-triggered ownership invalidation; controlled DOM', outcome, legacyCommandsAfterInvalidation: commands, oldFocusRestores: restores }, null, 2) + '\n')
    console.log('REPRODUCED stale fallback executes after focus invalidation; new helper is not connected to the parent yet')
  } else {
    assert.equal(outcome, 'stale'); assert.equal(commands, 0, 'stale fallback must check ownership immediately before execCommand')
    groups++; console.log('PASS native fallback stops after focus invalidates output ownership')
  }
} finally { for (const [key, descriptor] of descriptors) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key) } }
console.log(JSON.stringify({ groups, independentClockSamples: samples }))
