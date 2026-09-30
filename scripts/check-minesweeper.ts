// 지뢰찾기 로직 회귀 체크: node scripts/check-minesweeper.ts
import assert from 'node:assert/strict'
import {
  PRESETS, mulberry32, neighbors, clampConfig, generate, withCounts, openCell, chord, isWon, bbbv,
  solvable, generateNoGuess, dayNumber, msToNextDay, dailyBoard, dailyStats, fmtTime, type Mark,
} from '../src/utils/minesweeper.ts'

const blank = (n: number) => ({ open: new Array<boolean>(n).fill(false), marks: new Array<Mark>(n).fill(0) })

// PRNG 결정성
const a = mulberry32(42), b = mulberry32(42)
for (let k = 0; k < 5; k++) assert.equal(a(), b())

assert.deepEqual(neighbors(3, 3, 0).sort(), [1, 3, 4])
assert.equal(neighbors(3, 3, 4).length, 8)
assert.deepEqual(clampConfig(100, 1, 9999), { w: 30, h: 5, mines: 141 })
assert.deepEqual(clampConfig(9, 9, 0), { w: 9, h: 9, mines: 1 })

// 첫 클릭 안전 + 영역 열림 (모든 난이도 × 모서리/가운데 × 여러 시드)
for (const p of Object.values(PRESETS)) {
  for (const first of [0, p.w * p.h - 1, Math.floor(p.h / 2) * p.w + Math.floor(p.w / 2)]) {
    for (let s = 1; s <= 50; s++) {
      const L = generate(p.w, p.h, p.mines, first, mulberry32(s))
      assert.equal(L.mine.filter(Boolean).length, p.mines)
      assert.equal(L.mine[first], false)
      assert.equal(L.count[first], 0, 'first click opens area')
      const { open, marks } = blank(p.w * p.h)
      const r = openCell(L, open, marks, first)
      assert.equal(r.boom, -1)
      assert.ok(r.opened.length > 1)
    }
  }
}
// 칸이 부족한 커스텀(5×5, 16지뢰 = 25-9): 3×3 제외 유지
{ const L = generate(5, 5, 16, 12, mulberry32(7)); assert.equal(L.count[12], 0) }

// 손으로 만든 판:  4×3
//  * 1 0 0
//  1 1 0 0
//  0 0 0 0
const m = new Array(12).fill(false); m[0] = true
const L = withCounts(4, 3, m)
assert.deepEqual(L.count, [0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0])
assert.equal(bbbv(L), 1, '3BV: one opening covers all numbers')
{
  const { open, marks } = blank(12)
  marks[11] = 2 // 물음표는 flood fill 시 해제
  const r = openCell(L, open, marks, 3)
  assert.equal(r.opened.length, 11)
  assert.equal(marks[11], 0)
  assert.ok(isWon(L, open))
}
{ // 깃발 칸은 flood fill이 넘어가지 않음 + 클릭해도 안 열림
  const { open, marks } = blank(12)
  marks[6] = 1
  openCell(L, open, marks, 3)
  assert.equal(open[6], false)
  assert.equal(openCell(L, open, marks, 6).opened.length, 0)
}
{ // chord: 깃발 수 == 숫자 → 이웃 열기, 틀린 깃발 → 터짐
  const { open, marks } = blank(12)
  open[5] = true
  assert.equal(chord(L, open, marks, 5).opened.length, 0, 'no flags → no chord')
  marks[0] = 1
  const r = chord(L, open, marks, 5)
  assert.equal(r.boom, -1)
  assert.ok(isWon(L, open))
  const x = blank(12); x.open[5] = true; x.marks[4] = 1
  assert.equal(chord(L, x.open, x.marks, 5).boom, 0)
}
{ // 3BV: 숫자만 있는 판 (* 1 / 1 1 → 3칸 모두 따로 클릭)
  const s = withCounts(2, 2, [true, false, false, false])
  assert.equal(bbbv(s), 3)
}

// 솔버: 3×2 (M . . / . . .) → 왼쪽 두 칸 50:50 → false
assert.equal(solvable(withCounts(3, 2, [true, false, false, false, false, false]), 2), false)
// 전부 flood fill로 열리는 판은 true
assert.equal(solvable(L, 3), true)

// 추측 없는 판: 결과가 실제로 solvable + 시간
for (const [name, p] of Object.entries(PRESETS)) {
  const first = Math.floor(p.h / 2) * p.w + Math.floor(p.w / 2)
  const t0 = performance.now()
  let ok = 0
  for (let s = 1; s <= 5; s++) {
    const g = generateNoGuess(p.w, p.h, p.mines, first, mulberry32(s))
    if (g.ok) { ok++; assert.ok(solvable(g.board, first)) }
  }
  console.log(`no-guess ${name}: ${ok}/5 ok, ${((performance.now() - t0) / 5).toFixed(0)}ms avg`)
  assert.ok(ok >= 4, `${name} no-guess success`)
}

// 오늘의 판: KST 경계 + 결정성
const kstMidnight = Date.UTC(2025, 11, 31, 15)
assert.equal(dayNumber(kstMidnight), 1)
assert.equal(dayNumber(kstMidnight - 1), 0)
assert.equal(msToNextDay(kstMidnight - 1), 1)
const d1 = dailyBoard(274), d2 = dailyBoard(274), d3 = dailyBoard(275)
assert.deepEqual(d1.board.mine, d2.board.mine)
assert.equal(d1.start, d2.start)
assert.notDeepEqual(d1.board.mine, d3.board.mine)
assert.equal(d1.board.count[d1.start], 0)
assert.ok(d1.ok)

// 통계
const st = dailyStats({ 10: { won: true, ms: 90000, progress: 1 }, 11: { won: false, ms: 5000, progress: 0.3 }, 12: { won: true, ms: 80000, progress: 1 }, 13: { won: true, ms: 99000, progress: 1 } }, 14)
assert.deepEqual(st, { played: 4, winRate: 75, best: 80000, current: 2 })
assert.deepEqual(dailyStats({}, 5), { played: 0, winRate: 0, best: 0, current: 0 })

assert.equal(fmtTime(102370), '1:42.37')
assert.equal(fmtTime(102370, false), '1:42')
assert.equal(fmtTime(5), '0:00.00')

console.log('check-minesweeper: OK')
