// utils/bonusTax.ts self-check — `node scripts/check-bonus-tax.mjs`
import { build } from 'esbuild'

const { outputFiles: [out] } = await build({
  entryPoints: [new URL('../src/utils/bonusTax.ts', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')],
  bundle: true, format: 'esm', write: false, logLevel: 'silent',
})
const { calculateBonusTax } = await import('data:text/javascript;base64,' + Buffer.from(out.text).toString('base64'))

const assert = (c, m) => { if (!c) throw new Error(m) }
const r = calculateBonusTax({ salary: 50_000_000, bonus: 4_166_000 })
console.log('연봉 5000만 + 성과급 416.6만 →', { now: r.now, final: r.final, settlement: r.settlement, healthLater: r.healthLater })
assert(r.now.nationalPension === 0 && r.final.nationalPension === 0, '성과급에 국민연금 추가 부과')
assert(r.now.healthInsurance === 0 && r.final.healthInsurance > 0, '건강보험은 정산 기준에만')
assert(r.final.incomeTax > 0 && r.final.net < r.bonus && r.final.net > r.bonus * 0.6, '최종 실수령 범위 이탈')
assert(r.now.incomeTax > r.final.incomeTax, '1개월 합산 원천징수가 연간 증가분보다 커야 함')
assert(r.settlement < 0, '연말정산 환급이어야 함')
// 지급대상기간이 길수록 원천징수 감소
const r12 = calculateBonusTax({ salary: 50_000_000, bonus: 4_166_000, period: 12 })
assert(r12.now.incomeTax < r.now.incomeTax, '기간 12개월이 1개월보다 원천징수 적어야 함')
// 성과급 클수록 실수령률 하락(누진)
const big = calculateBonusTax({ salary: 50_000_000, bonus: 30_000_000 })
assert(big.final.net / big.bonus < r.final.net / r.bonus, '누진 미반영')
assert(calculateBonusTax({ salary: 0, bonus: 1 }) === null && calculateBonusTax({ salary: 1e7, bonus: 0 }) === null, 'null 가드')
console.log('OK')
