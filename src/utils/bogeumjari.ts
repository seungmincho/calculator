// 보금자리론 자격·한도·금리 순수 로직. 회귀 체크: node scripts/check-bogeumjari.ts
// 출처 (2026-10-04 확인)
// - 상품 조건: https://www.hf.go.kr/ko/sub01/sub01_01_01.do (일반) · sub01_01_02.do (생애최초 등 특례)
// - 금리: https://www.hf.go.kr/ko/sub01/sub01_01_04.do (2026-10-01 공시)
// - 규제지역 정책모기지 LTV·DTI: 금융위 10.15 대책 FAQ https://www.fsc.go.kr/po020201/85466
// - 수도권·규제지역 생애최초 LTV 80→70%: 금융위 6.27 대책 https://www.fsc.go.kr/no010101/84824
// - CB점수 271점 이상·271~614점 LTV 10%p 차감, 전세사기피해자 특례: sub01_01_01.do · sub01_01_02.do (2026-10-04 확인)

export type LoanType = 'general' | 'first' | 'newlywed' | 'multichild'
export type Owned = '0' | '1' | '2'
export type HouseKind = 'apt' | 'other'
/** 담보주택 소재지: 지방(비수도권) / 수도권(규제지역 외) / 규제지역(조정대상·투기과열·투기지역) */
export type Region = 'local' | 'capital' | 'regulated'
export const REGIONS: Region[] = ['local', 'capital', 'regulated']
/** NICE CB점수: high 615점 이상 / mid 271~614점(LTV 10%p 차감) / low 270점 이하(취급 불가) — hf sub01_01_01 (2026-10-04 확인) */
export type Credit = 'high' | 'mid' | 'low'
export const CREDITS: Credit[] = ['high', 'mid', 'low']

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
/**
 * 전세사기피해자 보금자리론 (결정문 정본 확인): 9억 이하 주택·소득상한 없음·한도 4억,
 * 신규주택 LTV 80%(낙찰주택 100%는 미반영)·DTI 100%, 규제지역 가산 없음.
 * 출처: https://www.hf.go.kr/ko/sub01/sub01_01_02.do (2026-10-04 확인)
 */
export const FRAUD = { priceLimit: 90_000 * M, ltv: 0.80, dti: 100, maxLoan: 40_000 * M }

/** 우대금리 (합산 최대 1.0%p). 신혼가구 0.3, 다자녀 2자녀 0.5 / 3자녀+ 0.7 은 입력값에서 자동 적용. 신혼가구와 신생아출산가구는 중복 불가 */
// 화면 문구(이름·설명)는 messages bogeumjariLoan.perks.<id> · <id>Desc. label 은 discounts(회귀 체크)용
export const PERKS: { id: string; label: string; rate: number }[] = [
  { id: 'newborn', label: '신생아출산가구', rate: 0.2 },
  { id: 'youth', label: '저소득청년', rate: 0.1 },
  { id: 'single', label: '한부모가구', rate: 0.7 },
  { id: 'disabled', label: '장애인가구', rate: 0.7 },
  { id: 'multicultural', label: '다문화가구', rate: 0.7 },
  { id: 'green', label: '녹색건축물', rate: 0.1 },
  { id: 'unsold', label: '미분양주택', rate: 0.2 },
  { id: 'fraud', label: '전세사기피해자', rate: 1.0 },
]

/** 신청 유형 (화면 순서). 이름·설명은 messages bogeumjariLoan.loanType.<type> */
export const LOAN_TYPES: LoanType[] = ['first', 'newlywed', 'multichild', 'general']

/**
 * 디딤돌대출(주택도시기금) 자격 힌트 — 금리 계산 없이 소득·주택가격·무주택 여부만 비교.
 * 기준: 소득 6천만(생애최초·2자녀 7천만, 신혼 8.5천만), 주택 5억(신혼·2자녀 6억),
 * 한도 2억(생애최초 2.4억, 신혼·2자녀 3.2억), 금리 연 2.85~4.15%. 세부 요건은 nhuf.molit.go.kr
 */
export const DIDIMDOL = { rate: '2.85~4.15', url: 'https://nhuf.molit.go.kr' }
export function didimdolHint(i: { income: number; price: number; type: LoanType; children: number; owned: Owned }) {
  const newlywed = i.type === 'newlywed'
  const twoKids = i.children >= 2
  const incomeLimit = (newlywed ? 8_500 : i.type === 'first' || twoKids ? 7_000 : 6_000) * M
  const priceLimit = (newlywed || twoKids ? 60_000 : 50_000) * M
  const maxLoan = (newlywed || twoKids ? 32_000 : i.type === 'first' ? 24_000 : 20_000) * M
  const incomeOk = i.income <= incomeLimit
  const priceOk = i.price <= priceLimit
  const ownedOk = i.owned === '0'
  return { incomeLimit, priceLimit, maxLoan, incomeOk, priceOk, ownedOk, ok: incomeOk && priceOk && ownedOk }
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
  credit?: Credit // 기본 'high'
}

export type CheckStatus = 'pass' | 'warn' | 'fail'
/** 화면 문구는 messages bogeumjariLoan.checks.<id>.label · checks.<id>.<msg> (vars 치환). label 은 회귀 체크용 */
export interface CheckItem { id: string; label: string; status: CheckStatus; msg: string; vars?: Record<string, string | number> }

export const annuity = (loan: number, annualRate: number, months: number) => {
  const r = annualRate / 100 / 12
  return r === 0 ? loan / months : (loan * r) / (1 - Math.pow(1 + r, -months))
}

/**
 * "3억 6,000만원" 표기. tr(번역 함수)을 넘기면 bogeumjariLoan.fmt.{eokMan|eok|man|won} 템플릿으로
 * 만든다 — vars: eok, man(콤마), won(만 단위 반올림한 원 금액, 콤마). ko 템플릿은 아래 한국어와 같은 결과.
 */
export const fmtKRW = (n: number, tr?: (key: string, vars: Record<string, unknown>) => string) => {
  const v = Math.round(n)
  let eok = Math.floor(v / 100_000_000)
  let man = Math.round((v % 100_000_000) / 10_000)
  if (man === 10_000) { eok += 1; man = 0 }
  if (tr) {
    const key = eok > 0 ? (man > 0 ? 'eokMan' : 'eok') : man > 0 ? 'man' : 'won'
    return tr(`fmt.${key}`, { eok, man: man.toLocaleString(), won: (key === 'won' ? v : eok * 100_000_000 + man * 10_000).toLocaleString() })
  }
  if (eok > 0) return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`
  if (man > 0) return `${man.toLocaleString()}만원`
  return `${v.toLocaleString()}원`
}

/**
 * LTV. 생애최초 80%(수도권·규제지역 70%), 그 외 아파트 70%·기타 65%.
 * 규제지역은 10%p 차감 — 생애최초·전세사기피해자·실수요자는 미차감.
 * CB점수 271~614점 10%p 추가 차감은 calcBogeumjari에서 적용.
 * ponytail: 소득추정방법 사용 시 10%p 차감은 미반영(안내 문구만)
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
  const credit = i.credit ?? 'high'
  // CB 271~614점 차감: hf 원문상 미차감 예외는 '규제지역' 차감에만 명시 → 생애최초도 차감.
  // 전세사기피해자는 별도 LTV(신규주택 80%) 기준이라 미적용 (공사 확인 필요)
  const cbDeducted = credit === 'mid' && !fraud
  const priceLimit = fraud ? FRAUD.priceLimit : HOUSE_PRICE_LIMIT

  // ── 우대금리 ──
  const discounts: { id: string; label: string; rate: number }[] = []
  if (isNewlywed) discounts.push({ id: 'newlywed', label: '신혼가구', rate: 0.3 })
  if (i.children >= 3) discounts.push({ id: 'multichild3', label: '다자녀(3자녀 이상)', rate: 0.7 })
  else if (i.children === 2) discounts.push({ id: 'multichild2', label: '다자녀(2자녀)', rate: 0.5 })
  for (const p of PERKS) {
    if (!i.perks.includes(p.id)) continue
    if (p.id === 'newborn' && isNewlywed) continue // 신혼가구와 중복 불가 (0.3 > 0.2)
    discounts.push({ id: p.id, label: p.label, rate: p.rate })
  }
  const discountSum = discounts.reduce((s, d) => s + d.rate, 0)
  const totalDiscount = Math.min(discountSum, DISCOUNT_CAP)
  const surcharge = regulated && !fraud ? REGULATED_SURCHARGE : 0
  const baseRate = PERIOD_RATES[i.period] ?? PERIOD_RATES['30']
  const rate = rateFor(baseRate, totalDiscount, surcharge)

  // ── 한도: LTV / 상품 상한 / DTI 중 가장 작은 값 ──
  const ltv = fraud ? FRAUD.ltv : Math.round((getLtv(i.type, i.kind, i.region, exempt) - (cbDeducted ? 0.10 : 0)) * 100) / 100
  const ltvDeducted = regulated && !exempt
  const ltvLimit = Math.floor(i.price * ltv)
  const capLimit = fraud ? Math.max(MAX_LOAN[i.type], FRAUD.maxLoan) : MAX_LOAN[i.type]
  const dtiCap = fraud ? FRAUD.dti : regulated && !exempt ? DTI_LIMIT - 10 : DTI_LIMIT
  // DTI = (신규 원리금 + 기존 대출 원리금) / 연소득. 신규 대출은 원리금균등 기준으로 역산.
  // ponytail: 원금균등 선택 시에도 원리금균등으로 역산 — 실제 심사는 첫해 상환액 기준일 수 있음
  const monthlyBudget = (i.income / 12) * (dtiCap / 100) - i.debtMonthly
  const dtiLimit = monthlyBudget > 0 ? Math.floor(monthlyBudget / annuity(1, rate, months)) : 0
  // LTV 근거. 화면 문구는 messages bogeumjariLoan.limits.ltvNote.<id>
  const ltvNote = fraud ? 'fraud'
    : ltvDeducted && cbDeducted ? 'both' : ltvDeducted ? 'regulated' : cbDeducted ? 'credit'
    : i.type === 'first' && i.region !== 'local' ? 'firstCapital' : 'price'
  const limits = [
    { key: 'ltv' as const, amount: ltvLimit },
    { key: 'cap' as const, amount: capLimit },
    { key: 'dti' as const, amount: dtiLimit },
  ]
  const binding = limits.reduce((a, b) => (b.amount < a.amount ? b : a))
  const maxLoan = Math.max(0, Math.floor(binding.amount / 10_000) * 10_000)
  const loan = i.want > 0 ? Math.min(i.want, maxLoan) : maxLoan
  const monthly = Math.round(annuity(loan, rate, months))
  const dti = i.income > 0 ? ((monthly + i.debtMonthly) * 12 / i.income) * 100 : 0

  // ── 자격 체크리스트 ──
  const checks: CheckItem[] = []
  // 금액 vars는 원 단위 숫자 — 화면에서 fmtKRW(n, t)로 언어에 맞게 표기
  const incomeVars = { income: i.income, limit: incomeLimit }
  checks.push(fraud
    ? { id: 'income', label: '소득', status: 'pass', msg: 'fraud' }
    : i.income <= incomeLimit
      ? { id: 'income', label: '소득', status: 'pass', msg: 'pass', vars: incomeVars }
      : { id: 'income', label: '소득', status: 'fail', msg: 'fail', vars: incomeVars })
  const priceVars = { price: i.price, limit: priceLimit }
  checks.push(i.price <= priceLimit
    ? { id: 'price', label: '주택가격', status: 'pass', msg: 'pass', vars: priceVars }
    : { id: 'price', label: '주택가격', status: 'fail', msg: 'fail', vars: priceVars })
  if (credit === 'low') checks.push({ id: 'credit', label: '신용점수', status: 'fail', msg: 'low' })
  else if (cbDeducted) checks.push({ id: 'credit', label: '신용점수', status: 'warn', msg: 'mid' })
  if (i.owned === '2') checks.push({ id: 'owned', label: '주택 보유', status: 'fail', msg: 'two' })
  else if (i.owned === '1' && i.type === 'first') checks.push({ id: 'owned', label: '주택 보유', status: 'fail', msg: 'oneFirst' })
  else if (i.owned === '1') checks.push({ id: 'owned', label: '주택 보유', status: 'warn', msg: 'one' })
  else checks.push({ id: 'owned', label: '주택 보유', status: 'pass', msg: i.type === 'first' ? 'noneFirst' : 'none' })
  if (i.type === 'multichild' && i.children < 2) checks.push({ id: 'type', label: '유형 요건', status: 'fail', msg: 'multichild' })
  else if (i.type === 'newlywed') checks.push({ id: 'type', label: '유형 요건', status: 'warn', msg: 'newlywed' })
  const p = i.period
  if (p === '40' || p === '50') {
    // 40년: 만 40세 미만(신혼가구 만 50세 미만), 50년: 만 35세 미만(신혼가구 만 40세 미만)
    const ok = p === '40' ? i.age < 40 || (isNewlywed && i.age < 50) : i.age < 35 || (isNewlywed && i.age < 40)
    checks.push({ id: 'maturity', label: `만기 ${p}년`, status: ok ? 'pass' : 'fail', msg: `${ok ? 'pass' : 'fail'}${p}`, vars: { years: p, age: i.age } })
  }
  checks.push(monthlyBudget > 0
    ? { id: 'dti', label: '상환능력(DTI)', status: 'pass', msg: 'pass', vars: { dti: dti.toFixed(1), cap: dtiCap } }
    : { id: 'dti', label: '상환능력(DTI)', status: 'fail', msg: 'fail', vars: { cap: dtiCap } })
  if (i.region !== 'local') checks.push({ id: 'moveIn', label: '전입 의무', status: 'warn', msg: 'warn' })

  const eligible = !checks.some((c) => c.status === 'fail') && loan > 0

  // ── 상환방식 비교 ──
  const r = rate / 100 / 12
  const principalFirst = loan / months + loan * r
  const principalLast = loan / months + (loan / months) * r
  const methods = {
    annuity: { first: monthly, last: monthly, interest: Math.max(0, monthly * months - loan) }, // 희망액 수백 원이면 월 상환 반올림이 0원 → 음수 이자
    principal: { first: Math.round(principalFirst), last: Math.round(principalLast), interest: Math.round(loan * r * (months + 1) / 2) },
  }

  return {
    eligible, checks, incomeLimit, discounts, discountSum, totalDiscount, surcharge, baseRate, rate,
    ltv, ltvNote, dtiCap, limits, binding, maxLoan, loan, monthly, dti, methods, months,
  }
}
