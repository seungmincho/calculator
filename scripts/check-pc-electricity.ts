// PC 전기요금 회귀 체크: node scripts/check-pc-electricity.ts
import { monthlyBill, marginalCost, yearlyMarginal, pcMonthlyKwh } from '../src/utils/pcElectricity.ts'
let fail = 0
const eq = (name: string, got: number, want: number) => { if (Math.abs(got - want) > 0.01) { fail++; console.log('FAIL', name, got, '!=', want) } }

// 300kWh 일반: 기본 1600 + 200*120 + 100*214.6 = 47060, 기후 2700, 연료 1500 → 51260; 부가세 5126; 기금 1384.02→1380
const b = monthlyBill(300)
eq('bill300.tier', b.tier, 2); eq('bill300.total', b.total, 51260 + 5126 + 1380)
// 하계 300kWh는 1단계
eq('summer300.tier', monthlyBill(300, 'summer').tier, 1)
eq('zero', monthlyBill(0).total, 910 + 91 + 20)
// 한계비용: 190→210kWh (1→2단계) 는 단독 20kWh 요금보다 훨씬 큼
const m = marginalCost(190, 20)
if (m.before.tier !== 1 || m.after.tier !== 2) { fail++; console.log('FAIL tier move') }
if (m.added <= monthlyBill(20).total - monthlyBill(0).total) { fail++; console.log('FAIL marginal > standalone') }
// 3단계 가구 +100kWh: 전력량 307.3+기후9+연료5 = 321.3원/kWh → 32130 → 부가세·기금 가산
eq('tier3 add', marginalCost(500, 100).added, marginalCost(500, 100).after.total - monthlyBill(500).total)
if (Math.abs(marginalCost(500, 100).added - 32130 * 1.127) > 20) { fail++; console.log('FAIL tier3 marginal', marginalCost(500, 100).added) }
// 연간 = 하계 2 + 일반 10
eq('yearly', yearlyMarginal(350, 50), marginalCost(350, 50, 'summer').added * 2 + marginalCost(350, 50).added * 10)
// kWh: 400W, 게임 3h(85%) + 작업 2h(50%), 30일, 효율 100% → 400*(2.55+1)*30/1000 = 42.6
eq('kwh', pcMonthlyKwh(400, { gaming: 3, work: 2, idle: 0, days: 30 }), 42.6)
eq('kwh psu', pcMonthlyKwh(400, { gaming: 3, work: 2, idle: 0, days: 30 }, 0.9), 42.6 / 0.9)
console.log(fail ? `${fail} failed` : 'all passed'); if (fail) process.exit(1)
