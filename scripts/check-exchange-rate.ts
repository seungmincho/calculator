// 환율 계산 회귀 체크: node scripts/check-exchange-rate.ts
import { krwPer, applySpread, bankRates, perUnit, roundTo, parseCache, budgetRows, currency, CURRENCIES } from '../src/utils/exchangeRate.ts'

let fail = 0
const near = (a: number | null, b: number, tol: number, msg: string) => {
  if (a === null || Math.abs(a - b) > tol) { fail++; console.log('FAIL', msg, a, '!=', b) }
}
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }

const rates = { USD: 1, KRW: 1300, JPY: 150, VND: 26000, EUR: 0.9 }

// 교차 환율: USD 기준 → 원화
near(krwPer(rates, 'USD'), 1300, 1e-9, 'USD')
near(krwPer(rates, 'JPY'), 1300 / 150, 1e-9, 'JPY 1엔')
near(perUnit(krwPer(rates, 'JPY')!, 'JPY'), 866.6667, 1e-3, 'JPY 100엔 단위')
near(perUnit(krwPer(rates, 'VND')!, 'VND'), 5, 1e-9, 'VND 100동 = 5원')
eq(krwPer(rates, 'THB'), null, '없는 통화 null')
eq(krwPer({ USD: 1 }, 'USD'), null, 'KRW 없으면 null')

// 은행 고시: 1,300 × 1.75% → 살 때 1,322.75 / 팔 때 1,277.25
const b = bankRates(1300, 1.75, 1, 0)
near(b.cashBuy, 1322.75, 1e-9, '현찰 살 때'); near(b.cashSell, 1277.25, 1e-9, '현찰 팔 때')
near(b.wireSend, 1313, 1e-9, '송금 보낼 때'); near(b.wireRecv, 1287, 1e-9, '송금 받을 때')
// 우대 90% → 스프레드 10%만: 1,300 × (1 + 0.175%) = 1,302.275
near(applySpread(1300, 1.75, 90, 1), 1302.275, 1e-9, '우대 90%')
near(applySpread(1300, 1.75, 100, 1), 1300, 1e-9, '우대 100% = 기준율')
near(applySpread(1300, 1.75, 150, 1), 1300, 1e-9, '우대 상한 100%')
near(applySpread(1300, -3, 0, 1), 1300, 1e-9, '음수 스프레드 = 0')
// 100달러 현찰 살 때 우대 없음 132,275원, 90% 130,227.5원 → 2,047.5원 절약
near(100 * b.cashBuy - 100 * applySpread(1300, 1.75, 90, 1), 2047.5, 1e-6, '우대 절약액')

near(roundTo(1.005 * 1000, 0), 1005, 0, 'round')
near(roundTo(12.3456, 2), 12.35, 1e-9, 'round 2')

// 캐시 검사
eq(parseCache(null), null, '캐시 없음'); eq(parseCache('{x'), null, '깨진 JSON')
eq(parseCache('{"rates":{"KRW":0},"updated":1}'), null, 'KRW 0 무효')
eq(parseCache('{"rates":{"KRW":1300,"USD":1},"updated":1}')?.updated, 1, '정상 캐시')

// 여행 예산: 100만원 → USD 기준 769.23, 현찰(1.75%) 756.00
const rows = budgetRows(1_000_000, rates, 0)
eq(rows.map((r) => r.code), ['USD', 'JPY', 'EUR', 'VND'], '시세 있는 통화만')
near(rows[0].mid, 769.2308, 1e-3, '예산 기준율'); near(rows[0].cash, 1_000_000 / 1322.75, 1e-9, '예산 현찰')
near(budgetRows(1_000_000, rates, 0, { code: 'USD', cash: 0 })[0].cash, 769.2308, 1e-3, '선택 통화 스프레드 덮어쓰기')

eq(currency('XXX').code, 'USD', '모르는 코드 → USD')
eq(new Set(CURRENCIES.map((c) => c.code)).size, CURRENCIES.length, '코드 중복 없음')

console.log(fail ? `${fail} FAIL` : 'OK')
if (fail) process.exit(1)
