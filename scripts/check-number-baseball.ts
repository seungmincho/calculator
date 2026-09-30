// 숫자야구 로직 회귀 체크: node scripts/check-number-baseball.ts
import assert from 'node:assert/strict'
import {
  score, allCandidates, filterCandidates, validateGuess, dailyAnswer, randomAnswer, DAILY,
  status, computeStats, gridRow, shareText, cycleMemo, dayNumber, usedTries,
} from '../src/utils/numberBaseball.ts'

// 판정
assert.deepEqual(score('123', '135'), { s: 1, b: 1 })
assert.deepEqual(score('1234', '4321'), { s: 0, b: 4 })
assert.deepEqual(score('1234', '1234'), { s: 4, b: 0 })
assert.deepEqual(score('0123', '5678'), { s: 0, b: 0 })

// 후보 수
assert.equal(allCandidates(3, false).length, 9 * 8 * 7)
assert.equal(allCandidates(4, false).length, 3024)
assert.equal(allCandidates(4, true).length, 5040)
assert.equal(allCandidates(5, true).length, 30240)
assert.ok(allCandidates(4, false).every(c => !c.includes('0') && new Set(c).size === 4))

// 필터링: 정답은 항상 살아남고, 모든 판정과 일치
{
  const secret = '5831'
  const all = allCandidates(4, false)
  const hist = ['1234', '5678', '5813'].map(g => ({ guess: g, ...score(secret, g) }))
  const left = filterCandidates(all, hist)
  assert.ok(left.includes(secret))
  assert.ok(left.length < all.length && left.length > 0)
  for (const c of left) for (const h of hist) assert.deepEqual(score(c, h.guess), { s: h.s, b: h.b })
}

// 검증
assert.equal(validateGuess('12', 3, false, []), 'incomplete')
assert.equal(validateGuess('112', 3, false, []), 'duplicate')
assert.equal(validateGuess('102', 3, false, []), 'zero')
assert.equal(validateGuess('102', 3, true, []), null)
assert.equal(validateGuess('123', 3, false, ['123']), 'repeat')
assert.equal(validateGuess('123', 3, false, []), null)

// 오늘의 숫자: 결정적, 한 주기(3,024일) 동안 중복 없음, 규칙 준수
assert.equal(dailyAnswer(274), dailyAnswer(274))
assert.equal(new Set(Array.from({ length: 3024 }, (_, k) => dailyAnswer(k + 1))).size, 3024)
assert.equal(new Set(Array.from({ length: 3024 }, (_, k) => dailyAnswer(3024 + k + 1))).size, 3024)
assert.notEqual(dailyAnswer(1), dailyAnswer(3025)) // 주기마다 다른 순서(우연 일치 확률 1/3024)
assert.equal(validateGuess(dailyAnswer(274), DAILY.len, DAILY.allowZero, []), null)
assert.equal(dayNumber(Date.UTC(2026, 8, 30, 15)), 274) // 2026-10-01 00:00 KST
assert.equal(validateGuess(randomAnswer(5, true), 5, true, []), null)

// 상태
{
  const s = '1234'
  assert.equal(status(s, { guesses: ['5678'], peeks: [] }, 10), 'playing')
  assert.equal(status(s, { guesses: ['5678', '1234'], peeks: [] }, 10), 'won')
  assert.equal(status(s, { guesses: Array(9).fill('5678'), peeks: ['4321'] }, 10), 'lost')
  assert.equal(usedTries({ guesses: ['1'], peeks: ['2', '3'] }), 3)
  assert.equal(status(s, { guesses: Array(50).fill('5678'), peeks: [] }, 0), 'playing') // 무제한
}

// 통계: 연속·분포·패배
{
  const win = (d: number, pre: number) => ({ guesses: [...Array(pre).fill(dailyAnswer(d) === '1234' ? '5678' : '1234'), dailyAnswer(d)], peeks: [] })
  const lose = (d: number) => ({ guesses: Array(10).fill(dailyAnswer(d) === '1234' ? '5678' : '1234'), peeks: [] })
  const st = computeStats({ 100: win(100, 4), 101: win(101, 2), 102: lose(102), 103: win(103, 4), 104: win(104, 0), 105: { guesses: ['1234'].filter(g => g !== dailyAnswer(105)), peeks: [] } }, 105)
  assert.equal(st.played, 5)
  assert.equal(st.winRate, 80)
  assert.equal(st.current, 2) // 오늘(105) 진행 중 → 어제까지 연속
  assert.equal(st.maxStreak, 2)
  assert.equal(st.losses, 1)
  assert.deepEqual(st.dist, [1, 0, 1, 0, 2, 0, 0, 0, 0, 0])
}

// 공유 그리드: 숫자를 드러내지 않음
assert.equal(gridRow({ s: 1, b: 2 }, 4), '🟩🟨🟨⬜')
{
  const txt = shareText('툴허브 숫자야구 #274 2회', '1234', { guesses: ['5678', '1234'], peeks: [] }, 'https://toolhub.ai.kr/number-baseball/')
  assert.equal(txt, '툴허브 숫자야구 #274 2회\n⬜⬜⬜⬜\n🟩🟩🟩🟩\nhttps://toolhub.ai.kr/number-baseball/')
  assert.ok(!/[5-8]/.test(txt.split('\n').slice(1, 3).join('')))
}

// 메모 순환
assert.equal(cycleMemo(undefined, 3), '   x      ')
assert.equal(cycleMemo(cycleMemo(cycleMemo(cycleMemo(undefined, 0), 0), 0), 0), '          ')
assert.equal(cycleMemo('x', 1), 'xx        ')

console.log('check-number-baseball: OK')
