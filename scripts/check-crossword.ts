// 십자말풀이 로직 회귀 체크: node scripts/check-crossword.ts
import { generatePuzzle, WORD_BANK, wordCells, dailyNumber, msUntilNextDaily, dailyDate, mapTyped, cursorSlot, toTyped, computeStats, shapeGrid } from '../src/utils/crossword.ts'
let fail = 0
const ok = (c: boolean, msg: string) => { if (!c) { fail++; console.log('FAIL', msg) } }
const clueOf = new Map(WORD_BANK.map(w => [w.answer, w.clue]))

// 1) 1000일치 퍼즐: 모든 연속 구간(2칸+)이 배치 단어와 정확히 일치, 번호 규칙, 결정성
let minWords = 99, sumWords = 0
for (let n = 1; n <= 1000; n++) {
  const p = generatePuzzle(n)
  const q = generatePuzzle(n)
  ok(JSON.stringify(p) === JSON.stringify(q), `deterministic #${n}`)
  minWords = Math.min(minWords, p.words.length); sumWords += p.words.length
  const runs = new Set<string>()
  ok(p.rows <= 7 && p.cols <= 7 && p.grid.length === p.rows * p.cols, `dims #${n}`)
  for (const dir of ['across', 'down'] as const) {
    const A = dir === 'across' ? p.rows : p.cols, B = dir === 'across' ? p.cols : p.rows
    for (let a = 0; a < A; a++) {
      let s = ''; let start = 0
      for (let b = 0; b <= B; b++) {
        const k = dir === 'across' ? a * p.cols + b : b * p.cols + a
        const ch = b < B ? p.grid[k] : ''
        if (ch) { if (!s) start = b; s += ch } else {
          if (s.length >= 2) runs.add(`${dir}:${dir === 'across' ? a : start},${dir === 'across' ? start : a}:${s}`)
          s = ''
        }
      }
    }
  }
  const placed = new Set(p.words.map(w => `${w.dir}:${w.row},${w.col}:${w.answer}`))
  ok(runs.size === placed.size && [...runs].every(r => placed.has(r)), `runs==words #${n}`)
  for (const w of p.words) {
    ok(clueOf.get(w.answer) === w.clue, `clue #${n} ${w.answer}`)
    ok(wordCells(w, p.cols).every((k, i) => p.grid[k] === w.answer[i]), `cells #${n}`)
  }
  ok(new Set(p.words.map(w => w.answer)).size === p.words.length, `unique words #${n}`)
  const starts = [...new Set(p.words.map(w => w.row * p.cols + w.col))].sort((a, b) => a - b)
  ok(p.words.every(w => w.n === starts.indexOf(w.row * p.cols + w.col) + 1), `numbering #${n}`)
}
console.log(`words per puzzle: min ${minWords}, avg ${(sumWords / 1000).toFixed(1)}, bank ${WORD_BANK.length}`)
ok(minWords >= 6, 'min words >= 6')
ok(JSON.stringify(generatePuzzle(1)) !== JSON.stringify(generatePuzzle(2)), 'days differ')

// 2) KST 날짜 경계
ok(dailyNumber(Date.parse('2026-09-30T00:00:00+09:00')) === 1, '#1 start')
ok(dailyNumber(Date.parse('2026-09-30T23:59:59+09:00')) === 1, '#1 end')
ok(dailyNumber(Date.parse('2026-10-01T00:00:00+09:00')) === 2, '#2 at KST midnight')
ok(dailyNumber(Date.parse('2026-09-30T15:00:00Z')) === 2, '#2 in UTC')
ok(msUntilNextDaily(Date.parse('2026-09-30T23:59:00+09:00')) === 60000, 'countdown')
ok(dailyDate(2) === '2026-10-01', 'dailyDate')

// 3) 한글 입력 버퍼 매핑
const base = ['', '', '']
ok(mapTyped(base, '삭', 0).values.join(',') === '삭,,', 'compose 1')
ok(mapTyped(base, '사고', 1).values.join(',') === '사,고,', 'batchim moves')
ok(mapTyped(['가', '나', '다'], '사', 0).values.join(',') === '사,나,다', 'overwrite keeps rest')
ok(mapTyped(['가', '나', '다'], '', 1).values.join(',') === ',나,다', 'backspace clears touched')
ok(mapTyped(['', ''], '사과나', 2).values.join(',') === '사,나', 'overflow replaces last')
ok(cursorSlot(1, 3, true) === 0 && cursorSlot(1, 3, false) === 1 && cursorSlot(3, 3, false) === 2 && cursorSlot(0, 3, false) === 0, 'cursorSlot')
ok(toTyped('\u200Babc사ㄱ') === '사ㄱ', 'toTyped filter')
ok(toTyped('\u1109\u1161') === '사', 'NFC')

// 4) 통계
const s = computeStats({ 1: { time: 100, hints: 0 }, 2: { time: 200, hints: 1 }, 4: { time: 60, hints: 0 }, 5: { time: 80, hints: 2 } }, 6)
ok(s.solved === 4 && s.streak === 2 && s.maxStreak === 2 && s.best === 60 && s.avg === 110 && s.clean === 2, 'stats ' + JSON.stringify(s))
ok(computeStats({ 5: { time: 1, hints: 0 } }, 7).streak === 0, 'broken streak')
ok(computeStats({ 6: { time: 1, hints: 0 }, 7: { time: 1, hints: 0 } }, 7).streak === 2, 'today streak')

// 5) 공유 격자: 정답 글자 없음
const g = shapeGrid(generatePuzzle(1), new Set())
ok(!/[가-힣]/.test(g) && g.includes('🟦'), 'shape grid')

console.log(fail ? `${fail} failed` : 'all passed'); if (fail) process.exit(1)
