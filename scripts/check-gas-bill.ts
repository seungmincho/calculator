// 도시가스 요금 회귀 체크: node scripts/check-gas-bill.ts
import { calcBill, REGION_RATES, toMJ, estimateMJ, heatingMJ, yearlyMJ, pctChange, savings, WHOLESALE_UNIT } from '../src/utils/gasBill.ts'

let fail = 0
const ok = (cond: boolean, msg: string) => { if (!cond) { fail++; console.log('FAIL', msg) } }

// 서울 1,000MJ: 1,250 + 22,526 = 23,776 → VAT 2,377 → 26,153
const b = calcBill(1000, REGION_RATES.seoul)
ok(b.usageCharge === 22526 && b.subtotal === 23776 && b.vat === 2377 && b.total === 26153, `서울 1000MJ ${JSON.stringify(b)}`)
ok(calcBill(0, REGION_RATES.seoul).total === 1375, '사용 0이면 기본요금+VAT')
ok(calcBill(-5, REGION_RATES.seoul).mj === 0, '음수 입력 → 0')
ok(calcBill(NaN, REGION_RATES.daegu).total === 990, 'NaN → 기본요금만 (대구 900+90)')
ok(toMJ(100, 'm3') === 4300 && toMJ(100, 'mj') === 100, 'm3 환산')
// 소비자요금 = 도매 + 소매: 서울 소매공급비용 1.6773
ok(Math.abs(REGION_RATES.seoul.unit - WHOLESALE_UNIT - 1.6773) < 1e-9, '서울 도매+소매 합')

const base = { pyeong: 30, insulation: 'average' as const, hours: 8, temp: 22, month: 1 }
const jan = estimateMJ(base)
const janWon = calcBill(jan, REGION_RATES.seoul).total
ok(janWon > 130000 && janWon < 190000, `서울 30평 1월 13~19만원 (${janWon})`)
ok(heatingMJ({ ...base, month: 7 }) === 0, '7월 난방 0')
ok(estimateMJ({ ...base, month: 7 }) < jan / 4, '여름 << 겨울')
ok(heatingMJ({ ...base, temp: 21 }) < heatingMJ(base), '온도 낮추면 감소')
ok(heatingMJ({ ...base, insulation: 'poor' }) > heatingMJ({ ...base, insulation: 'good' }), '단열 미흡 > 우수')

const y = yearlyMJ(base, 3000)
ok(y.length === 12 && y[0] === 3000, `앵커 월 = 입력값 (${y[0]})`)
ok(y[6] < y[0], '앵커 곡선도 여름이 작음')

ok(pctChange(110, 100)! - 10 < 1e-9 && pctChange(1, 0) === null, 'pctChange')

const s = savings(base, REGION_RATES.seoul.unit)
ok(s.tempDown1 > 5000 && s.tempDown1 < 15000, `1도 절약 5천~1.5만원 (${s.tempDown1})`)
ok(s.hourDown1 > 10000, `1시간 절약 (${s.hourDown1})`)
ok(savings({ ...base, month: 7 }, REGION_RATES.seoul.unit).tempDown1 === 0, '여름엔 온도 절약 0')

console.log(fail ? `${fail} FAILED` : 'all gas-bill checks passed', { jan, janWon, s })
process.exit(fail ? 1 : 0)
