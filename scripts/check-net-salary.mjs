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
console.log('OK')
