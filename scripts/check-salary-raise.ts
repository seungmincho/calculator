// node scripts/check-salary-raise.ts (Node 24) — 연봉 인상률·실수령 차이·시뮬레이션·URL 회귀 체크
// salaryRaise.ts 가 netSalary.ts(확장자 없는 import)를 쓰므로 esbuild 로 묶어 불러온다(check-year-end-tax.ts 와 같은 방식).
// 기대값은 손으로(또는 계산기로) 따로 계산한 숫자다.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import type * as SR from '../src/utils/salaryRaise.ts'

const entry = new URL('../src/utils/salaryRaise.ts', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const { outputFiles: [out] } = await build({ entryPoints: [entry], bundle: true, format: 'esm', write: false, logLevel: 'silent' })
const m: typeof SR = await import('data:text/javascript;base64,' + Buffer.from(out.text).toString('base64'))
const { afterOf, rateOf, convert, valid, compute, rateTable, yearsTable, compareOffer, offerExample, minWageRaise, parseState, toQuery, DEFAULT, REF } = m
type State = SR.State

// ── 인상 후 연봉·환산
assert.equal(afterOf(DEFAULT), 52_500_000, '5천만 × 1.05')
assert.equal(afterOf({ s: 50_000_000, m: 'after', v: 53_000_000 }), 53_000_000)
assert.equal(afterOf({ s: 50_000_000, m: 'amt', v: 3_000_000 }), 53_000_000)
assert.equal(afterOf({ s: 33_333_333, m: 'rate', v: 3 }), 34_333_333, '34,333,332.99 → 반올림')
assert.equal(rateOf(50_000_000, 53_000_000), 6)
{
  const st: State = { ...DEFAULT, m: 'after', v: 52_345_678 }
  assert.equal(convert(st, 'rate'), 4.69, '4.691356% → 소수 둘째 자리')
  assert.equal(convert(st, 'amt'), 2_345_678)
  assert.equal(convert(st, 'after'), 52_345_678)
  assert.equal(convert(DEFAULT, 'after'), 52_500_000)
  assert.equal(convert(DEFAULT, 'amt'), 2_500_000)
}
// 범위: 인상 후 연봉 100만 미만·인상률 100% 초과는 계산하지 않는다
assert.equal(valid(DEFAULT), true)
assert.equal(valid({ ...DEFAULT, m: 'amt', v: -49_500_000 }), false, '인상 후 50만원')
assert.equal(valid({ ...DEFAULT, m: 'after', v: 150_000_000 }), false, '200% 인상')
assert.equal(valid({ ...DEFAULT, m: 'rate', v: -50 }), true, '삭감 50%까지')
assert.equal(valid({ ...DEFAULT, m: 'rate', v: 100 }), true)

// ── 실수령: 같은 연도 요율로 전·후 계산(2027 국민연금 5%, 장기요양 13.9%)
{
  const r = compute(DEFAULT)
  // 과세급여 = 5,000만 − 20만×12 = 4,760만
  assert.equal(r.before.deductions.nationalPension, 2_380_000, '4,760만 × 5%')
  assert.equal(r.before.deductions.healthInsurance, 1_711_220, '4,760만 × 3.595%')
  assert.equal(r.before.deductions.longTermCare, 237_859, '1,711,220 × 13.9% = 237,859.58 내림')
  // 4,760만 × 0.9% = 428,400 이지만 netSalary.ts 의 Math.floor(47,600,000 × 0.009) 가 부동소수(428,399.999…)로 428,399 — 1원 차이
  assert.ok(Math.abs(r.before.deductions.employmentInsurance - 428_400) <= 1, '4,760만 × 0.9%')
  // 인상 후 과세급여 5,010만
  assert.equal(r.aft.deductions.nationalPension, 2_505_000)
  assert.equal(r.aft.deductions.healthInsurance, 1_801_095)
  assert.equal(r.aft.deductions.longTermCare, 250_352, '1,801,095 × 13.9% = 250,352.2 내림')
  assert.equal(r.raise, 2_500_000)
  assert.equal(r.raiseMonthly, 208_333, '250만 ÷ 12 = 208,333.3')
  assert.equal(r.rate, 5)
  assert.equal(r.netDiff, r.aft.netMonthly - r.before.netMonthly)
  assert.ok(r.netDiff > 0 && r.netDiff < r.raiseMonthly, '실수령 증가는 세전 월 인상액보다 작다')
  assert.ok(r.netRate < r.rate, '누진세라 실수령 인상률 < 명목 인상률')
  assert.ok(r.takenShare > 0.1 && r.takenShare < 0.4, `인상분 중 세금·보험 몫 ${r.takenShare}`)
  assert.ok(Math.abs(r.real - 2.239532619) < 1e-6, '1.05 ÷ 1.027 − 1 = 2.2395%')
  // 2026 요율: 국민연금 4.75%, 장기요양 13.14%
  const r26 = compute({ ...DEFAULT, y: 2026 })
  assert.equal(r26.before.deductions.nationalPension, 2_261_000)
  assert.equal(r26.before.deductions.longTermCare, 224_854, '1,711,220 × 13.14% = 224,854.3 내림')
  assert.ok(r26.before.netMonthly > r.before.netMonthly, '2027 연금 인상으로 실수령 감소')
  // 부양가족이 늘면 실수령 증가
  assert.ok(compute({ ...DEFAULT, dep: 3 }).before.netMonthly > r.before.netMonthly)
  // 인상률 0 → 차이 0, 세금 몫 0
  const z = compute({ ...DEFAULT, v: 0 })
  assert.equal(z.netDiff, 0)
  assert.equal(z.takenShare, 0)
  assert.ok(Math.abs(z.real - (1 / 1.027 - 1) * 100) < 1e-9, '동결이면 물가만큼 실질 감소')
  // 삭감도 계산된다
  assert.ok(compute({ ...DEFAULT, v: -10 }).netDiff < 0)
}

// ── 인상률 표 0~15%
{
  const tb = rateTable(DEFAULT)
  assert.equal(tb.length, 16)
  assert.deepEqual(tb.map((x) => x.r), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
  assert.equal(tb[0].diff, 0)
  assert.equal(tb[0].after, 50_000_000)
  assert.equal(tb[15].after, 57_500_000)
  assert.equal(tb[5].net, compute(DEFAULT).aft.netMonthly, '표 5% 줄 = 결과')
  for (let i = 1; i < tb.length; i++) assert.ok(tb[i].diff > tb[i - 1].diff, `${i}% 단조 증가`)
  // 회귀: 표의 '지금 줄'은 인상 후 연봉으로 찾는다. 33,333,333원 × 3% 는 rateOf 가 3.00000003 이라 인상률 비교로는 못 찾았다
  const odd: State = { ...DEFAULT, s: 33_333_333, v: 3 }
  assert.notEqual(rateOf(odd.s, afterOf(odd)), 3)
  assert.equal(rateTable(odd).filter((x) => x.after === afterOf(odd)).map((x) => x.r).join(), '3')
  assert.equal(rateTable({ ...DEFAULT, m: 'after', v: 54_000_000 }).filter((x) => x.after === 54_000_000).map((x) => x.r).join(), '8', '인상 후 연봉 입력도 같은 줄')
}

// ── N년 뒤(매년 5%, 물가 2.7%)
{
  const ys = yearsTable(DEFAULT)
  assert.equal(ys.length, 10)
  assert.equal(ys[0].salary, 52_500_000)
  assert.equal(ys[2].salary, 57_881_250, '5천만 × 1.05³')
  assert.equal(ys[2].realToday, 53_435_093, '57,881,250 ÷ 1.027³')
  assert.equal(ys[9].salary, 81_444_731, '5천만 × 1.05¹⁰ = 81,444,731.34')
  assert.equal(ys[9].realToday, 62_396_260, '81,444,731 ÷ 1.027¹⁰ = 62,396,259.74')
  assert.equal(ys[0].net, compute(DEFAULT).aft.netMonthly)
  // 범위를 넘는 해는 실수령을 계산하지 않는다
  const big = yearsTable({ ...DEFAULT, s: 900_000_000, v: 10 })
  assert.equal(big[0].net !== null, true)
  assert.equal(big[9].net, null, '9억 × 1.1¹⁰ > 10억')
}

// ── 이직 제시 연봉 비교
{
  assert.equal(offerExample(50_000_000), 55_000_000)
  assert.equal(offerExample(43_210_000), 48_000_000, '47,531,000 → 100만 단위 반올림')
  const c = compareOffer(DEFAULT, 56_000_000)
  assert.equal(c.annualDiff, 3_500_000, '5,600만 − 5,250만')
  assert.equal(c.offerRate, 12)
  assert.ok(c.netDiff > 0 && c.netDiff < 3_500_000 / 12)
  assert.equal(c.netStay, compute(DEFAULT).aft.netMonthly)
}

// ── 참고 지표
assert.ok(Math.abs((minWageRaise(2027) ?? 0) - 3.68217054) < 1e-6, '10,700 ÷ 10,320 − 1')
assert.ok(Math.abs((minWageRaise(2026) ?? 0) - 2.89132602) < 1e-6, '10,320 ÷ 10,030 − 1')
assert.equal(minWageRaise(2025), null, '2024 값 없음')
assert.equal(Math.round((REF.regular2025 / REF.regular2024 - 1) * 1000) / 10, REF.wage2025, '447.2 ÷ 433.8 = 3.1%')

// ── URL
{
  const back = (st: State) => { const p = new URLSearchParams(toQuery(st)); return parseState((k) => p.get(k)) }
  assert.equal(toQuery(DEFAULT), '', '기본값이면 쿼리 없음')
  assert.deepEqual(parseState(() => null), DEFAULT)
  const a: State = { ...DEFAULT, s: 42_000_000, m: 'after', v: 45_000_000 }
  assert.equal(toQuery(a), 's=42000000&m=after&v=45000000')
  assert.deepEqual(back(a), a)
  const b: State = { ...DEFAULT, m: 'amt', v: 3_000_000, nt: 0, dep: 3, y: 2026, cpi: 2.1, o: 55_000_000 }
  assert.equal(toQuery(b), 'm=amt&v=3000000&nt=0&dep=3&y=2026&cpi=2.1&o=55000000')
  assert.deepEqual(back(b), b)
  assert.equal(toQuery({ ...DEFAULT, v: 3.5 }), 'v=3.5')
  assert.deepEqual(back({ ...DEFAULT, v: 3.5 }), { ...DEFAULT, v: 3.5 })
  assert.deepEqual(back({ ...DEFAULT, v: -3 }), { ...DEFAULT, v: -3 })
  // 틀린 값은 기본값
  const bad = new URLSearchParams('s=0&m=foo&v=abc&nt=-1&dep=0&y=2030&cpi=50&o=10')
  assert.deepEqual(parseState((k) => bad.get(k)), DEFAULT)
  // 인상 후 연봉이 범위 밖이면 인상률 5%로
  const out = new URLSearchParams('m=after&v=500')
  assert.deepEqual(parseState((k) => out.get(k)), DEFAULT)
  // m 없이 v 만 오면 인상률
  const onlyV = new URLSearchParams('v=7')
  assert.deepEqual(parseState((k) => onlyV.get(k)), { ...DEFAULT, v: 7 })
  // 소수 연봉·부양가족은 버림 없이 기본값
  const frac = new URLSearchParams('s=50000000.5&dep=2.5&v=4.567')
  assert.deepEqual(parseState((k) => frac.get(k)), { ...DEFAULT, v: 4.57 })
  // 경계
  const edge = new URLSearchParams('s=1000000&dep=11&cpi=-5&v=100')
  assert.deepEqual(parseState((k) => edge.get(k)), { ...DEFAULT, s: 1_000_000, dep: 11, cpi: -5, v: 100 })
  const over = new URLSearchParams('s=1000000001&dep=12&cpi=20.01&v=100.01')
  assert.deepEqual(parseState((k) => over.get(k)), DEFAULT)
}

console.log('check-salary-raise: all passed')
