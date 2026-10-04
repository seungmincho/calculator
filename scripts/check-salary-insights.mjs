// utils/salaryInsights.ts self-check — `node scripts/check-salary-insights.mjs`
import { build } from 'esbuild'

const { outputFiles: [out] } = await build({
  entryPoints: [new URL('../src/utils/salaryInsights.ts', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')],
  bundle: true, format: 'esm', write: false, logLevel: 'silent',
})
const { topPercent, simulateRaise, hourlyNet, percentileBelow, nextMilestone, shareBetween, NTS_INCOME_PERCENTILES: T, NTS_SOURCE_YEAR } = await import('data:text/javascript;base64,' + Buffer.from(out.text).toString('base64'))

const eq = (a, b, m) => { if (a !== b) throw new Error(`${m}: ${a} !== ${b}`) }
// 국세청 근로소득 천분위 자료(2024년 귀속, data.go.kr/data/15082063) 분위 평균에서 추정한 경계
eq(NTS_SOURCE_YEAR, 2024, '기준 연도')
eq(T.length, 107, '하위 1~99% + 99.1~99.8%')
if (!T.every((r, i) => i === 0 || (r[0] > T[i - 1][0] && r[1] > T[i - 1][1]))) throw new Error('표 오름차순')
// 경계는 이웃 분위 평균 사이: 중위 = 상위 51% 분위 평균 3,358만 ~ 상위 50% 분위 평균 3,417만
const median = T.find(([p]) => p === 50)[1]
if (!(median > 3358 && median < 3417)) throw new Error(`중위 ${median}만이 분위 평균 3,358~3,417만 밖`)
eq(topPercent(median * 10000), 50, '중위 = 상위 50%')
eq(topPercent(197_150_000), 1, '1억9,715만 = 상위 1%')
// 1억은 상위 8% 분위 평균(9,925만)과 상위 7% 분위 평균(1억456만) 사이 → 상위 6.5~7.5%
if (!(topPercent(100_000_000) > 6.5 && topPercent(100_000_000) < 7.5)) throw new Error(`1억 = 상위 ${topPercent(100_000_000)}%`)
// 400만은 상위 95% 분위 평균(384만)과 상위 94% 분위 평균(456만) 사이 → 상위 93.5~94.5%
if (!(topPercent(4_000_000) > 93.5 && topPercent(4_000_000) < 94.5)) throw new Error(`400만 = 상위 ${topPercent(4_000_000)}%`)
eq(topPercent(1_000_000_000), 0.1, '10억 = 최소 0.1%')
if (!(topPercent(60_000_000) < topPercent(50_000_000))) throw new Error('연봉↑ 상위%↓')

// SalaryRank: 연령대 등 다른 분포표도 같은 보간, 최상단 초과 = 남은 구간 중간
eq(percentileBelow(1_000_000_000, [[10, 500], [99, 12000]]), 99.5, '사용자 표 최상단 초과')
eq(percentileBelow(0), 0, '0원 = 하위 0%')
const m = nextMilestone(40_000_000)
eq(m.gap, 610_000, '4,000만 → 4,061만까지 61만'); eq(m.top, 40, '4,061만 = 상위 40%')
eq(nextMilestone(600_000_000), null, '표 최상단(약 3.9억) 이상 = 다음 구간 없음')
eq(shareBetween(0, 100000), 99.9, '0~10억 = 99.9% (최상단 초과 = 남은 0.2%의 중간)')

const r = simulateRaise(50_000_000, 10, { nonTaxableMonthly: 0, dependents: 1, children: 0 })
console.log('5,000만 +10% →', r)
if (!(r.monthlyGain > 0 && r.netGainPct < 10 && r.keepPct > 50 && r.keepPct < 100)) throw new Error('인상 시뮬 범위 이탈')
eq(simulateRaise(50_000_000, 0, {}).monthlyGain, 0, '0% 인상 = 증가 0')
eq(hourlyNet(2_090_000), 10_000, '209만 / 209h')
console.log('OK')
