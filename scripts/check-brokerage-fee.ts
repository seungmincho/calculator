// 중개보수(복비) 회귀 체크: node scripts/check-brokerage-fee.ts
import { calcFee, tradeAmount, saleFee, type FeeInput } from '../src/utils/brokerageFee.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown) => {
  if (got !== want) { fail++; console.log('FAIL', name, got, '!=', want) }
}
const E = 100_000_000
const c = (o: Partial<FeeInput>) => calcFee({ deal: 'sale', prop: 'house', deposit: 6 * E, vat: 'none', ...o })

// 매매: 구간 경계 (미만 기준) + 한도액
eq('sale 3천만 0.6%', c({ deposit: 30_000_000 }).fee, 180_000)
eq('sale 4900만 cap 25만', c({ deposit: 49_000_000 }).fee, 250_000)
eq('sale 5천만 → 0.5%', c({ deposit: 50_000_000 }).fee, 250_000)
eq('sale 1.9억 cap 80만', c({ deposit: 190_000_000 }).fee, 800_000)
eq('sale 2억 → 0.4%', c({ deposit: 2 * E }).fee, 800_000)
eq('sale 6억', c({}).fee, 2_400_000)
eq('sale 9억 → 0.5%', c({ deposit: 9 * E }).fee, 4_500_000)
eq('sale 12억 → 0.6%', c({ deposit: 12 * E }).fee, 7_200_000)
eq('sale 15억 → 0.7%', c({ deposit: 15 * E }).fee, 10_500_000)

// 임대차
eq('jeonse 4천만 0.5% cap 20만', c({ deal: 'jeonse', deposit: 40_000_000 }).fee, 200_000)
eq('jeonse 3천만', c({ deal: 'jeonse', deposit: 30_000_000 }).fee, 150_000)
eq('jeonse 9천만 cap 30만', c({ deal: 'jeonse', deposit: 90_000_000 }).fee, 300_000)
eq('jeonse 3억 0.3%', c({ deal: 'jeonse', deposit: 3 * E }).fee, 900_000)
eq('jeonse 6억 0.4%', c({ deal: 'jeonse', deposit: 6 * E }).fee, 2_400_000)
eq('jeonse 15억 0.6%', c({ deal: 'jeonse', deposit: 15 * E }).fee, 9_000_000)

// 월세 환산: 보증금 + 월세×100, 5천만 미만이면 ×70
eq('monthly 1000/30 → ×70', tradeAmount('monthly', 10_000_000, 300_000), 31_000_000)
eq('monthly 1000/40 → 5천만 ×100', tradeAmount('monthly', 10_000_000, 400_000), 50_000_000)
eq('monthly 5000/100 → 1.5억', tradeAmount('monthly', 50_000_000, 1_000_000), 150_000_000)
eq('monthly 5000/100 fee', c({ deal: 'monthly', deposit: 50_000_000, rent: 1_000_000 }).fee, 450_000)
eq('monthly 500/30 fee', c({ deal: 'monthly', deposit: 5_000_000, rent: 300_000 }).fee, 130_000) // 2600만 × 0.5%
eq('sale ignores rent', tradeAmount('sale', 3 * E, 1_000_000), 3 * E)

// 오피스텔·주택 외
eq('officetel sale 0.5%', c({ prop: 'officetel', deposit: 3 * E }).fee, 1_500_000)
eq('officetel lease 0.4%', c({ prop: 'officetel', deal: 'jeonse', deposit: 2 * E }).fee, 800_000)
eq('officetelEtc 0.9%', c({ prop: 'officetelEtc', deal: 'jeonse', deposit: 2 * E }).fee, 1_800_000)
eq('nonHouse 0.9%', saleFee(10 * E, 'nonHouse'), 9_000_000)

// 부가세: 일반 10%, 간이 4%
let r = c({ vat: 'general' })
eq('vat general', r.vat, 240_000); eq('total general', r.total, 2_640_000)
eq('vat simple', c({ vat: 'simple' }).vat, 96_000)

// 협의 요율: 상한 초과 불가, 한도액은 그대로
r = c({ rate: 0.003 })
eq('nego 0.3%', r.fee, 1_800_000); eq('nego maxFee kept', r.maxFee, 2_400_000)
eq('nego clamp', c({ rate: 0.01 }).fee, 2_400_000)
eq('nego under cap bracket', c({ deposit: 49_000_000, rate: 0.005 }).fee, 245_000)
eq('negative → 0', c({ deposit: -1 }).fee, 0)

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('brokerage-fee: all passed')
