// 홈 "오늘의 퍼즐": 각 게임이 localStorage에 남긴 오늘의 기록을 읽어 완료 여부·연속 일수를 돌려준다.
// 날짜 계산·연속 기록은 각 게임 util을 그대로 재사용 (모두 KST 자정 기준 회차 번호).
// 단어 은행이 커서 홈에서는 마운트 후 dynamic import로만 불러올 것.
// 회귀 체크: node scripts/check-daily-puzzles.ts
import { dailyNumber, computeStats as crosswordStats } from './crossword.ts'
import { dayNumber as hangmanDay, computeStats as hangmanStats } from './hangman.ts'
import { dayNumber as wordleDay, dailyAnswer as wordleAnswer, statusOf, computeStats as wordleStats } from './koreanWordle.ts'
import { dayNumber as picrossDay, computeStreak } from './picross.ts'
import { dayNumber as minesDay, dailyStats } from './minesweeper.ts'
import {
  dayNumber as baseballDay, dailyAnswer as baseballAnswer, status as baseballStatus, computeStats as baseballStats, DAILY,
} from './numberBaseball.ts'
import { dayNumber as typingDay } from './typingTest.ts'

export interface PuzzleStatus { href: string; doneToday: boolean; streak: number | null }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Recs = Record<string, any>

const PUZZLES: { href: string; key: string; read: (r: Recs, now: number) => { done: boolean; streak: number } }[] = [
  { href: '/crossword', key: 'crossword-daily-v1', read: (r, now) => {
    const d = dailyNumber(now)
    return { done: !!r[d], streak: crosswordStats(r, d).streak }
  } },
  { href: '/hangman', key: 'hangman-daily-v1', read: (r, now) => {
    const d = hangmanDay(now)
    return { done: r[d]?.status === 'won' || r[d]?.status === 'lost', streak: hangmanStats(r, d, 0).current }
  } },
  { href: '/korean-wordle', key: 'koreanWordle-daily-v1', read: (r, now) => {
    const d = wordleDay(now)
    // ponytail: 구버전 누적 통계(koreanWordle_stats*)의 연속 기록은 합산 안 함 — 게임 화면과 다를 수 있음
    return { done: !!r[d] && statusOf(r[d].guesses, wordleAnswer(d)) !== 'playing', streak: wordleStats(r, d).current }
  } },
  { href: '/picross', key: 'picross-daily', read: (r, now) => {
    const d = picrossDay(now)
    return { done: !!r[d] && Object.keys(r[d]).length > 0, streak: computeStreak(r, d).current }
  } },
  // 지뢰찾기는 끝난 판(승·패)만 기록
  { href: '/minesweeper', key: 'toolhub-minesweeper-daily', read: (r, now) => {
    const d = minesDay(now)
    return { done: !!r[d], streak: dailyStats(r, d).current }
  } },
  { href: '/number-baseball', key: 'number-baseball-daily-v1', read: (r, now) => {
    const d = baseballDay(now)
    return { done: !!r[d] && baseballStatus(baseballAnswer(d), r[d], DAILY.max) !== 'playing', streak: baseballStats(r, d).current }
  } },
  // 타자 연습 연속 기록: TypingTest.tsx의 streak()와 같은 규칙 (컴포넌트 내부 함수라 여기 복사)
  { href: '/typing-test', key: 'typing-test-daily-v1', read: (r, now) => {
    const today = typingDay(now)
    let d = r[today] ? today : today - 1, streak = 0
    while (r[d]) { streak++; d-- }
    return { done: !!r[today], streak }
  } },
]

export function readDailyPuzzles(
  now = Date.now(),
  getItem: (key: string) => string | null = k => localStorage.getItem(k),
): PuzzleStatus[] {
  return PUZZLES.map(({ href, key, read }) => {
    try {
      const v = JSON.parse(getItem(key) || '{}')
      const recs: Recs = v && typeof v === 'object' && !Array.isArray(v) ? v : {}
      const { done, streak } = read(recs, now)
      return { href, doneToday: done, streak }
    } catch {
      return { href, doneToday: false, streak: null }
    }
  })
}
