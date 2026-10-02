// 집 살 때 필요 현금 회귀 체크: node scripts/check-real-estate-cost.ts
import { totalCost, LEGAL_FEE, type CostInput } from '../src/utils/realEstateCost.ts'
import { calcTax, buyExtras } from '../src/utils/acquisitionTax.ts'
import { saleFee } from '../src/utils/brokerageFee.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = typeof want === 'number' ? Math.abs((got as number) - want) < 1e-6 : got === want
  if (!ok) { fail++; console.log('FAIL', name, got, '!=', want) }
}
const E = 100_000_000
const base: CostInput = {
  price: 7 * E, owner: '1', adjusted: true, metro: true, over85: false, relief: 'none',
  loan: 3 * E, rate: 4, years: 30, method: 'equalPayment', brokerVat: true, legal: LEGAL_FEE, other: 2_000_000, income: 60_000_000,
}
const c = (o: Partial<CostInput>) => totalCost({ ...base, ...o })

// 7억 서울 1주택 84㎡, 대출 3억 4% 30년
let r = c({})
eq('tax 1.6667%', r.tax.total, 11_666_900 + 1_166_690)              // 취득세 + 지방교육세, 농특 0
eq('broker 0.4%', r.broker, 2_800_000); eq('vat', r.brokerVat, 280_000)
eq('bond 4.9억×2.6%×5%', r.bond, 637_000); eq('stamp half', r.stamp, 75_000)
eq('registration', r.registration, 637_000 + 75_000 + LEGAL_FEE)
eq('fees', r.fees, 12_833_590 + 2_800_000 + 280_000 + 637_000 + 75_000 + 600_000 + 2_000_000)
eq('equity', r.equity, 4 * E); eq('cash', r.cash, 4 * E + r.fees); eq('ltv', r.ltv, 300 / 7)
eq('monthly 3억 4% 30y', r.monthly, 1_432_246)
eq('dsr', r.dsr, (1_432_246 * 12) / 60_000_000 * 100)

// 기존 utils와 일치: 여러 가격·주택 수
for (const price of [1.5 * E, 5 * E, 9 * E, 12 * E, 20 * E]) for (const owner of ['1', '2', '3'] as const) {
  const x = c({ price, owner, loan: 0, over85: true })
  const t = calcTax({ mode: 'buy', kind: 'house', price, over85: true, adjusted: true, owner, under1eok: false, relief: 'none', inheritSole: false, giftStd3eok: false, giftFromSingle: false })
  const ex = buyExtras(price, 'house', true)
  eq(`tax ${price / E}억 ${owner}`, x.tax.total, t.total)
  eq(`broker ${price / E}억`, x.broker, saleFee(price, 'house'))
  eq(`bond ${price / E}억`, x.bond, ex.bond)
  eq(`no loan cash ${price / E}억`, x.cash, price + x.fees); eq(`no loan monthly`, x.monthly, 0); eq('no loan dsr', x.dsr, null)
}

// 조정 2주택 8% 중과, 생애최초 200만 감면(지방교육세 비례 감면)
eq('adj 2주택 8%', c({ owner: '2' }).tax.rate, 0.08)
eq('비조정 2주택 일반', c({ owner: '2', adjusted: false }).tax.rate, 0.016667)
eq('생애최초', c({ relief: 'first' }).tax.acq, 11_666_900 - 2_000_000)
eq('생애최초 다주택 차단', c({ relief: 'first', owner: '2' }).tax.reliefBlocked, 'owner')

// 옵션: 부가세 제외, 비광역(채권 2.6%→2.1%), 법무사 조정, 소득 0 → DSR 없음
eq('vat off', c({ brokerVat: false }).brokerVat, 0)
eq('bond non-metro', c({ metro: false }).bond, Math.floor(4.9 * E * 0.021 * 0.05))
eq('legal custom', c({ legal: 1_000_000 }).registration, 637_000 + 75_000 + 1_000_000)
eq('income 0', c({ income: 0 }).dsr, null)

// 원금균등: 첫 달 = 원금 3억/360 + 이자 100만
eq('equalPrincipal first', c({ method: 'equalPrincipal' }).monthly, Math.round(3 * E / 360) + 1_000_000)
// 대출 > 매매가 → 매매가로 잘림
eq('loan clamp', c({ loan: 10 * E }).equity, 0)

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-real-estate-cost: all passed')
