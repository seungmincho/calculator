// node --experimental-strip-types scripts/check-minesweeper-replay.ts
import assert from 'node:assert/strict'
import { generate, mulberry32, PRESETS, withCounts, openCell, isWon } from '../src/utils/minesweeper.ts'
import { captureClassicReplaySource, cloneClassicReplaySource, createClassicPractice, canPracticeClassic, isClassicReplaySource,
  shouldRecordMinesweeperResult, createMinesweeperScoreEligibility, canSubmitMinesweeperScore, isCurrentMinesweeperInput,
  type ClassicReplaySource, type MinesweeperRoundContext,
} from '../src/utils/minesweeperReplay.ts'

let groups = 0
const check = (name: string, run: () => void) => { run(); groups++; console.log('PASS', name) }
const preset = PRESETS.beginner
const source = () => captureClassicReplaySource(generate(preset.w, preset.h, preset.mines, 40, mulberry32(42)), 40, 'beginner', true)
check('preset corner/center layouts retain original mines, counts, first cell and generation outcome', () => {
  for (const difficulty of ['beginner', 'intermediate', 'expert'] as const) {
    const p = PRESETS[difficulty]
    for (const first of [0, p.w * p.h - 1, Math.floor(p.h / 2) * p.w + Math.floor(p.w / 2)]) {
      for (const seed of [1, 17, 303]) {
        const layout = generate(p.w, p.h, p.mines, first, mulberry32(seed))
        const captured = captureClassicReplaySource(layout, first, difficulty, seed === 17)
        const practice = createClassicPractice(captured)
        assert.deepEqual(practice.layout, layout); assert.equal(practice.first, first); assert.equal(practice.open[first], true)
        assert.equal(practice.noGuessFailed, seed === 17); assert.equal(practice.mines, p.mines)
        assert.equal(captured.mine[first], false); assert.equal(practice.practice, true)
      }
    }
  }
})
check('snapshot is deeply frozen and isolated from source generator arrays and cloned snapshots', () => {
  const layout = generate(9, 9, 10, 40, mulberry32(42))
  const captured = captureClassicReplaySource(layout, 40, 'beginner', false)
  const before = JSON.stringify(captured), copy = cloneClassicReplaySource(captured)
  assert.ok(Object.isFrozen(captured) && Object.isFrozen(captured.mine) && Object.isFrozen(captured.count))
  assert.notEqual(copy, captured); assert.notEqual(copy.mine, captured.mine); assert.notEqual(copy.count, captured.count)
  layout.mine.fill(true); layout.count.fill(8); assert.equal(JSON.stringify(captured), before); assert.deepEqual(copy, captured)
})
check('repeated practice has independent layout/open/marks and never mutates the retained source', () => {
  const captured = source(), before = JSON.stringify(captured), first = createClassicPractice(captured)
  first.marks.fill(2); first.open.fill(true); first.layout.mine.fill(true); first.layout.count.fill(8)
  const second = createClassicPractice(captured)
  assert.equal(JSON.stringify(captured), before); assert.deepEqual(second.layout.mine, captured.mine); assert.deepEqual(second.layout.count, captured.count)
  assert.ok(second.marks.every(mark => mark === 0)); assert.ok(second.open.some(open => !open))
  assert.equal(second.boom, -1); assert.equal(second.clicks, 0); assert.equal(second.start, 0); assert.equal(second.end, 0)
  assert.notEqual(first.open, second.open); assert.notEqual(first.marks, second.marks); assert.notEqual(second.layout.mine, captured.mine)
})
check('opening exactly the original safe cell matches existing flood fill, without generator calls', () => {
  const captured = source(), expectedOpen = new Array<boolean>(81).fill(false), expectedMarks = new Array<0>(81).fill(0)
  const layout = { w: 9, h: 9, mine: [...captured.mine], count: [...captured.count] }
  openCell(layout, expectedOpen, expectedMarks, captured.first)
  const actual = createClassicPractice(captured)
  assert.deepEqual(actual.open, expectedOpen); assert.deepEqual(actual.marks, expectedMarks)
  assert.equal(actual.status, isWon(layout, expectedOpen) ? 'won' : 'ready')
})
check('small automatic-completion board is immediately won with zero time and user clicks', () => {
  const mines = new Array<boolean>(25).fill(false); mines[0] = true
  const captured = captureClassicReplaySource(withCounts(5, 5, mines), 24, 'custom', false)
  const actual = createClassicPractice(captured)
  assert.equal(actual.status, 'won'); assert.equal(actual.open.filter(Boolean).length, 24)
  assert.equal(actual.start, 0); assert.equal(actual.end, 0); assert.equal(actual.clicks, 0); assert.equal(actual.boom, -1)
  assert.ok(actual.marks.every(mark => mark === 0)); assert.ok(canPracticeClassic('classic', actual.status, actual.replaySource))
})
check('invalid dimensions, unsafe first cell, malformed/sparse arrays and incorrect counts are rejected', () => {
  const valid = source(), unsafe = valid.mine.findIndex(Boolean)
  const sparse = [...valid.mine]; delete sparse[3]
  const invalid = [
    { ...valid, first: unsafe }, { ...valid, first: -1 }, { ...valid, first: 81 }, { ...valid, first: NaN },
    { ...valid, w: 4 }, { ...valid, h: 25 }, { ...valid, mines: 0 }, { ...valid, mines: 11 },
    { ...valid, difficulty: 'expert' }, { ...valid, difficulty: 'toString' }, { ...valid, noGuessFailed: undefined },
    { ...valid, mine: [] }, { ...valid, mine: sparse }, { ...valid, mine: valid.mine.map((value, i) => i === 0 ? 1 : value) },
    { ...valid, count: valid.count.map((value, i) => i === 0 ? (value + 1) % 9 : value) }, { ...valid, count: new Array(81) },
  ] as ClassicReplaySource[]
  for (const candidate of invalid) { assert.equal(isClassicReplaySource(candidate), false); assert.throws(() => createClassicPractice(candidate), /invalidClassicReplaySource/) }
})
check('practice entry is limited to finished classic rounds with a valid captured source', () => {
  const captured = source()
  for (const status of ['ready', 'playing', 'won', 'lost'] as const) {
    assert.equal(canPracticeClassic('classic', status, captured), ['won', 'lost'].includes(status))
    assert.equal(canPracticeClassic('daily', status, captured), false)
  }
  assert.equal(canPracticeClassic('classic', 'won', null), false)
})
const regular: MinesweeperRoundContext = { generation: 1, mode: 'classic', difficulty: 'beginner', practice: false, status: 'won', start: 1000, end: 2537 }
check('normal classic/daily wins and losses remain recordable, practice never records including auto-win', () => {
  for (const mode of ['classic', 'daily'] as const) for (const status of ['ready', 'playing', 'won', 'lost'] as const) {
    assert.equal(shouldRecordMinesweeperResult({ ...regular, mode, status }), ['won', 'lost'].includes(status))
    assert.equal(shouldRecordMinesweeperResult({ ...regular, mode, status, practice: true }), false)
  }
  assert.equal(shouldRecordMinesweeperResult({ ...regular, practice: true, start: 0, end: 0 }), false)
})
check('score eligibility preserves normal rounding and excludes daily/custom/loss/practice/invalid clocks', () => {
  assert.deepEqual(createMinesweeperScoreEligibility(regular), { generation: 1, difficulty: 'beginner', ms: 1537, seconds: 2 })
  assert.equal(createMinesweeperScoreEligibility({ ...regular, end: regular.start })?.seconds, 1)
  const invalid = [{ mode: 'daily' }, { difficulty: 'custom' }, { status: 'lost' }, { practice: true }, { start: 0 }, { end: 999 }, { end: Infinity }, { generation: -1 }]
  for (const change of invalid) assert.equal(createMinesweeperScoreEligibility({ ...regular, ...change } as MinesweeperRoundContext), null)
})
check('old modal eligibility rejects changed round, score, difficulty, mode and practice', () => {
  const eligible = createMinesweeperScoreEligibility(regular)
  assert.ok(Object.isFrozen(eligible)); assert.ok(canSubmitMinesweeperScore(eligible, regular))
  for (const change of [{ generation: 2 }, { difficulty: 'expert' }, { end: 3000 }, { mode: 'daily' }, { practice: true }, { status: 'ready' }]) {
    assert.equal(canSubmitMinesweeperScore(eligible, { ...regular, ...change } as MinesweeperRoundContext), false)
  }
  assert.equal(canSubmitMinesweeperScore(null, regular), false)
  assert.equal(canSubmitMinesweeperScore({ ...eligible!, seconds: 99 }, regular), false)
})
check('input generation accepts current zero/positive rounds but rejects stale and malformed tokens', () => {
  assert.ok(isCurrentMinesweeperInput(0, 0)); assert.ok(isCurrentMinesweeperInput(7, 7))
  for (const expected of [-1, 6, 8, 7.5, NaN, Infinity]) assert.equal(isCurrentMinesweeperInput(expected, 7), false)
  assert.equal(isCurrentMinesweeperInput(-1, -1), false)
})
console.log(`${groups} minesweeper replay preparation groups passed; parent and public submission remain unconnected`)
