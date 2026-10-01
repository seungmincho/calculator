// 취득세 회귀 체크: node scripts/check-acquisition-tax.ts
import { calcTax, houseRate, brokerFee, bondRate, stampDuty, dueDate, latePenalty, type TaxInput } from '../src/utils/acquisitionTax.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = typeof want === 'number' ? Math.abs((got as number) - want) < 1e-9 : got === want
  if (!ok) { fail++; console.log('FAIL', name, got, '!=', want) }
}
const base: TaxInput = {
  mode: 'buy', kind: 'house', price: 500_000_000, over85: false, adjusted: false, owner: '1',
  under1eok: false, relief: 'none', inheritSole: false, giftStd3eok: true, giftFromSingle: false,
}
const c = (o: Partial<TaxInput>) => calcTax({ ...base, ...o })
const E = 100_000_000

// 구간 경계: 6억 1%, 6억+1원부터 산식, 7.5억 2%, 9억 3%
eq('6eok', houseRate(6 * E), 0.01)
eq('7.5eok', houseRate(7.5 * E), 0.02)
eq('8eok 2.3333%', houseRate(8 * E), 0.023333)
eq('7eok 1.6667%', houseRate(7 * E), 0.016667)
eq('9eok', houseRate(9 * E), 0.03)
eq('10eok', houseRate(10 * E), 0.03)

// 5억 85㎡ 이하 1주택: 취득세 500만, 교육세 50만, 농특 0 = 550만 (1.1%)
let r = c({})
eq('5eok acq', r.acq, 5_000_000); eq('5eok edu', r.edu, 500_000); eq('5eok nong', r.nong, 0); eq('5eok total', r.total, 5_500_000)
// 85㎡ 초과: 농특 0.2% = 100만 (1.3%)
eq('5eok over85', c({ over85: true }).total, 6_500_000)
// 10억 85 초과: 3% + 0.3% + 0.2% = 3.5%
eq('10eok over85', c({ price: 10 * E, over85: true }).total, 35_000_000)
// 8억: 취득세 = 8억 × 2.3333% = 18,666,400, 교육세 1,866,640
r = c({ price: 8 * E })
eq('8eok acq', r.acq, 18_666_400); eq('8eok edu', r.edu, 1_866_640)

// 중과: 조정 2주택 8% (8.4% / 85 초과 9.0%), 조정 3주택 12% (12.4% / 13.4%)
eq('adj 2 house', c({ owner: '2', adjusted: true }).total, 42_000_000)
eq('adj 2 house over85', c({ owner: '2', adjusted: true, over85: true }).total, 45_000_000)
eq('adj 3 house over85', c({ owner: '3', adjusted: true, over85: true }).total, 67_000_000)
eq('adj 3 house', c({ owner: '3', adjusted: true }).total, 62_000_000)
eq('nonadj 2 = standard', c({ owner: '2' }).total, 5_500_000)
eq('nonadj 3 = 8%', c({ owner: '3' }).rate, 0.08)
eq('nonadj 4 = 12%', c({ owner: '4' }).rate, 0.12)
eq('temp 2 = standard', c({ owner: '2temp', adjusted: true }).total, 5_500_000)
eq('corp 12%', c({ owner: 'corp' }).rate, 0.12)
eq('under1eok no heavy', c({ owner: '3', adjusted: true, under1eok: true, price: 0.9 * E }).rate, 0.01)

// 비주택 4.6%, 농지 3.4%
eq('building 4.6%', c({ kind: 'building', price: 10 * E }).total, 46_000_000)
eq('farmland 3.4%', c({ kind: 'farmland', price: 10 * E }).total, 34_000_000)

// 상속 2.8% + 교육 0.16% (+ 농특 0.2% if 85 초과) / 무주택 1주택 특례 0.96%
eq('inherit', c({ mode: 'inherit', price: 10 * E }).total, 29_600_000)
eq('inherit over85', c({ mode: 'inherit', price: 10 * E, over85: true }).total, 31_600_000)
eq('inherit sole', c({ mode: 'inherit', price: 10 * E, inheritSole: true, over85: true }).total, 9_600_000)
eq('inherit land', c({ mode: 'inherit', kind: 'building', price: 10 * E }).total, 31_600_000)
// 증여 3.5% (3.8% / 4.0%), 조정 3억↑ 12% (12.4% / 13.4%), 1주택자 증여 제외
eq('gift', c({ mode: 'gift', price: 10 * E }).total, 38_000_000)
eq('gift over85', c({ mode: 'gift', price: 10 * E, over85: true }).total, 40_000_000)
eq('gift heavy over85', c({ mode: 'gift', price: 10 * E, adjusted: true, over85: true }).total, 134_000_000)
eq('gift heavy <3eok', c({ mode: 'gift', price: 10 * E, adjusted: true, giftStd3eok: false }).rate, 0.035)
eq('gift from single', c({ mode: 'gift', price: 10 * E, adjusted: true, giftFromSingle: true }).rate, 0.035)

// 감면: 생애최초 200만 한도, 교육세 비례
r = c({ relief: 'first' })                     // 취득세 500만 → 300만, 교육세 50만 → 30만
eq('first relief', r.relief, 2_000_000); eq('first acq', r.acq, 3_000_000); eq('first edu', r.edu, 300_000)
r = c({ relief: 'first', price: 1.5 * E })     // 150만 ≤ 200만 → 전액 면제
eq('first full exempt acq', r.acq, 0); eq('first full exempt edu', r.edu, 0)
eq('first small 300', c({ relief: 'firstSmall' }).relief, 3_000_000)
eq('birth 500', c({ relief: 'birth', price: 8 * E }).relief, 5_000_000)
eq('relief >12eok blocked', c({ relief: 'first', price: 13 * E }).reliefBlocked, 'price')
eq('relief 12eok ok', c({ relief: 'first', price: 12 * E }).relief, 2_000_000)
eq('relief 2house blocked', c({ relief: 'first', owner: '2' }).reliefBlocked, 'owner')
eq('relief gift blocked', c({ relief: 'birth', mode: 'gift' }).reliefBlocked, 'mode')

// 중개보수 상한
eq('broker 3000만', brokerFee(30_000_000, 'house'), 180_000)
eq('broker 4900만 cap', brokerFee(49_000_000, 'house'), 250_000)
eq('broker 1.9억 cap', brokerFee(190_000_000, 'house'), 800_000)
eq('broker 5억', brokerFee(5 * E, 'house'), 2_000_000)
eq('broker 9억', brokerFee(9 * E, 'house'), 4_500_000)
eq('broker 12억', brokerFee(12 * E, 'house'), 7_200_000)
eq('broker 15억', brokerFee(15 * E, 'house'), 10_500_000)
eq('broker building', brokerFee(10 * E, 'building'), 9_000_000)
eq('bond 5억 seoul', bondRate(5 * E, 'house', true), 0.026)
eq('bond 7억 other', bondRate(7 * E, 'house', false), 0.026)
eq('stamp 1억 house', stampDuty(E, 'house'), 0)
eq('stamp 5억', stampDuty(5 * E, 'house'), 150_000)
eq('stamp 11억', stampDuty(11 * E, 'house'), 350_000)

// 기한: 매매 60일(초일 불산입), 증여 달 말일+3개월, 상속 달 말일+6개월, 주말·공휴일이면 다음 영업일
eq('due buy', dueDate('2026-03-01', 'buy'), '2026-04-30')
eq('due buy labor day', dueDate('2026-03-02', 'buy'), '2026-05-04')   // 5/1 노동절 → 5/4(월)
eq('due buy weekend', dueDate('2026-03-05', 'buy'), '2026-05-04')       // 5/4(월)
eq('due gift', dueDate('2026-01-15', 'gift'), '2026-04-30')
eq('due inherit', dueDate('2026-01-10', 'inherit'), '2026-07-31')
eq('due gift weekend', dueDate('2026-02-03', 'gift'), '2026-06-01')     // 5/31(일) → 6/1(월)
// 가산세
const lp = latePenalty(5_000_000, 30, false)
eq('late report', lp.report, 1_000_000); eq('late delay', lp.delay, 33_000)
eq('late cap 75%', latePenalty(1_000_000, 10_000, true).delay, 750_000)

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-acquisition-tax: all passed')
