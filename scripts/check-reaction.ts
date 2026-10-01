// 반응속도 로직 회귀 체크: node scripts/check-reaction.ts
import { topPercent, tierOf, summarize, outlierIdx, sanitizeHistory, parseVs } from '../src/utils/reaction.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}

// 분포: 중앙값 255ms = 상위 50%, 빠를수록 상위 % 작아짐, 1~99 클램프
eq(topPercent(255), 50, '중앙값')
eq(topPercent(200), 11, '200ms')
eq(topPercent(180), 4, '180ms')
eq(topPercent(300), 79, '300ms')
eq(topPercent(80), 1, '하한 클램프')
eq(topPercent(900), 99, '상한 클램프')
eq([150, 200, 250, 300, 400].map(topPercent).every((v, i, a) => i === 0 || v >= a[i - 1]), true, '단조 증가')

// 등급 경계
eq([179, 180, 209, 210, 239, 240, 279, 280, 329, 330, 600].map(tierOf),
  ['t1', 't2', 't2', 't3', 't3', 't4', 't4', 't5', 't5', 't6', 't6'], '등급 경계')

// 요약
eq(summarize([250, 200, 300, 220, 230]), { avg: 240, best: 200, worst: 300, median: 230, sd: 34 }, '요약 홀수')
eq(summarize([200, 300])?.median, 250, '요약 짝수 중앙값')
eq(summarize([]), null, '빈 배열')

// 이상치: 중앙값 230, 450ms는 1.5배 이상 + 100ms 이상 차이
eq(outlierIdx([230, 220, 450, 240, 225]), [2], '이상치')
eq(outlierIdx([230, 220, 320, 240, 225]), [], '조금 느린 건 이상치 아님')

// 히스토리 검증
eq(sanitizeHistory([{ t: 1, avg: 250, best: 210, median: 245, dev: 'mouse' }, { t: 2, avg: 50, best: 40, median: 45, dev: 'mouse' }, { t: 3, avg: 250, best: 210, median: 245, dev: 'x' }, null]).length, 1, '히스토리 검증')
eq(sanitizeHistory('bad'), [], '히스토리 손상')
eq(sanitizeHistory(Array.from({ length: 60 }, (_, i) => ({ t: i, avg: 250, best: 210, median: 245, dev: 'touch' }))).length, 50, '히스토리 최대 50')

// 공유 링크 vs
eq([parseVs('245'), parseVs(null), parseVs('abc'), parseVs('50'), parseVs('245.5')], [245, null, null, null, null], 'vs 파라미터')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-reaction: all passed')
