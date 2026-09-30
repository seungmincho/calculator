// utils/salaryInsights.ts self-check — `node scripts/check-salary-insights.mjs`
import { build } from 'esbuild'

const { outputFiles: [out] } = await build({
  entryPoints: [new URL('../src/utils/salaryInsights.ts', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')],
  bundle: true, format: 'esm', write: false, logLevel: 'silent',
})
const { topPercent, simulateRaise, hourlyNet, percentileBelow, nextMilestone, shareBetween } = await import('data:text/javascript;base64,' + Buffer.from(out.text).toString('base64'))

const eq = (a, b, m) => { if (a !== b) throw new Error(`${m}: ${a} !== ${b}`) }
eq(topPercent(35_000_000), 50, '중위 3,500만 = 상위 50%')
eq(topPercent(85_000_000), 10, '8,500만 = 상위 10%')
eq(topPercent(50_000_000), 30, '5,000만 = 상위 30%')
eq(topPercent(1_000_000_000), 0.1, '10억 = 최소 0.1%')
if (!(topPercent(4_000_000) === 95)) throw new Error('400만 = 상위 95%')
if (!(topPercent(60_000_000) < topPercent(50_000_000))) throw new Error('연봉↑ 상위%↓')

// SalaryRank: 연령대 등 다른 분포표도 같은 보간, 최상단 초과 = 남은 구간 중간
eq(percentileBelow(1_000_000_000, [[10, 500], [99, 12000]]), 99.5, '사용자 표 최상단 초과')
eq(percentileBelow(0), 0, '0원 = 하위 0%')
const m = nextMilestone(40_000_000)
eq(m.gap, 2_000_000, '4,000만 → 4,200만까지 200만'); eq(m.top, 40, '4,200만 = 상위 40%')
eq(nextMilestone(600_000_000), null, '5억 이상 = 다음 구간 없음')
eq(shareBetween(0, 20000), 99, '0~2억 = 99%')

const r = simulateRaise(50_000_000, 10, { nonTaxableMonthly: 0, dependents: 1, children: 0 })
console.log('5,000만 +10% →', r)
if (!(r.monthlyGain > 0 && r.netGainPct < 10 && r.keepPct > 50 && r.keepPct < 100)) throw new Error('인상 시뮬 범위 이탈')
eq(simulateRaise(50_000_000, 0, {}).monthlyGain, 0, '0% 인상 = 증가 0')
eq(hourlyNet(2_090_000), 10_000, '209만 / 209h')
console.log('OK')
