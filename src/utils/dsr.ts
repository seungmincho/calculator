// DSR(총부채원리금상환비율) 순수 계산 — 2026.10 기준. 회귀 체크: node scripts/check-dsr.ts
//
// 근거
// - 차주단위 DSR: 총대출 1억원 초과 차주, 은행권 40% / 2금융권 50% (2022.7 3단계~)
// - 스트레스 DSR 3단계(2025.7.1~): 기본 스트레스 금리 1.5%, 신용대출은 잔액 1억 초과 시에만 부과
//   (금융위 2025.5.20 「3단계 스트레스 DSR 시행방안」)
// - 수도권·규제지역 주담대 스트레스 금리 하한 1.5% → 3.0% (2025.10.16~, 10.15 「대출수요 관리 강화 방안」)
// - 지방(서울·경기·인천·규제지역 외) 주담대 0.75%(2단계 수준) — 2026.12.31까지 (은행연합회 스트레스금리 공시 2026.6.30)
// - 기존 대출은 실행 당시 스트레스 금리로 원리금을 계산(소급 없음) — 이 도구는 입력 금리 그대로 계산
// - 혼합·주기형 반영비율 (은행연합회 스트레스금리 공시 2026.6.30, 적용 2026.7.1~12.31
//   https://portal.kfb.or.kr/compare/stress_loan.php) — 고정기간(변동주기)/만기 비중별
//   수도권·규제지역(3단계): 혼합형 30% 미만 80% · 30~50% 60% · 50~70% 40% · 70% 이상 미적용
//                          주기형 30% 미만 40% · 30~50% 30% · 50~70% 20% · 70% 이상 미적용
//   지방(2단계 비율, ~2026.12.31): 혼합형 60·40·20·0%, 주기형 30·20·10·0%
//   변동형 = 고정기간(변동주기) 5년 미만
// - 신용대출(잔액 1억 초과 시만): 만기 5년 이상 고정 미적용, 3~5년 고정 60%, 그 외 100%
//   ※ 신용대출의 혼합·주기형 반영비율은 확인 필요 → 신용대출은 변동/고정만 지원
//
// 원리금 산정(DSR 산식 가정)
// - 주담대 분할상환: 실제 상환 첫 12개월 합 / 만기일시: 원금 ÷ min(만기, 10년) + 연 이자 (10년 상한은 확인 필요)
// - 신용대출: 원금 ÷ 5년 + 연 이자 (산정만기 5년, 2022.7~) — 분할상환 신용대출의 실제 상환액 인정 여부는 확인 필요
// - 마이너스통장: 약정 한도 기준으로 신용대출과 동일 (한도 × 금리를 이자로 보는 것은 보수적 가정)
// - 기타 분할상환(카드론·할부·학자금 등): 원리금균등 실제 상환액
// - 전세대출: 원금 제외, 이자만 — 1주택자가 수도권·규제지역에서 2025.10.29 이후 신규로 받은 경우만 반영

export type LoanKind = 'mortgage' | 'credit' | 'revolving' | 'installment' | 'jeonse'
export type Method = 'equalPayment' | 'equalPrincipal' | 'bullet'
export type RateType = 'variable' | 'mixed' | 'periodic' | 'fixed'
export type Region = 'capital' | 'local'
export type Sector = 'bank' | 'nonbank'

export const DSR_CAP: Record<Sector, number> = { bank: 40, nonbank: 50 }
/** 차주단위 DSR 적용: 총대출 이 금액 초과 */
export const DSR_APPLY_OVER = 100_000_000
export const STRESS = { capitalMortgage: 3.0, localMortgage: 0.75, base: 1.5 }
/** 신용대출 스트레스 금리: 신용대출 잔액이 이 금액 초과일 때만 */
export const CREDIT_STRESS_OVER = 100_000_000
export const CREDIT_TERM_YEARS = 5
export const BULLET_MAX_YEARS = 10
/** 수도권·규제지역 주담대 만기 상한(6.27 대책) */
export const CAPITAL_MAX_TERM = 30
/** 수도권·규제지역 주택구입목적 주담대 최대 한도 (10.15 대책, 시가 기준) */
export const CAPITAL_MORTGAGE_CAPS = [
  { upTo: 1_500_000_000, cap: 600_000_000 },
  { upTo: 2_500_000_000, cap: 400_000_000 },
  { upTo: Infinity, cap: 200_000_000 },
]

export interface Loan {
  kind: LoanKind
  amount: number   // 잔액(마이너스통장은 약정 한도), 원
  rate: number     // 연 %
  years: number    // 잔여 만기(년) — 주담대·기타 분할상환만 사용
  method?: Method  // 주담대만
  counted?: boolean // 전세대출: DSR 반영 대상 여부
}

const pmt = (r: number, n: number) => (r === 0 ? 1 / n : (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))

/** 원금 1원당 DSR 연간 원리금 */
export function annualFactor(l: Omit<Loan, 'amount'>): number {
  const y = l.rate / 100
  const r = y / 12
  switch (l.kind) {
    case 'credit':
    case 'revolving':
      return 1 / CREDIT_TERM_YEARS + y
    case 'jeonse':
      return l.counted ? y : 0
    case 'installment': {
      const n = Math.max(1, Math.round(l.years * 12))
      return Math.min(12, n) * pmt(r, n)
    }
    case 'mortgage': {
      const n = Math.max(1, Math.round(l.years * 12))
      if (l.method === 'bullet') return 1 / Math.min(Math.max(l.years, 1), BULLET_MAX_YEARS) + y
      if (l.method === 'equalPrincipal') {
        const m = Math.min(12, n) // 첫 12회차: 원금 m/n + 이자 r·Σ(1 - k/n)
        return m / n + r * (m - (m * (m - 1)) / 2 / n)
      }
      return Math.min(12, n) * pmt(r, n)
    }
  }
}

export const annualRepay = (l: Loan) => (l.amount > 0 ? l.amount * annualFactor(l) : 0)

/** 혼합형(고정기간)·주기형(변동주기) 반영비율 — 비중 30% 미만 / 30~50% / 50~70% / 70% 이상 */
const MIXED_RATIOS: Record<Region, number[]> = { capital: [0.8, 0.6, 0.4, 0], local: [0.6, 0.4, 0.2, 0] }
const PERIODIC_RATIOS: Record<Region, number[]> = { capital: [0.4, 0.3, 0.2, 0], local: [0.3, 0.2, 0.1, 0] }

/** 혼합형(고정기간)·주기형(변동주기) 스트레스 금리 반영비율 */
export function stressRatio(rateType: RateType, fixedYears: number, termYears: number, region: Region = 'capital'): number {
  if (rateType === 'variable') return 1
  if (rateType === 'fixed') return 0
  if (fixedYears < 5) return 1 // 고정기간(변동주기) 5년 미만 = 변동형
  const share = termYears > 0 ? fixedYears / termYears : 1
  const i = share < 0.3 ? 0 : share < 0.5 ? 1 : share < 0.7 ? 2 : 3
  return (rateType === 'mixed' ? MIXED_RATIOS : PERIODIC_RATIOS)[region][i]
}

export interface NewLoanSpec {
  kind: 'mortgage' | 'credit'
  rate: number
  years: number
  method: Method
  rateType: RateType
  fixedYears: number
  region: Region
}

/** 신규 대출 스트레스 가산금리(%p). creditTotal = 신규 포함 신용대출(마통 한도 포함) 잔액 */
export function stressAdd(s: NewLoanSpec, creditTotal = 0): number {
  if (s.kind === 'credit') {
    if (creditTotal <= CREDIT_STRESS_OVER) return 0
    const ratio = s.rateType !== 'fixed' ? 1 : s.years >= 5 ? 0 : s.years >= 3 ? 0.6 : 1
    return +(STRESS.base * ratio).toFixed(4)
  }
  const base = s.region === 'capital' ? STRESS.capitalMortgage : STRESS.localMortgage
  return +(base * stressRatio(s.rateType, s.fixedYears, s.years, s.region)).toFixed(4)
}

const asLoan = (s: NewLoanSpec, amount: number, add: number): Loan => ({
  kind: s.kind, amount, rate: s.rate + add, years: s.years, method: s.method,
})

export const existingAnnual = (loans: Loan[]) => loans.reduce((a, l) => a + annualRepay(l), 0)
export const creditBalance = (loans: Loan[]) =>
  loans.filter((l) => l.kind === 'credit' || l.kind === 'revolving').reduce((a, l) => a + l.amount, 0)

export const dsr = (income: number, annual: number) => (income > 0 ? (annual / income) * 100 : 0)

/** 신규 대출 연간 원리금(스트레스 적용 여부 선택) */
export function newLoanAnnual(s: NewLoanSpec, amount: number, existing: Loan[], stressed: boolean): { annual: number; add: number } {
  const add = stressed ? stressAdd(s, creditBalance(existing) + amount) : 0
  return { annual: annualRepay(asLoan(s, amount, add)), add }
}

/**
 * DSR 한도 안에서 신규로 빌릴 수 있는 최대 원금(만원 단위 내림).
 * 신용대출 스트레스는 잔액 1억 초과 시에만 붙으므로, 1억 경계까지는 가산 없이 빌릴 수 있다.
 */
export function maxNewLoan(income: number, cap: number, existing: Loan[], s: NewLoanSpec, stressed: boolean): number {
  const room = (income * cap) / 100 - existingAnnual(existing)
  if (room <= 0) return 0
  const plain = room / annualFactor(asLoan(s, 0, 0))
  let p = plain
  if (stressed) {
    if (s.kind === 'credit') {
      const ex = creditBalance(existing)
      if (ex + plain > CREDIT_STRESS_OVER) {
        const withStress = room / annualFactor(asLoan(s, 0, stressAdd(s, Infinity)))
        p = Math.max(withStress, Math.min(plain, CREDIT_STRESS_OVER - ex))
      }
    } else {
      p = room / annualFactor(asLoan(s, 0, stressAdd(s)))
    }
  }
  return Math.max(0, Math.floor(p / 1e4) * 1e4)
}

/** 규제상 상한(안내용): 수도권·규제지역 주택구입 주담대 6억(시가 15억 이하 기준), 신용대출 연소득 이내 */
export function regulatoryCap(s: NewLoanSpec, income: number): number | null {
  if (s.kind === 'credit') return income
  return s.region === 'capital' ? CAPITAL_MORTGAGE_CAPS[0].cap : null
}
