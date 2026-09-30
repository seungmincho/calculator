// 단어 맞추기 로직 회귀 체크: node scripts/check-hangman.ts
import { decompose, dayNumber, msToNextDay, dailyWord, computeStats, shareText, keyToJamo, KEY_ROWS, ALL_JAMO, WORD_BANK, CATEGORIES, gameStatus, wordJamos } from '../src/utils/hangman.ts'

let fail = 0
const eq = (name: string, a: unknown, b: unknown) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', name, JSON.stringify(a), '!=', JSON.stringify(b)) }
}

eq('decompose 닭', decompose('닭'), ['ㄷ', 'ㅏ', 'ㄹ', 'ㄱ'])
eq('decompose 과', decompose('과'), ['ㄱ', 'ㅘ'])
eq('decompose 값', decompose('값'), ['ㄱ', 'ㅏ', 'ㅂ', 'ㅅ'])

// KST 자정 경계: 2026-01-01 00:00 KST = 2025-12-31 15:00 UTC
const kstMidnight = Date.UTC(2025, 11, 31, 15)
eq('day #1', dayNumber(kstMidnight), 1)
eq('day #0 1ms before', dayNumber(kstMidnight - 1), 0)
eq('day 2026-09-30 12:00 KST', dayNumber(Date.UTC(2026, 8, 30, 3)), 273)
eq('countdown at midnight', msToNextDay(kstMidnight), 86_400_000)
eq('countdown 1ms before', msToNextDay(kstMidnight - 1), 1)

// 모든 단어: 한글 음절만, 모든 자모가 화면 키보드에 있음(= 풀 수 있음), 중복 없음
const keys = new Set(KEY_ROWS.flat())
eq('keyboard covers all jamo', keys.size, ALL_JAMO.size)
const all = CATEGORIES.flatMap(c => [...WORD_BANK[c]])
eq('no duplicate words', new Set(all).size, all.length)
for (const w of all) {
  if (!/^[가-힣]+$/.test(w)) { fail++; console.log('FAIL non-hangul', w) }
  for (const j of wordJamos(w)) if (!keys.has(j)) { fail++; console.log('FAIL unguessable', w, j) }
  eq(`solvable ${w}`, gameStatus(w, [...wordJamos(w)], 7), 'won')
}

// 오늘의 단어: 결정적 + 한 주기 동안 중복 없음
eq('deterministic', dailyWord(273), dailyWord(273))
const cycle = new Set(Array.from({ length: all.length }, (_, k) => dailyWord(k + 1).word))
eq('no repeat within cycle', cycle.size, all.length)
const cycle2 = new Set(Array.from({ length: all.length }, (_, k) => dailyWord(all.length + k + 1).word))
eq('no repeat within cycle 2', cycle2.size, all.length)

// 통계
const s = computeStats({
  1: { guesses: [], wrong: 2, status: 'won' },
  2: { guesses: [], wrong: 0, status: 'won' },
  3: { guesses: [], wrong: 7, status: 'lost' },
  5: { guesses: [], wrong: 1, status: 'won' },
  6: { guesses: [], wrong: 1, status: 'won' },
  7: { guesses: [], wrong: 1, status: 'won' },
  8: { guesses: ['ㄱ'], wrong: 0, status: 'playing' },
}, 8, 7)
eq('played', s.played, 6)
eq('winRate', s.winRate, 83)
eq('current (today unfinished keeps streak)', s.current, 3)
eq('maxStreak', s.maxStreak, 3)
eq('dist', s.dist, [1, 3, 1, 0, 0, 0, 0])
eq('streak broken by missed day', computeStats({ 1: { guesses: [], wrong: 0, status: 'won' } }, 3, 7).current, 0)
eq('streak 0 after loss today', computeStats({ 1: { guesses: [], wrong: 0, status: 'won' }, 2: { guesses: [], wrong: 7, status: 'lost' } }, 2, 7).current, 0)

eq('share', shareText('툴허브 단어맞추기 #1', '사과', ['ㅅ', 'ㅂ', 'ㅏ', 'ㄱ', 'ㅘ'], true, 7, 'https://x'),
  '툴허브 단어맞추기 #1 1/7\n🟦⬛🟦🟦🟦\nhttps://x')

eq('key ime on', keyToJamo('ㅎ', 'KeyG', false), 'ㅎ')
eq('key ime off', keyToJamo('g', 'KeyG', false), 'ㅎ')
eq('key shift', keyToJamo('R', 'KeyR', true), 'ㄲ')
eq('key shift no double', keyToJamo('A', 'KeyA', true), 'ㅁ')
eq('key digit', keyToJamo('1', 'Digit1', false), null)

console.log(fail ? `${fail} failed` : 'all passed'); if (fail) process.exit(1)
