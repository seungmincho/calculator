// node scripts/check-national-scholarship.ts (Node 24) — 국가장학금 소득인정액·구간·금액·URL 회귀 체크
// 기대값: 한국장학재단 '소득인정액 산정방식' 계산 예시 2건과 '경곗값 확인' 2026년 공표표(2026-11-20 확인)
import assert from 'node:assert/strict'
import {
  recognizedIncome, boundaries, bracketOf, distance, award, kindOf, evaluate, parseValues, toQuery, phaseAt,
  DEFAULTS, type Household,
} from '../src/utils/nationalScholarship.ts'

const H = (p: Partial<Household>): Household => ({
  married: false, parentIncome: 0, parentDaily: 0, studentIncome: 0,
  realEstate: 0, deposit: 0, financial: 0, car: 0, debt: 0, siblings: 1, ...p,
})

// ── 재단 공표 2026년 경곗값과 같은 방식(4인 기준중위소득 × 비율, 반올림)
assert.deepEqual(boundaries('2026'), { ga: 4_546_317, na: 8_443_159, da: 12_989_476, ra: 19_484_214 })
// 2025년 1구간(30%) 1,829,332 원 = 2025년 4인 값 → 그해 기준중위소득을 쓴다는 근거. 2027 추정값
assert.deepEqual(boundaries('2027'), { ga: 4_850_920, na: 9_008_851, da: 13_859_770, ra: 20_789_655 })

// ── 재단 예시 1: 다구간, 10,316,800 원
{
  const r = recognizedIncome(H({
    studentIncome: 1_500_000, parentIncome: 4_160_000, parentDaily: 1_800_000,
    realEstate: 450_000_000, deposit: 300_000_000, financial: 500_000 + 30_000_000 + 10_000_000,
    car: 10_000_000, // 장애인 자동차 3천만원은 입력에서 뺀다
    debt: 3_000_000 + 350_000_000 + 20_000_000,
  }))
  assert.equal(r.income, 5_260_000)
  assert.equal(r.general, 4_072_700)
  assert.equal(r.financial, 845_100)
  assert.equal(r.car, 139_000)
  assert.equal(r.total, 10_316_800)
  assert.equal(bracketOf(r.total, '2026'), 'da')
  assert.equal(bracketOf(r.total), 'da')
}

// ── 재단 예시 2: 부채가 일반재산을 넘어 금융재산에서 차감, 가구간 2,639,000 원
{
  const r = recognizedIncome(H({
    studentIncome: 800_000, parentIncome: 2_500_000,
    deposit: 250_000_000, realEstate: 20_000_000, financial: 60_000_000, car: 10_000_000,
    debt: 2_500_000 + 170_000_000 + 80_000_000,
  }))
  assert.equal(r.income, 2_500_000, '학생 소득은 130만원 공제 후 음수면 0')
  assert.equal(r.general, 0)
  assert.equal(r.financial, 0)
  assert.equal(r.total, 2_639_000)
  assert.equal(bracketOf(r.total), 'ga')
}

// ── 기본재산액이 일반재산보다 크면 남은 공제가 금융재산으로 넘어간다
assert.equal(recognizedIncome(H({ realEstate: 50_000_000, financial: 30_000_000 })).financial, Math.round(11_000_000 * 0.0626 / 3))
// 형제·자매 공제: 3명부터 (n − 2) × 40만원, 기혼은 없음, 총액은 0 아래로 안 내려감
assert.equal(recognizedIncome(H({ parentIncome: 3_000_000, siblings: 4 })).sibling, 800_000)
assert.equal(recognizedIncome(H({ parentIncome: 3_000_000, siblings: 2 })).sibling, 0)
assert.equal(recognizedIncome(H({ parentIncome: 3_000_000, siblings: 4, married: true })).sibling, 0)
assert.equal(recognizedIncome(H({ parentIncome: 100_000, siblings: 5 })).total, 0)

// ── 경계값 포함(이하)
const bd = boundaries()
assert.equal(bracketOf(bd.ga), 'ga')
assert.equal(bracketOf(bd.ga + 1), 'na')
assert.equal(bracketOf(bd.ra + 1), 'ma')
assert.deepEqual(distance(bd.ga), { down: null, up: 0 })
assert.deepEqual(distance(bd.ga + 1), { down: 1, up: bd.na - bd.ga - 1 })
assert.deepEqual(distance(bd.ra + 10), { down: 10, up: null })

// ── 금액: Ⅰ유형·다자녀, 학기 = 연간 ÷ 2, 등록금 넘게 주지 않음
assert.equal(kindOf(false, 2, false), 'type1')
assert.equal(kindOf(false, 3, false), 'multi12')
assert.equal(kindOf(false, 3, true), 'multi3')
assert.equal(kindOf(true, 4, true), 'type1', '기혼은 다자녀 대상 아님')
assert.deepEqual(award('na', 'type1'), { kind: 'type1', annual: 4_400_000, semester: 2_200_000, aid: null, net: null })
assert.equal(award('na', 'multi12').semester, 2_525_000)
assert.equal(award('ra', 'multi3').semester, 1_000_000)
assert.equal(award('da', 'multi3').semester, 'full')
assert.equal(award('ma', 'type1').annual, 0)
assert.deepEqual(award('ga', 'type1', 4_000_000), { kind: 'type1', annual: 6_000_000, semester: 3_000_000, aid: 3_000_000, net: 1_000_000 })
assert.deepEqual(award('ga', 'type1', 2_500_000).net, 0, '등록금보다 많이 주지 않음')
assert.deepEqual(award('basic', 'type1', 4_123_000).net, 0, '전액')

// ── 기본값: 부모 월 500만 + 일반 (3억 − 6,900만 − 1억) + 금융 3천만 + 자동차 1,500만 → 나구간
{
  const o = evaluate(DEFAULTS)
  assert.equal(o.rec!.total, 5_000_000 + Math.round(131_000_000 * 0.0139) + Math.round(30_000_000 * 0.0626 / 3) + Math.round(15_000_000 * 0.0139))
  assert.equal(o.bracket, 'na')
  assert.equal(o.award.semester, 2_200_000)
}

// ── URL: 기본값이면 빈 쿼리, 없는 키 = 기본값, 틀린 값은 무시, 왕복
{
  assert.equal(toQuery(DEFAULTS), '')
  const none = new URLSearchParams('')
  assert.deepEqual(parseValues((k) => none.get(k)), DEFAULTS)
  const v = { ...DEFAULTS, m: 'known', b: 'ga', sib: '3', ord: '3', tu: '3500000', pi: '' }
  const qs = toQuery(v)
  assert.equal(qs, 'm=known&b=ga&sib=3&ord=3&pi=0&tu=3500000')
  const back = parseValues((k) => new URLSearchParams(qs).get(k))
  assert.deepEqual(back, { ...v, pi: '0' })
  assert.equal(evaluate(back).award.semester, 'full')
  const bad = new URLSearchParams('b=zz&sib=99&pi=-5&re=1e9&m=x&tu=007')
  assert.deepEqual(parseValues((k) => bad.get(k)), { ...DEFAULTS, tu: '7' })
}

// ── 신청 일정 단계
assert.deepEqual(phaseAt(Date.parse('2026-11-20T12:00:00+09:00')), { phase: 'before', days: 4 })
assert.equal(phaseAt(Date.parse('2026-11-24T09:00:00+09:00')).phase, 'open')
assert.equal(phaseAt(Date.parse('2027-01-07T18:00:01+09:00')).phase, 'docs')
assert.equal(phaseAt(Date.parse('2027-01-14T18:00:01+09:00')).phase, 'closed')

console.log('check-national-scholarship: ok')
