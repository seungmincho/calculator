// node scripts/check-student-loan-repayment.ts (Node 24) — 학자금 대출 상환 계산 회귀 체크
// 기대값은 손으로 계산: 근로소득공제(1,500만~4,500만) = 750만 + (총급여 − 1,500만) × 15%, 의무상환액 = 초과분 × 20%
import assert from 'node:assert/strict'
import {
  incomeAmount, thresholdGross, dueOf, simulateIcl, simulateGen, payoffAt, parseState, toQuery,
  DEFAULT, MIN_DUE, MAX_YEARS, THRESHOLD_GROSS, type State,
} from '../src/utils/studentLoanRepayment.ts'
import { schedule } from '../src/utils/loanSchedule.ts'

let n = 0
const eq = (a: unknown, b: unknown, msg?: string) => { assert.deepEqual(a, b, msg); n++ }
const S = (p: Partial<State>): State => ({ ...DEFAULT, ...p })

// ── 소득금액 = 총급여 − 근로소득공제
eq(incomeAmount(30_370_000), 20_564_500, '3,037만 − (750만 + 1,537만×15% = 980.55만)')
eq(incomeAmount(28_510_000), 18_983_500, "'25 기준 2,851만 → 1,898.35만(국세청 1,898만원)")
eq(incomeAmount(35_000_000), 24_500_000, '3,500만 − 1,050만')
eq(incomeAmount(40_000_000), 28_750_000, '4,000만 − 1,125만')
eq(incomeAmount(0), 0)

// ── 상환기준소득(총급여 기준)
eq(thresholdGross(2026, 3), { won: 30_370_000, basis: 'official' })
eq(thresholdGross(2025, 3), { won: 28_510_000, basis: 'official' })
// 2027: 3,037만 × 6,929,885 / 6,494,738(4인 기준 중위소득) = 3,240.48만 → 3,240만
eq(thresholdGross(2027, 3), { won: 32_400_000, basis: 'median' })
// 2028: 3,240만 × 1.03 = 3,337.2만 → 3,337만 / 상승률 0 이면 그대로
eq(thresholdGross(2028, 3), { won: 33_370_000, basis: 'assumed' })
eq(thresholdGross(2028, 0).won, 32_400_000)
// 고시값 인상률이 4인 기준 중위소득 인상률과 같다(만원 반올림 안쪽)
{
  const m4 = { 2023: 5_400_964, 2024: 5_729_913, 2025: 6_097_773, 2026: 6_494_738 } as Record<number, number>
  for (const y of [2024, 2025, 2026]) {
    const est = Math.round((THRESHOLD_GROSS[y - 1] * m4[y]) / m4[y - 1])
    assert.ok(Math.abs(est - THRESHOLD_GROSS[y]) <= 1, `${y} ${est} vs ${THRESHOLD_GROSS[y]}`); n++
  }
}

// ── 경계: 기준 바로 아래·같음·바로 위(2026 소득금액 기준 20,564,500)
const thr = 20_564_500
eq(dueOf(thr - 1, thr, false).due, 0, '아래')
eq(dueOf(thr, thr, false).due, 0, '같으면 초과가 아니라 0')
eq(dueOf(thr + 1, thr, false), { raw: 0, due: MIN_DUE, min: true }, '1원 넘어도 최소부담 36만원')
// 총급여로: 3,037만은 0, 1원 많으면 소득금액 20,564,501 → 36만원
eq(dueOf(incomeAmount(30_370_000), thr, false).due, 0)
eq(dueOf(incomeAmount(30_370_001), thr, false).due, MIN_DUE)
eq(dueOf(incomeAmount(30_369_999), thr, false).due, 0, '공제 버림으로 소득금액이 기준과 같아짐')
// 계산액이 정확히 36만원이면 최소부담 아님: 초과 180만 × 20%
eq(dueOf(thr + 1_800_000, thr, false), { raw: 360_000, due: 360_000, min: false })

// ── 의무상환액(손 계산)
eq(dueOf(24_500_000, thr, false).due, 787_100, '3,500만: (2,450만 − 2,056.45만) × 20%')
eq(dueOf(24_500_000, thr, true).due, 983_875, '대학원 25%')
eq(dueOf(28_750_000, thr, false).due, 1_637_100, '4,000만: 818.55만 × 20%')
eq(dueOf(21_950_000, thr, false), { raw: 277_100, due: MIN_DUE, min: true }, '3,200만: 27.71만 < 36만')
{
  const p = simulateIcl(S({}))
  eq(p.rows[0].year, 2026)
  eq(p.rows[0].gross, 35_000_000)
  eq(p.rows[0].income, 24_500_000)
  eq(p.rows[0].thrIncome, thr)
  eq(p.rows[0].due, 787_100)
  // 비과세 월 20만 → 총급여 3,260만
  eq(simulateIcl(S({ s: 3500, n: 20 })).rows[0].gross, 32_600_000)
  // 3,200만 + 비과세 월 20만 → 총급여 2,960만 ≤ 3,037만 → 0원
  eq(simulateIcl(S({ s: 3200, n: 20 })).rows[0].due, 0)
}

// ── 원리금균등(손 계산): 1,000만원 연 6% 12개월 → 860,664원(10,000,000 × 0.005 × 1.005^12 / (1.005^12 − 1))
{
  const g = simulateGen(S({ b: 1000, r: 6, d: 0, m: 1 }))
  eq(g.payment, 860_664)
  eq(g.months, 12)
  // 1,500만원 1.7% 10년: 21,250 × 1.18516227 / 0.18516227 = 136,014.2 → 136,014
  eq(simulateGen(S({})).payment, 136_014)
  // 0% 는 원금 ÷ 개월
  const z = simulateGen(S({ r: 0 }))
  eq(z.payment, 125_000)
  eq(z.totalInterest, 0)
  eq(z.months, 120)
  // 거치 2년: 매달 이자 = 15,000,000 × 1.7% ÷ 12 = 21,250
  const gr = simulateGen(S({ d: 2 }))
  eq(gr.graceInterest, 21_250)
  eq(gr.rows[0].interest, 255_000, '거치 1년 이자 12 × 21,250')
  eq(gr.rows[0].principal, 0)
  eq(gr.months, 144)
  eq(payoffAt(2026, gr.months!), { year: 2037, month: 12 })
}
// loanSchedule.schedule 과 같은 결과(재사용 규칙 그대로)
for (const c of [{ b: 1500, r: 1.7, d: 0, m: 10 }, { b: 2345, r: 2.9, d: 3, m: 7 }, { b: 800, r: 1.7, d: 10, m: 10 }, { b: 50, r: 9.99, d: 1, m: 1 }]) {
  const mine = simulateGen(S(c))
  const ref = schedule({ principal: c.b * 10_000, rate: c.r, months: (c.d + c.m) * 12, grace: c.d * 12, method: 'equalPayment' })
  eq(mine.totalInterest, ref.totalInterest, `총이자 ${JSON.stringify(c)}`)
  eq(mine.months, ref.months)
  eq(mine.payment, ref.firstPayment)
  eq(mine.totalPaid, c.b * 10_000 + ref.totalInterest)
}
// 추가 상환: 0% 1,500만에 월 12.5만 더 → 월 25만 → 60개월
eq(simulateGen(S({ r: 0 }), 125_000).months, 60)

// ── 취업 후 상환 시뮬레이션
// 0% · 100만원 · 연봉 4,000만: 2026 의무상환 계산액 1,637,100 이지만 잔액 100만원까지만
// → 2027.7~2028.6 월 83,333.33 × 12 = 100만 → 시작부터 30개월(2028년 6월)에 끝
{
  const p = simulateIcl(S({ b: 100, r: 0, s: 4000 }))
  eq(p.rows[0].raw, 1_637_100)
  eq(p.rows[0].due, 1_000_000, '잔액 한도')
  eq(p.months, 30)
  eq(payoffAt(2026, p.months!), { year: 2028, month: 6 })
  eq(p.totalInterest, 0)
  eq(Math.round(p.totalPaid), 1_000_000)
  // 2027 말 잔액 = 100만 − 6 × 83,333.33 = 50만 → 2027 소득 의무상환액도 잔액까지만
  eq(Math.round(p.rows[1].balance), 500_000)
  eq(Math.round(p.rows[1].due), 500_000)
  eq(p.rows[2].due, 0, '다 갚은 해는 0')
  // 잔액이 충분하면 계산액 그대로: 1,500만 0% → 2027.7부터 월 136,425
  const q = simulateIcl(S({ r: 0, s: 4000 }))
  eq(q.rows[0].due, 1_637_100)
  eq(q.rows[1].paid, 6 * 136_425)
}
// 이자: 100만원 연 1.2% → 월 1,000원, 2026년에는 공제가 없어 12,000원 쌓임(단리, 원금엔 안 붙음)
{
  const p = simulateIcl(S({ b: 100, r: 1.2, s: 4000 }))
  eq(p.rows[0].interest, 12_000)
  eq(p.rows[0].balance, 1_012_000)
  eq(p.rows[0].paid, 0)
  // 의무상환액은 연말 잔액 1,012,000 까지 → 2027.7부터 월 84,333.33, 연말까지 6번 = 506,000
  eq(p.rows[0].due, 1_012_000)
  eq(Math.round(p.rows[1].paid), 506_000)
  assert.ok(p.months !== null && Math.abs(p.totalPaid - 1_000_000 - p.totalInterest) < 1); n++
  // 이자 면제 대상: 첫 원천공제 달(2027.7) 전까지 이자 없음
  const f = simulateIcl(S({ b: 100, r: 1.2, s: 4000, f: true }))
  eq(f.rows[0].interest, 0)
  eq(f.rows[0].balance, 1_000_000)
  eq(f.rows[1].interest > 0, true, '7월부터 이자')
  assert.ok(f.totalInterest < p.totalInterest); n++
}
// 자발적 상환은 그해 의무상환액에서 빠진다(법 §18⑧): 월 5만 × 12 = 60만 → 1,637,100 − 600,000
{
  const p = simulateIcl(S({ b: 1500, r: 0, s: 4000 }), 50_000)
  eq(p.rows[0].offset, 600_000)
  eq(p.rows[0].due, 1_037_100)
  eq(p.rows[0].paid, 600_000)
  // 의무상환액보다 많이 내면 통지액 0
  const q = simulateIcl(S({ b: 1500, r: 0, s: 4000 }), 200_000)
  eq(q.rows[0].due, 0)
  eq(q.months, 75, '0% 1,500만 ÷ 20만 = 75개월(의무상환은 모두 차감)')
}
// 기준 근처 3,200만: 최소부담 36만원만 내고 50년 안에 못 갚음
{
  const p = simulateIcl(S({ s: 3200 }))
  eq(p.rows[0].due, MIN_DUE)
  eq(p.rows[0].min, true)
  eq(p.months, null)
  eq(p.rows.length, MAX_YEARS)
}
// 기본값: 2048년 8월 완납(가정: 연봉·기준 3% 상승)
{
  const p = simulateIcl(DEFAULT)
  assert.ok(p.months !== null); n++
  eq(payoffAt(2026, p.months!).year, 2048)
  // 매달 10만 더 → 2040년
  eq(payoffAt(2026, simulateIcl(DEFAULT, 100_000).months!).year, 2040)
}

// ── 극단값
for (const k of ['icl', 'gen'] as const) {
  const p = k === 'icl' ? simulateIcl(S({ b: 0 })) : simulateGen(S({ k, b: 0 }))
  eq(p.months, 0, `${k} 잔액 0`)
  eq(p.rows.length, 0)
  eq(p.totalInterest, 0)
}
eq(simulateIcl(S({ r: 0, s: 0 })).months, null, '소득 0 이면 의무상환 없음')
eq(simulateIcl(S({ r: 0, s: 0 })).rows.at(-1)!.balance, 15_000_000, '0% 면 잔액 그대로')

// ── 완납 연도 경계
eq(payoffAt(2026, 1), { year: 2026, month: 1 })
eq(payoffAt(2026, 12), { year: 2026, month: 12 })
eq(payoffAt(2026, 13), { year: 2027, month: 1 })
eq(payoffAt(2030, 24), { year: 2031, month: 12 })

// ── URL
{
  const back = (s: State) => { const p = new URLSearchParams(toQuery(s)); return parseState((k) => p.get(k)) }
  eq(toQuery(DEFAULT), '', '기본값이면 쿼리 없음')
  eq(parseState(() => null), DEFAULT)
  const a = S({ k: 'gen', b: 2000, d: 2, m: 5 })
  eq(toQuery(a), 't=g&b=2000&d=2&m=5')
  eq(back(a), a)
  const b = S({ r: 1.75, s: 4200, n: 20, g: 4.5, h: 6, y: 2027, x: 0, u: true, f: true })
  eq(toQuery(b), 'r=1.75&s=4200&n=20&g=4.5&h=6&y=2027&x=0&u=1&f=1')
  eq(back(b), b)
  eq(back(S({ g: -2, h: -1 })), S({ g: -2, h: -1 }))
  // 틀린 값은 기본값
  const bad = new URLSearchParams('t=x&b=-1&r=11&s=1.5&y=2024&d=11&m=0&x=abc&u=2&f=yes')
  eq(parseState((k) => bad.get(k)), DEFAULT)
  // 금리는 소수 둘째 자리
  eq(parseState((k) => (k === 'r' ? '1.234' : null)).r, 1.23)
  // 경계 허용
  const edge = new URLSearchParams('b=0&r=0&y=2035&d=10&m=10')
  eq(parseState((k) => edge.get(k)), S({ b: 0, r: 0, y: 2035, d: 10, m: 10 }))
}

console.log(`check-student-loan-repayment: ${n} passed`)
