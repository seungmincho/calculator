// 홈 "오늘의 퍼즐" 상태 + 시즌 카드 날짜 선택 회귀 체크: node scripts/check-daily-puzzles.ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { readDailyPuzzles } from '../src/utils/dailyPuzzles.ts'
import { seasonalPicks, upcomingDeadlines } from '../src/utils/seasonalPicks.ts'
import { dailyNumber } from '../src/utils/crossword.ts'
import { dayNumber, dailyAnswer as wordleAnswer } from '../src/utils/koreanWordle.ts'
import { dailyAnswer as baseballAnswer } from '../src/utils/numberBaseball.ts'

const menu = readFileSync(new URL('../src/config/menuConfig.ts', import.meta.url), 'utf8')
const inMenu = (href: string) => menu.includes(`href: '${href}'`)
const home = readFileSync(new URL('../src/components/HomePage.tsx', import.meta.url), 'utf8')

// 2026-10-04 12:00 KST
const NOW = Date.UTC(2026, 9, 4, 3)
const T = dayNumber(NOW) // 2026-01-01 기준 회차 (크로스워드만 다른 기준)
const C = dailyNumber(NOW)

const run = (store: Record<string, unknown>, now = NOW) => {
  const res = readDailyPuzzles(now, k => (k in store ? (typeof store[k] === 'string' ? store[k] as string : JSON.stringify(store[k])) : null))
  return Object.fromEntries(res.map(r => [r.href, { done: r.doneToday, streak: r.streak }]))
}

// 빈 저장소: 전부 미완료, 연속 0
{
  const r = run({})
  assert.equal(Object.keys(r).length, 7)
  for (const href of Object.keys(r)) {
    assert.ok(inMenu(href), `menuConfig에 없음: ${href}`)
    assert.ok(home.includes(`'${href}'`), `HomePage DAILY_PUZZLES에 없음: ${href}`)
    assert.deepEqual(r[href], { done: false, streak: 0 }, href)
  }
}

// 게임별 실제 기록 형식으로 "어제·그제 + 오늘 완료"
const wordleWin = (d: number) => ({ guesses: [wordleAnswer(d)] })
const baseballWin = (d: number) => ({ guesses: [baseballAnswer(d)], peeks: [] })
const full = {
  'crossword-daily-v1': { [C - 2]: { time: 90, hints: 0 }, [C - 1]: { time: 80, hints: 1 }, [C]: { time: 70, hints: 0 } },
  'hangman-daily-v1': {
    [T - 2]: { guesses: [], wrong: 0, status: 'won' }, [T - 1]: { guesses: [], wrong: 1, status: 'won' }, [T]: { guesses: [], wrong: 7, status: 'lost' },
  },
  'koreanWordle-daily-v1': { [T - 2]: wordleWin(T - 2), [T - 1]: wordleWin(T - 1), [T]: wordleWin(T) },
  'picross-daily': { [T - 2]: { 5: { time: 30, mistakes: 0, rows: [] } }, [T - 1]: { 10: { time: 90, mistakes: 1, rows: [] } }, [T]: { 5: { time: 20, mistakes: 0, rows: [] } } },
  'toolhub-minesweeper-daily': { [T - 2]: { won: true, ms: 1, progress: 1 }, [T - 1]: { won: true, ms: 1, progress: 1 }, [T]: { won: true, ms: 1, progress: 1 } },
  'number-baseball-daily-v1': { [T - 2]: baseballWin(T - 2), [T - 1]: baseballWin(T - 1), [T]: baseballWin(T) },
  'typing-test-daily-v1': { [T - 2]: { best: 300, acc: 98, tries: 1 }, [T - 1]: { best: 310, acc: 97, tries: 2 }, [T]: { best: 320, acc: 99, tries: 1 } },
}
{
  const r = run(full)
  for (const href of Object.keys(r)) assert.equal(r[href].done, true, href)
  // 행맨은 오늘 졌으니 연속 0, 나머지는 3일
  assert.deepEqual(Object.fromEntries(Object.entries(r).map(([h, v]) => [h, v.streak])), {
    '/crossword': 3, '/hangman': 0, '/korean-wordle': 3, '/picross': 3, '/minesweeper': 3, '/number-baseball': 3, '/typing-test': 3,
  })
}

// 오늘 진행 중(미완료)이면 doneToday=false, 연속은 어제까지 유지
{
  const r = run({
    'hangman-daily-v1': { [T - 1]: { guesses: [], wrong: 0, status: 'won' }, [T]: { guesses: ['ㄱ'], wrong: 0, status: 'playing' } },
    'koreanWordle-daily-v1': { [T - 1]: wordleWin(T - 1), [T]: { guesses: ['가가'] } },
    'number-baseball-daily-v1': { [T - 1]: baseballWin(T - 1), [T]: { guesses: ['0000'], peeks: [] } },
    'picross-daily': { [T - 1]: { 5: { time: 1, mistakes: 0, rows: [] } }, [T]: {} },
  })
  for (const h of ['/hangman', '/korean-wordle', '/number-baseball', '/picross']) assert.deepEqual(r[h], { done: false, streak: 1 }, h)
}

// KST 자정: 10-04 기록만 있을 때 10-05 00:30 KST(= UTC 10-04 15:30)엔 미완료 + 연속 1
{
  const r = run(full, Date.UTC(2026, 9, 4, 15, 30))
  assert.deepEqual(r['/crossword'], { done: false, streak: 3 })
  assert.deepEqual(r['/typing-test'], { done: false, streak: 3 })
  // UTC 10-04 14:59 = KST 23:59 → 아직 같은 날
  assert.equal(run(full, Date.UTC(2026, 9, 4, 14, 59))['/minesweeper'].done, true)
}

// 깨진 값: 예외 없이 미완료
{
  const r = run({
    'crossword-daily-v1': 'not json', 'hangman-daily-v1': '[1,2]', 'koreanWordle-daily-v1': { [T]: { guesses: 'x' } },
    'number-baseball-daily-v1': { [T]: null }, 'picross-daily': 'null', 'toolhub-minesweeper-daily': '42', 'typing-test-daily-v1': '"s"',
  })
  for (const href of Object.keys(r)) assert.equal(r[href].done, false, href)
  assert.equal(r['/crossword'].streak, null)
  assert.equal(r['/number-baseball'].streak, null) // null 기록 → 통계 계산 예외 → 알 수 없음
}

// ── 시즌 카드 ──
const kst = (ymd: string, hh = 12) => new Date(Date.parse(`${ymd}T${String(hh).padStart(2, '0')}:00:00+09:00`))
const picks = (ymd: string, hh?: number) => seasonalPicks(kst(ymd, hh)).map(p => `${p.key}:${p.n}`)

assert.deepEqual(picks('2026-10-04'), ['csatDday:46', 'cardDeduction:27'])
assert.deepEqual(picks('2026-08-10'), [])                         // D-101
assert.deepEqual(picks('2026-08-11'), ['csatDday:100'])
assert.deepEqual(picks('2026-11-18', 23), ['csatDday:1', 'yearEndPre:43'])
assert.deepEqual(picks('2026-11-19', 0), ['csatToday:0', 'csatGrade:21']) // KST 자정 직후
assert.deepEqual(picks('2026-12-10'), ['csatGrade:0', 'yearEndPre:21'])
assert.deepEqual(picks('2026-12-11'), ['yearEndPre:20', 'newYear:30'])
assert.deepEqual(picks('2027-01-05'), ['yearEnd:54', 'newYear:5'])
assert.deepEqual(picks('2027-01-11'), ['yearEnd:48'])
assert.deepEqual(picks('2027-01-20'), ['carTaxPrepay:12', 'yearEnd:39']) // 2027-01-31 일요일 → 연납 마감 2/1
assert.deepEqual(picks('2027-01-28'), ['seollal:11', 'carTaxPrepay:4'])  // 설 2027-02-07
assert.deepEqual(picks('2027-02-09'), ['yearEnd:19'])
assert.deepEqual(picks('2027-05-20'), ['incomeTax:11'])
assert.deepEqual(picks('2027-07-01'), [])
assert.deepEqual(picks('2026-09-20'), ['chuseok:6', 'csatDday:60']) // 추석(09-25)이 수능보다 우선
assert.deepEqual(picks('2031-09-20'), [])                         // 음력 데이터 없는 해: 조용히 없음
assert.equal(seasonalPicks(kst('2026-11-19'), 1).length, 1)
// UTC로는 11-18 15:00 = KST 11-19 00:00
assert.equal(seasonalPicks(new Date(Date.UTC(2026, 10, 18, 15)))[0].key, 'csatToday')

// ── 다가오는 일정 (카드에 붙은 일정은 빼고, 카드와 합쳐 3개까지) ──
const due = (ymd: string) => { const p = seasonalPicks(kst(ymd)); return upcomingDeadlines(kst(ymd), p).map(d => `${d.key}:${d.n}`) }
assert.deepEqual(seasonalPicks(kst('2026-10-04'))[0].due, { key: 'csat', date: '2026-11-19' })
assert.deepEqual(due('2026-10-04'), ['jongbu:72'])                      // 수능은 카드에 붙음, 카드 2개 + 1줄
assert.deepEqual(due('2026-11-20'), ['jongbu:25'])                      // 카드 2개 + 1줄
assert.deepEqual(due('2026-12-20'), ['hometown:11'])                    // 12/31 고향사랑기부 마감이 1/15 간소화보다 먼저
assert.deepEqual(due('2027-01-20'), [])                                 // 연납 마감은 카드에 붙음
assert.deepEqual(due('2027-05-20'), ['carTaxLumpStart:27'])
assert.deepEqual(due('2027-06-20'), ['carTaxLumpDue:10'])
assert.deepEqual(upcomingDeadlines(kst('2026-12-14')).map(d => d.key), ['jongbu', 'yearEnd', 'hometown'])

// 모든 규칙의 href가 실제 메뉴에 있음
for (const d of ['2026-10-04', '2026-11-19', '2026-12-20', '2027-01-20', '2027-01-28', '2027-05-20', '2026-09-20']) {
  for (const p of [...seasonalPicks(kst(d)), ...upcomingDeadlines(kst(d))]) assert.ok(inMenu(p.href), `menuConfig에 없음: ${p.href}`)
}

console.log('check-daily-puzzles: OK')
