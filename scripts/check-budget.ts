// 가계부·예산 계산 회귀 체크: node scripts/check-budget.ts
import {
  analyze, fillByRule, monthStatus, emergencyGoal, normalizeAmounts, normalizeMonths, readParams, toCSV,
  shiftMonth, sumOf, DEFAULT_PLAN, DEFAULT_INCOME, RULES, CATEGORY_IDS, VARIABLE,
} from '../src/utils/budget.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}

// 규칙마다 모든 항목이 정확히 한 통에 들어간다
for (const [id, bs] of Object.entries(RULES)) {
  eq(bs.flatMap(b => b.cats).sort(), [...CATEGORY_IDS].sort(), `${id} 항목 분할`)
  eq(bs.reduce((s, b) => s + b.pct, 0), 100, `${id} 비율 합 100`)
}
eq(VARIABLE, ['food', 'transport', 'medical', 'leisure', 'clothing', 'social', 'other'], '변동 생활비')

// 기본값: 300만 중 지출 210만 + 저축 70만, 미배정 20만
const a = analyze(DEFAULT_INCOME, DEFAULT_PLAN, 'r503020')
eq([a.spend, a.saving, a.unallocated], [2_100_000, 700_000, 200_000], '기본 합계')
eq(Math.round(a.savingsRate * 10) / 10, 23.3, '기본 저축률')
eq(a.verdict, 'good', '기본 판정')
eq(a.need, 1_530_000, '필수 지출')
eq(a.year1, 8_400_000, '1년 저축')
eq(Math.round(a.potentialRate * 10) / 10, 30, '남는 돈까지 저축')
eq(a.buckets.map(b => [b.id, b.target, b.warn]), [['need', 1_500_000, false], ['want', 900_000, false], ['saving', 600_000, false]], '50/30/20 통')
// 사회초년생 50%: 저축 23%는 부족
eq(analyze(DEFAULT_INCOME, DEFAULT_PLAN, 'rookie').buckets.map(b => b.warn), [true, false, true], '사회초년생 경고')

// 판정 경계
const only = (savings: number) => ({ ...normalizeAmounts({}), savings })
eq(analyze(1_000_000, only(99_999), 'r503020').verdict, 'low', '10% 미만')
eq(analyze(1_000_000, only(100_000), 'r503020').verdict, 'fair', '10%')
eq(analyze(1_000_000, only(200_000), 'r503020').verdict, 'good', '20%')
eq(analyze(1_000_000, only(300_000), 'r503020').verdict, 'great', '30%')
eq(analyze(1_000_000, only(1_000_001), 'r503020').verdict, 'over', '수입 초과')
eq(analyze(0, only(0), 'r503020').verdict, 'over', '수입 0')

// 규칙대로 채우기: 통 합계 = 목표, 총합 = 수입
for (const r of ['r503020', 'fourAccounts', 'rookie'] as const) {
  const f = fillByRule(3_456_789, DEFAULT_PLAN, r)
  eq(sumOf(f), 3_456_789, `${r} 채우기 총합`)
  const an = analyze(3_456_789, f, r)
  eq(an.buckets.map(b => b.actual), an.buckets.map(b => b.target), `${r} 통 목표 일치`)
}
const z = fillByRule(3_000_000, normalizeAmounts({}), 'fourAccounts')
eq([z.emergency, z.savings, sumOf(z)], [300_000, 600_000, 3_000_000], '빈 계획도 기본 비율로')
eq(fillByRule(0, DEFAULT_PLAN, 'r503020'), DEFAULT_PLAN, '수입 0이면 그대로')

// 월 상태: 2026-10 (31일), 10월 11일 → 남은 21일
const act = { food: 200_000, leisure: 100_000, housing: 600_000, savings: 500_000 }
const s = monthStatus(DEFAULT_PLAN, act, '2026-10', '2026-10-11')
eq([s.phase, s.dim, s.daysLeft], ['current', 31, 21], '이번 달 일수')
eq([s.planned, s.spent, s.left], [2_100_000, 900_000, 1_200_000], '지출 계획/실제')
eq([s.varPlanned, s.varSpent], [1_170_000, 300_000], '변동비')
eq(s.daily, 41_400, '하루 예산 (870,000÷21 → 100원 내림)')
eq(s.fast, false, '페이스 정상 (한도 377,419)')
eq(monthStatus(DEFAULT_PLAN, { food: 450_000 }, '2026-10', '2026-10-11').fast, true, '페이스 빠름')
eq(monthStatus(DEFAULT_PLAN, { food: 2_000_000 }, '2026-10', '2026-10-31').daily, 0, '초과 시 0')
eq(monthStatus(DEFAULT_PLAN, act, '2026-09', '2026-10-11').phase, 'past', '지난 달')
eq(monthStatus(DEFAULT_PLAN, {}, '2026-11', '2026-10-11').daysLeft, 30, '다음 달')
eq(monthStatus(DEFAULT_PLAN, {}, '2028-02', '2028-02-01').dim, 29, '윤년 2월')
eq([s.savedPlan, s.saved], [700_000, 500_000], '저축 계획/실제')

eq([shiftMonth('2026-01', -1), shiftMonth('2026-12', 1)], ['2025-12', '2027-01'], '월 이동')

// 비상금
eq(emergencyGoal(1_530_000, 3, 1_000_000, 200_000), { target: 4_590_000, progress: 1_000_000 / 4_590_000 * 100, short: 3_590_000, monthsToGoal: 18 }, '비상금 3개월')
eq(emergencyGoal(1_000_000, 6, 7_000_000, 0).monthsToGoal, 0, '이미 달성')
eq(emergencyGoal(1_000_000, 6, 0, 0).monthsToGoal, null, '적립 0')

// 저장값 정리·예전 프리셋 호환
eq(normalizeAmounts([{ id: 'food', amount: 300000, icon: 'x' }, { id: 'nope', amount: 1 }, { id: 'savings', amount: -5 }]).food, 300000, '예전 expenses 배열')
eq(normalizeAmounts([{ id: 'savings', amount: -5 }]).savings, 0, '음수 제거')
eq(normalizeAmounts({ food: '12,000' }).food, 12000, '문자열 숫자')
eq(normalizeMonths({ '2026-10': { food: 1000, bad: 5 }, 'x': {}, '2026-13': {} }), { '2026-10': { food: 1000 } }, '월 기록 정리')

// URL
const P = (q: string) => { const u = new URLSearchParams(q); return readParams(k => u.get(k)) }
eq(P(''), null, '파라미터 없음')
eq(P('rule=rookie'), null, '규칙만 있으면 계획 없음')
const old = P('salary=2500000&sideIncome=0&otherIncome=0&exp_food=400000&exp_savings=300000')!
eq([old.mode, old.salary, old.amounts.food, old.amounts.savings, old.amounts.emergency, old.rule], ['net', 2_500_000, 400_000, 300_000, 0, null], '예전 링크')
const an2 = P('annual=50000000&rule=fourAccounts')!
eq([an2.mode, an2.annual, an2.rule, an2.amounts.food], ['annual', 50_000_000, 'fourAccounts', 500_000], '연봉 링크 + 기본 계획')

// CSV
eq(toCSV({ '2026-10': { food: 1000 } }, DEFAULT_PLAN, ['월', '항목', '계획', '실제'], c => (c === 'food' ? '식비, 외식' : c)).split('\n').slice(0, 3),
  ['월,항목,계획,실제', '2026-10,housing,600000,0', '2026-10,"식비, 외식",500000,1000'], 'CSV')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-budget: all passed')
