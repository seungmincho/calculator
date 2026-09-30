// utils/salaryInsights.ts self-check — `node scripts/check-salary-insights.mjs`
import { build } from 'esbuild'

const { outputFiles: [out] } = await build({
  entryPoints: [new URL('../src/utils/salaryInsights.ts', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')],
  bundle: true, format: 'esm', write: false, logLevel: 'silent',
})
const { topPercent, simulateRaise, hourlyNet } = await import('data:text/javascript;base64,' + Buffer.from(out.text).toString('base64'))

const eq = (a, b, m) => { if (a !== b) throw new Error(`${m}: ${a} !== ${b}`) }
eq(topPercent(35_000_000), 50, '중위 3,500만 = 상위 50%')
eq(topPercent(85_000_000), 10, '8,500만 = 상위 10%')
eq(topPercent(50_000_000), 30, '5,000만 = 상위 30%')
eq(topPercent(1_000_000_000), 0.1, '10억 = 최소 0.1%')
if (!(topPercent(4_000_000) === 95)) throw new Error('400만 = 상위 95%')
if (!(topPercent(60_000_000) < topPercent(50_000_000))) throw new Error('연봉↑ 상위%↓')

const r = simulateRaise(50_000_000, 10, { nonTaxableMonthly: 0, dependents: 1, children: 0 })
console.log('5,000만 +10% →', r)
if (!(r.monthlyGain > 0 && r.netGainPct < 10 && r.keepPct > 50 && r.keepPct < 100)) throw new Error('인상 시뮬 범위 이탈')
eq(simulateRaise(50_000_000, 0, {}).monthlyGain, 0, '0% 인상 = 증가 0')
eq(hourlyNet(2_090_000), 10_000, '209만 / 209h')
console.log('OK')
