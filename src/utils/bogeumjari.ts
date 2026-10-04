// 보금자리론 자격·한도·금리 순수 로직. 회귀 체크: node scripts/check-bogeumjari.ts
// 출처 (2026-10-04 확인)
// - 상품 조건: https://www.hf.go.kr/ko/sub01/sub01_01_01.do (일반) · sub01_01_02.do (생애최초 등 특례)
// - 금리: https://www.hf.go.kr/ko/sub01/sub01_01_04.do (2026-10-01 공시)
// - 규제지역 정책모기지 LTV·DTI: 금융위 10.15 대책 FAQ https://www.fsc.go.kr/po020201/85466
// - 수도권·규제지역 생애최초 LTV 80→70%: 금융위 6.27 대책 https://www.fsc.go.kr/no010101/84824

export type LoanType = 'general' | 'first' | 'newlywed' | 'multichild'
export type Owned = '0' | '1' | '2'
export type HouseKind = 'apt' | 'other'
/** 담보주택 소재지: 지방(비수도권) / 수도권(규제지역 외) / 규제지역(조정대상·투기과열·투기지역) */
export type Region = 'local' | 'capital' | 'regulated'
export const REGIONS: Region[] = ['local', 'capital', 'regulated']

/** 금리 기준일 — 매월 1일 공사 공시. 바뀌면 PERIOD_RATES와 함께 여기만 수정 */
export const RATE_BASIS = { date: '2026-10-01', label: '2026년 10월', url: 'https://www.hf.go.kr/ko/sub01/sub01_01_04.do' }

/** 아낌e 보금자리론 기준금리 (2026-10-01 공시, 9월과 동일). 공식 만기는 10·15·20·30·40·50년 */
export const PERIOD_RATES: Record<string, number> = {
  '10': 4.90,
  '15': 5.00,
  '20': 5.05,
  '30': 5.10,
  '40': 5.15,
  '50': 5.20,
}
export const DISCOUNT_CAP = 1.0
/** 규제지역 담보주택 가산금리 (전세사기피해자 제외) */
export const REGULATED_SURCHARGE = 0.2
/** 우대 최대 적용 시 최저 금리 (규제지역 가산 전) */
export const MIN_RATE = Math.min(...Object.values(PERIOD_RATES)) - DISCOUNT_CAP

const M = 10_000
export const HOUSE_PRICE_LIMIT = 60_000 * M // 6억원 (전국 동일)
export const DTI_LIMIT = 60
/** 규제지역 LTV·DTI 미차감 '실수요자': 구입용도·무주택·주택 6억 이하·부부합산 7천만원 이하 */
const REAL_DEMAND_INCOME = 7_000 * M

/** 부부합산 연소득 기준 — 기본 7천만, 신혼(7년내) 8.5천만, 미성년 자녀 1명 9천만, 2명 이상 1억 */
export function getIncomeLimit(type: LoanType, children: number): number {
  let limit = 7_000 * M
  if (children === 1) limit = 9_000 * M
  else if (children >= 2) limit = 10_000 * M
  if (type === 'newlywed') limit = Math.max(limit, 8_500 * M)
  if (type === 'multichild') limit = Math.max(limit, 10_000 * M)
  return limit
}

/** 최대 대출한도 — 기본 3.6억, 생애최초 4.2억, 다자녀·전세사기피해자 4억 */
export const MAX_LOAN: Record<LoanType, number> = {
  general: 36_000 * M,
  first: 42_000 * M,
  newlywed: 36_000 * M,
  multichild: 40_000 * M,
}
const FRAUD_MAX_LOAN = 40_000 * M

/** 우대금리 (합산 최대 1.0%p). 신혼가구 0.3, 다자녀 2자녀 0.5 / 3자녀+ 0.7 은 입력값에서 자동 적용. 신혼가구와 신생아출산가구는 중복 불가 */
export const PERKS: { id: string; label: string; rate: number; desc: string }[] = [
  { id: 'newborn', label: '신생아출산가구', rate: 0.2, desc: '신혼가구 우대와 중복 불가' },
  { id: 'youth', label: '저소득청년', rate: 0.1, desc: '청년·소득 요건 충족 시' },
  { id: 'single', label: '한부모가구', rate: 0.7, desc: '사회적 배려층' },
  { id: 'disabled', label: '장애인가구', rate: 0.7, desc: '사회적 배려층' },
  { id: 'multicultural', label: '다문화가구', rate: 0.7, desc: '사회적 배려층' },
  { id: 'green', label: '녹색건축물', rate: 0.1, desc: '인증 주택 구입 시' },
  { id: 'unsold', label: '미분양주택', rate: 0.2, desc: '미분양관리지역 미분양주택' },
  { id: 'fraud', label: '전세사기피해자', rate: 1.0, desc: '피해자 결정 시 · 한도 4억, 규제지역 가산·차감 없음' },
]

export const LOAN_TYPE_INFO: Record<LoanType, { label: string; sublabel: string; benefit: string }> = {
  first: { label: '생애최초', sublabel: '처음 집 구입', benefit: 'LTV 80%(수도권 70%) · 한도 4.2억' },
  newlywed: { label: '신혼부부', sublabel: '혼인 7년 이내', benefit: '소득 8.5천만 · 우대 0.3%p' },
  multichild: { label: '다자녀', sublabel: '미성년 자녀 2명 이상', benefit: '한도 4억 · 우대 0.5~0.7%p' },
  general: { label: '일반', sublabel: '기본 조건', benefit: 'LTV 70% · 한도 3.6억' },
}

export interface BogeumjariInput {
  income: number
  price: number
  type: LoanType
  children: number
  period: string
  age: number
  owned: Owned
  kind: HouseKind
  region: Region
  debtMonthly: number // 기존 대출 월 원리금
  want: number // 희망 대출액 (0 = 최대)
  perks: string[]
}

export type CheckStatus = 'pass' | 'warn' | 'fail'
export interface CheckItem { label: string; status: CheckStatus; detail: string }

export const annuity = (loan: number, annualRate: number, months: number) => {
  const r = annualRate / 100 / 12
  return r === 0 ? loan / months : (loan * r) / (1 - Math.pow(1 + r, -months))
}

export const fmtKRW = (n: number) => {
  const v = Math.round(n)
  let eok = Math.floor(v / 100_000_000)
  let man = Math.round((v % 100_000_000) / 10_000)
  if (man === 10_000) { eok += 1; man = 0 }
  if (eok > 0) return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`
  if (man > 0) return `${man.toLocaleString()}만원`
  return `${v.toLocaleString()}원`
}

/**
 * LTV. 생애최초 80%(수도권·규제지역 70%), 그 외 아파트 70%·기타 65%.
 * 규제지역은 10%p 차감 — 생애최초·전세사기피해자·실수요자는 미차감.
 * ponytail: CB 614점 이하·소득추정 시 10%p 차감은 미반영(안내 문구만)
 */
export function getLtv(type: LoanType, kind: HouseKind, region: Region, exempt: boolean): number {
  if (type === 'first') return region === 'local' ? 0.80 : 0.70
  const base = kind === 'apt' ? 0.70 : 0.65
  return region === 'regulated' && !exempt ? Math.round((base - 0.10) * 100) / 100 : base
}

export const rateFor = (base: number, discount: number, surcharge: number) =>
  Number((base - discount + surcharge).toFixed(2))

export function calcBogeumjari(i: BogeumjariInput) {
  const months = parseInt(i.period) * 12
  const incomeLimit = getIncomeLimit(i.type, i.children)
  const isNewlywed = i.type === 'newlywed'
  const fraud = i.perks.includes('fraud')
  const regulated = i.region === 'regulated'
  const realDemand = i.owned === '0' && i.income <= REAL_DEMAND_INCOME && i.price <= HOUSE_PRICE_LIMIT
  const exempt = i.type === 'first' || fraud || realDemand // 규제지역 LTV·DTI 미차감

  // ── 우대금리 ──
  const discounts: { label: string; rate: number }[] = []
  if (isNewlywed) discounts.push({ label: '신혼가구', rate: 0.3 })
  if (i.children >= 3) discounts.push({ label: '다자녀(3자녀 이상)', rate: 0.7 })
  else if (i.children === 2) discounts.push({ label: '다자녀(2자녀)', rate: 0.5 })
  for (const p of PERKS) {
    if (!i.perks.includes(p.id)) continue
    if (p.id === 'newborn' && isNewlywed) continue // 신혼가구와 중복 불가 (0.3 > 0.2)
    discounts.push({ label: p.label, rate: p.rate })
  }
  const discountSum = discounts.reduce((s, d) => s + d.rate, 0)
  const totalDiscount = Math.min(discountSum, DISCOUNT_CAP)
  const surcharge = regulated && !fraud ? REGULATED_SURCHARGE : 0
  const baseRate = PERIOD_RATES[i.period] ?? PERIOD_RATES['30']
  const rate = rateFor(baseRate, totalDiscount, surcharge)

  // ── 한도: LTV / 상품 상한 / DTI 중 가장 작은 값 ──
  const ltv = getLtv(i.type, i.kind, i.region, exempt)
  const ltvDeducted = regulated && !exempt
  const ltvLimit = Math.floor(i.price * ltv)
  const capLimit = fraud ? Math.max(MAX_LOAN[i.type], FRAUD_MAX_LOAN) : MAX_LOAN[i.type]
  const dtiCap = regulated && !exempt ? DTI_LIMIT - 10 : DTI_LIMIT
  // DTI = (신규 원리금 + 기존 대출 원리금) / 연소득. 신규 대출은 원리금균등 기준으로 역산.
  // ponytail: 원금균등 선택 시에도 원리금균등으로 역산 — 실제 심사는 첫해 상환액 기준일 수 있음
  const monthlyBudget = (i.income / 12) * (dtiCap / 100) - i.debtMonthly
  const dtiLimit = monthlyBudget > 0 ? Math.floor(monthlyBudget / annuity(1, rate, months)) : 0
  const ltvNote = ltvDeducted ? '규제지역 10%p 차감' : i.type === 'first' && i.region !== 'local' ? '수도권·규제지역 생애최초' : '주택가격 기준'
  const limits = [
    { key: 'ltv' as const, label: `LTV ${Math.round(ltv * 100)}% (${ltvNote})`, amount: ltvLimit },
    { key: 'cap' as const, label: `${fraud ? '전세사기피해자' : LOAN_TYPE_INFO[i.type].label} 상품 상한`, amount: capLimit },
    { key: 'dti' as const, label: `DTI ${dtiCap}% (소득 기준)`, amount: dtiLimit },
  ]
  const binding = limits.reduce((a, b) => (b.amount < a.amount ? b : a))
  const maxLoan = Math.max(0, Math.floor(binding.amount / 10_000) * 10_000)
  const loan = i.want > 0 ? Math.min(i.want, maxLoan) : maxLoan
  const monthly = Math.round(annuity(loan, rate, months))
  const dti = i.income > 0 ? ((monthly + i.debtMonthly) * 12 / i.income) * 100 : 0

  // ── 자격 체크리스트 ──
  const checks: CheckItem[] = []
  checks.push(i.income <= incomeLimit
    ? { label: '소득', status: 'pass', detail: `연 ${fmtKRW(i.income)} ≤ 기준 ${fmtKRW(incomeLimit)}` }
    : { label: '소득', status: 'fail', detail: `연 ${fmtKRW(i.income)} — 기준 ${fmtKRW(incomeLimit)} 초과` })
  checks.push(i.price <= HOUSE_PRICE_LIMIT
    ? { label: '주택가격', status: 'pass', detail: `${fmtKRW(i.price)} ≤ 6억원` }
    : { label: '주택가격', status: 'fail', detail: `${fmtKRW(i.price)} — 6억원 초과 주택은 대상 아님` })
  if (i.owned === '2') checks.push({ label: '주택 보유', status: 'fail', detail: '2주택 이상 보유 시 신청 불가 (무주택 또는 1주택만)' })
  else if (i.owned === '1' && i.type === 'first') checks.push({ label: '주택 보유', status: 'fail', detail: '생애최초는 신청일 현재 부부 모두 무주택이고 과거 소유 이력이 없어야 함' })
  else if (i.owned === '1') checks.push({ label: '주택 보유', status: 'warn', detail: '1주택자는 기존 주택을 대출실행일로부터 3년 내 처분하는 조건' })
  else checks.push({ label: '주택 보유', status: 'pass', detail: i.type === 'first' ? '무주택 · 과거 소유 이력 없음 (본인 확인)' : '무주택' })
  if (i.type === 'multichild' && i.children < 2) checks.push({ label: '유형 요건', status: 'fail', detail: '다자녀 유형은 미성년 자녀 2명 이상' })
  else if (i.type === 'newlywed') checks.push({ label: '유형 요건', status: 'warn', detail: '혼인신고일 7년 이내인지 확인' })
  const p = i.period
  if (p === '40' || p === '50') {
    const ok = p === '40' ? i.age < 40 || (isNewlywed && i.age < 50) : i.age < 35 || (isNewlywed && i.age < 40)
    const rule = p === '40' ? '만 40세 미만 (신혼가구 만 50세 미만)' : '만 35세 미만 (신혼가구 만 40세 미만)'
    checks.push(ok
      ? { label: `만기 ${p}년`, status: 'pass', detail: `만 ${i.age}세 — ${rule}` }
      : { label: `만기 ${p}년`, status: 'fail', detail: `만 ${i.age}세 — ${rule} 조건 미충족, 더 짧은 만기 선택` })
  }
  checks.push(monthlyBudget > 0
    ? { label: '상환능력(DTI)', status: 'pass', detail: `DTI ${dti.toFixed(1)}% ≤ ${dtiCap}%` }
    : { label: '상환능력(DTI)', status: 'fail', detail: `기존 대출 상환액만으로 DTI ${dtiCap}% 초과` })
  if (i.region !== 'local') checks.push({ label: '전입 의무', status: 'warn', detail: '수도권·규제지역 주택은 대출 실행 후 6개월 이내 전입 필수' })

  const eligible = !checks.some((c) => c.status === 'fail') && loan > 0

  // ── 상환방식 비교 ──
  const r = rate / 100 / 12
  const principalFirst = loan / months + loan * r
  const principalLast = loan / months + (loan / months) * r
  const methods = {
    annuity: { first: monthly, last: monthly, interest: monthly * months - loan },
    principal: { first: Math.round(principalFirst), last: Math.round(principalLast), interest: Math.round(loan * r * (months + 1) / 2) },
  }

  return {
    eligible, checks, incomeLimit, discounts, discountSum, totalDiscount, surcharge, baseRate, rate,
    ltv, dtiCap, limits, binding, maxLoan, loan, monthly, dti, methods, months,
  }
}
