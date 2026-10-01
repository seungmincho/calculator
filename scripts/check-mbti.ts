// 16유형 테스트 채점 회귀 체크: node scripts/check-mbti.ts
import { QUESTIONS, AXES, scoreAnswers, parseShare, shareQuery, isBorderline, sanitizeAnswers } from '../src/utils/mbti.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}

// 문항 균형: 축당 12, 방향별 6
for (const ax of AXES) {
  const qs = QUESTIONS.filter((q) => q.axis === ax)
  eq([qs.length, qs.filter((q) => q.key === 1).length], [12, 6], `${ax} 균형`)
}

// 모두 "보통"(3) → 전 축 50% 동점 → I/N/F/P
eq(scoreAnswers(Array(48).fill(3)), { type: 'INFP', pct: [50, 50, 50, 50] }, '전부 보통')
// 모두 "매우 그렇다" (동의 편향) → 역문항이 상쇄해 50%
eq(scoreAnswers(Array(48).fill(5)).pct, [50, 50, 50, 50], '전부 동의 → 상쇄')

// 정방향 응답: 첫 글자 쪽 문항 5, 반대 문항 1 → ESTJ 100%
const all = (want: number[]) => QUESTIONS.map((q, i) => (q.key * want[i % 4] > 0 ? 5 : 1))
eq(scoreAnswers(all([1, 1, 1, 1])), { type: 'ESTJ', pct: [100, 100, 100, 100] }, 'ESTJ 극단')
eq(scoreAnswers(all([-1, -1, -1, -1])), { type: 'INFP', pct: [0, 0, 0, 0] }, 'INFP 극단')
eq(scoreAnswers(all([-1, -1, 1, 1])).type, 'INTJ', 'INTJ')

// 축 독립: EI 응답만 바꿔도 다른 축 점수 그대로
const base = all([1, -1, 1, -1])
const flipped = base.map((v, i) => (i % 4 === 0 ? 6 - v : v))
eq([scoreAnswers(base).type, scoreAnswers(flipped).type], ['ENTP', 'INTP'], '축 독립 타입')
eq(scoreAnswers(base).pct.slice(1), scoreAnswers(flipped).pct.slice(1), '축 독립 점수')

// 근소 차이: E 문항 하나만 4 → sum +1 / 24 → 52%, E
const nudge = Array(48).fill(3); nudge[0] = 4
eq(scoreAnswers(nudge), { type: 'ENFP', pct: [52, 50, 50, 50] }, '근소 E')
const nudgeI = Array(48).fill(3); nudgeI[4] = 4 // 4번 = EI 역문항
eq(scoreAnswers(nudgeI).pct[0], 48, '근소 I')

// 미응답은 건너뜀
const partial: (number | null)[] = Array(48).fill(null); partial[0] = 5
eq(scoreAnswers(partial), { type: 'ENFP', pct: [100, 50, 50, 50] }, '부분 응답')

// 경계
eq([isBorderline(50), isBorderline(59), isBorderline(60), isBorderline(41), isBorderline(40)], [true, true, false, true, false], '경계 판정')

// 공유 링크
eq(parseShare('INTJ', '38-45-70-60'), { type: 'INTJ', pct: [38, 45, 70, 60] }, '공유 파싱')
eq(parseShare('intj', null), { type: 'INTJ', pct: null }, '소문자·점수 없음')
eq(parseShare('INTJ', '62-45-70-60'), { type: 'INTJ', pct: null }, '타입과 점수 불일치 → 점수 버림')
eq(parseShare('INTJ', '38-45-70'), { type: 'INTJ', pct: null }, '점수 3개')
eq(parseShare('INTJ', '38-45-170-60'), { type: 'INTJ', pct: null }, '범위 밖')
eq(parseShare('XXXX', '1-1-1-1'), null, '잘못된 타입')
eq(parseShare(null, null, 'ENFP'), { type: 'ENFP', pct: null }, '예전 ?result=')
eq(parseShare(null, null), null, '없음')
eq(shareQuery('INTJ', [38, 45, 70, 60]), 'r=INTJ&s=38-45-70-60', '공유 쿼리')
const rt = scoreAnswers(base)
eq(parseShare(rt.type, rt.pct.join('-')), { type: rt.type, pct: rt.pct }, '왕복')

// 저장값 검증
eq(sanitizeAnswers([1, 2]), null, '길이 틀림')
eq(sanitizeAnswers(Array(48).fill(9))?.every((v) => v === null), true, '범위 밖 → null')
eq(sanitizeAnswers('x'), null, '배열 아님')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-mbti: all passed')
