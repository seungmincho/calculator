// 네모로직 회귀 체크: node scripts/check-picross.ts
import {
  lineClue, rowClues, colClues, solveLine, lineSolve, generatePuzzle, dayNumber, msToNextDay, dailySeed,
  computeStreak, shareRows, shareText, SIZES,
} from '../src/utils/picross.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const G = (rows: string[]) => rows.map(r => [...r].map(ch => ch === '#'))

// 힌트
eq(lineClue([true, true, false, true]), [2, 1], '힌트 2 1')
eq(lineClue([false, false]), [0], '빈 줄 = 0')

// 한 줄 추론: 겹침 기법
eq(solveLine([4], [-1, -1, -1, -1, -1]), [-1, 1, 1, 1, -1], '5칸 중 4 → 가운데 3칸 확정')
eq(solveLine([5], [-1, -1, -1, -1, -1]), [1, 1, 1, 1, 1], '꽉 찬 줄')
eq(solveLine([0], [-1, -1, -1]), [0, 0, 0], '0 → 전부 빈칸')
eq(solveLine([2, 2], [-1, -1, -1, -1, -1]), [1, 1, 0, 1, 1], '2 2 in 5')
eq(solveLine([1], [-1, 1, -1, -1]), [0, 1, 0, 0], '이미 칠한 칸 주변 확정')
eq(solveLine([3], [-1, 0, -1, -1, -1]), [0, 0, 1, 1, 1], '빈칸 때문에 오른쪽만 가능')
eq(solveLine([2], [1, 1, 1]), null, '모순')

// 유일해 판정: 대각선 2개 해가 있는 퍼즐은 줄 추론으로 못 풂
const amb = G(['#.', '.#'])
eq(lineSolve(rowClues(amb), colClues(amb)), null, '해 2개(대각선) → 거부')
const heart = G(['.#.#.', '#####', '#####', '.###.', '..#..'])
eq(lineSolve(rowClues(heart), colClues(heart)), heart, '하트 퍼즐 유일해')

// 생성: 결정적 + 모든 결과가 줄 추론으로 유일하게 풀림 + 빈 줄 없음 + 속도
const t0 = Date.now()
let worst = 0
for (const size of SIZES) {
  for (let seed = 1; seed <= 150; seed++) {
    const s0 = Date.now()
    const g = generatePuzzle(size, seed * 7919)
    worst = Math.max(worst, Date.now() - s0)
    const sol = lineSolve(rowClues(g), colClues(g))
    if (JSON.stringify(sol) !== JSON.stringify(g)) { fail++; console.log('FAIL 유일해 아님', size, seed) }
    if (g.some(r => !r.some(Boolean)) || g[0].some((_, c) => !g.some(r => r[c]))) { fail++; console.log('FAIL 빈 줄', size, seed) }
  }
}
const total = Date.now() - t0
eq(JSON.stringify(generatePuzzle(10, 12345)) === JSON.stringify(generatePuzzle(10, 12345)), true, '같은 시드 = 같은 퍼즐')
eq(JSON.stringify(generatePuzzle(10, 12345)) === JSON.stringify(generatePuzzle(10, 12346)), false, '다른 시드 = 다른 퍼즐')
eq(worst < 300, true, `퍼즐 1개 최악 생성 시간 ${worst}ms < 300ms`)
console.log(`생성 450개 ${total}ms, 최악 ${worst}ms`)

// 오늘의 퍼즐: KST 자정 기준, 모두에게 같은 시드
const kst = (iso: string) => Date.parse(iso + '+09:00')
eq(dayNumber(kst('2026-01-01T00:00:00')), 1, '2026-01-01 KST = #1')
eq(dayNumber(kst('2026-01-01T23:59:59')), 1, '같은 날 밤')
eq(dayNumber(kst('2026-01-02T00:00:00')), 2, 'KST 자정 넘김')
eq(dayNumber(Date.parse('2026-10-01T14:59:59Z')), 274, 'UTC 14:59 = KST 23:59 (10/1)')
eq(dayNumber(Date.parse('2026-10-01T15:00:00Z')), 275, 'UTC 15:00 = KST 10/2 0시')
eq(msToNextDay(kst('2026-10-01T23:00:00')), 3_600_000, '자정까지 1시간')
eq(dailySeed(274, 10), dailySeed(274, 10), '시드 결정적')
eq(new Set(SIZES.map(s => dailySeed(274, s))).size, 3, '크기별 다른 시드')
eq(dailySeed(274, 10) !== dailySeed(275, 10), true, '날마다 다른 시드')
eq(JSON.stringify(generatePuzzle(10, dailySeed(274, 10))), JSON.stringify(generatePuzzle(10, dailySeed(274, 10))), '오늘의 퍼즐 재현')

// 연속 기록
const rec = { 10: { 5: { time: 30, mistakes: 0, rows: [] } }, 11: { 10: { time: 90, mistakes: 1, rows: [] } }, 13: { 15: { time: 200, mistakes: 0, rows: [] } }, 14: {} }
eq(computeStreak(rec, 13), { current: 1, max: 2, played: 3 }, '오늘 풂, 하루 끊김')
eq(computeStreak(rec, 12), { current: 2, max: 2, played: 3 }, '오늘 아직 → 어제까지 연속')
eq(computeStreak(rec, 15).current, 0, '어제도 안 풂 → 0')

// 공유 문구 (정답 모양 노출 없음)
eq(shareRows([0, 1, 2, 0, 0, 0]), '🟩🟨🟥🟩🟩\n🟩', '줄별 정확도')
eq(shareText({ title: '네모로직', day: 274, size: 5, time: 75, mistakes: 0, rows: [0, 0, 0, 0, 0], streak: 3, url: 'x' }),
  '네모로직 #274 5×5 ⏱1:15 ✨ 🔥3\n🟩🟩🟩🟩🟩\nx', '공유 문구')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('ok')
