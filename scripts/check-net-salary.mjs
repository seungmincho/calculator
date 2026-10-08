// utils/netSalary.ts self-check — `node scripts/check-net-salary.mjs`
import { build } from 'esbuild'

const { outputFiles: [out] } = await build({
  entryPoints: [new URL('../src/utils/netSalary.ts', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')],
  bundle: true, format: 'esm', write: false, logLevel: 'silent',
})
const { calculateNetSalary } = await import('data:text/javascript;base64,' + Buffer.from(out.text).toString('base64'))

const r = calculateNetSalary(50_000_000)
console.log('연봉 5000만 →', r.netMonthly, r.deductions, r.taxInfo)
if (!(r.netMonthly > 3_400_000 && r.netMonthly < 3_650_000)) throw new Error('5000만 실수령 범위 이탈')
if (calculateNetSalary(0) !== null) throw new Error('0 → null 아님')
const fam = calculateNetSalary(50_000_000, { dependents: 3, children: 2 })
if (!(fam.netMonthly > r.netMonthly)) throw new Error('부양가족 증가 시 실수령이 줄어듦')
if (calculateNetSalary(24_000_000).deductions.incomeTax < 0) throw new Error('소득세 음수')
// 비과세가 연봉보다 크면 과세급여·과세표준·세금 모두 0 (근로소득공제는 총급여 = 연봉 − 비과세 기준)
const over = calculateNetSalary(30_000_000, { nonTaxableMonthly: 5_000_000 })
if (over.taxable !== 0 || over.workIncome !== 0 || over.taxInfo.taxableIncome !== 0 || over.taxInfo.annualTaxEstimate !== 0 || over.deductions.total !== 0)
  throw new Error('비과세 > 연봉인데 과세표준·세금이 남음')
// 비과세 0원 = 총급여 그대로 → 비과세 20만과 근로소득금액 차이는 공제율(15%)만큼 줄어든 240만 × 0.85
if (calculateNetSalary(30_000_000, { nonTaxableMonthly: 0 }).workIncome - calculateNetSalary(30_000_000).workIncome !== 2_400_000 * 0.85)
  throw new Error('근로소득금액이 총급여 기준이 아님')
if (calculateNetSalary(30_000_000, { nonTaxableMonthly: -1_000_000 }).taxable !== 30_000_000) throw new Error('음수 비과세가 과세급여를 늘림')
const huge = calculateNetSalary(99_999_999_999_999)
if (!Number.isFinite(huge.netMonthly) || huge.netMonthly <= 0) throw new Error('큰 연봉에서 비정상 값')
console.log('OK')
