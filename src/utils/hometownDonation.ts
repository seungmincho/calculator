// 고향사랑기부금 계산기 (/hometown-donation). 회귀 체크: node scripts/check-hometown-donation.ts
// 세액공제는 yearEndTax.ts(연말정산 계산기와 같은 함수). 여기서는 답례품, 올해 이미 기부한 금액(연간 누적 구간),
// 결정세액 한도, 비교표·곡선만 더한다.
// 근거(2026-10-05 law.go.kr 확인):
//   조특법 §58① 2025.12.23 개정(법률 제21223호) — 부칙 §1 시행 2026.1.1, 부칙 §13 "이 법 시행 이후 기부하는 경우부터" → 10만~20만 40%
//   조특법 §58② 종합소득산출세액 한도, ③ 일반 기부금 세액공제와 중복 불가
//   조특령 §53의2 특별재난지역 선포일부터 3개월 이내 기부 → 20만 초과분 30% (yearEndTax.ts처럼 계산에는 미반영, 안내만)
//   고향사랑기부금법 §4①(주민이 아닌 사람만), §8③(개인별 연 2천만), §9 / 시행령 §5①(답례품 = 매회 기부액의 30% 이내)
import { hometownCredit, itemTaxSaving } from './yearEndTax.ts'

export const CAP = 20_000_000
export const GIFT_RATE = 0.3
export const PRESETS = [100_000, 200_000, 300_000, 500_000, 1_000_000]
/** 공제 구간 [시작, 끝] (연간 누적 기준) — t1 100/110, t2 40%, t3 15% */
export const BANDS = [[0, 100_000], [100_000, 200_000], [200_000, CAP]] as const
/** 특별재난지역(선포일부터 3개월 이내) 기부 시 20만 초과분 공제율 — 안내용 */
export const DISASTER_RATE = 0.3

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(Math.floor(n) || 0, lo), hi)

/** 연간 누적 기부액 total의 공제 (지방소득세 = 소득세 공제의 10%) */
export function credit(total: number) {
  const income = hometownCredit(total)
  const local = Math.floor(income * 0.1)
  return { income, local, total: income + local }
}

export interface DonateIn { amount: number; salary?: number; prior?: number }

/** 이번 기부의 실제 부담 = 기부액 − 줄어드는 세금(지방소득세 포함) − 답례품(30%).
 *  prior = 올해 이미 기부한 금액 → 구간은 연간 누적이라 이번 기부의 공제 = 공제(누적) − 공제(이미 기부분).
 *  salary(총급여)가 있으면 연봉만 있는 근로자의 올해 세금 안에서 실제로 줄어드는 금액(itemTaxSaving), 없으면 명목 공제 */
export function donate({ amount, salary = 0, prior = 0 }: DonateIn) {
  const p = clamp(prior, 0, CAP)
  const a = clamp(amount, 0, CAP - p)
  const c0 = credit(p)
  const c1 = credit(p + a)
  const income = c1.income - c0.income
  const local = c1.local - c0.local
  const nominal = income + local
  const bands = BANDS.map(([lo, hi]) => {
    const from = Math.max(lo, p)
    const to = Math.min(hi, p + a)
    return to > from ? { amount: to - from, income: hometownCredit(to) - hometownCredit(from) } : { amount: 0, income: 0 }
  })
  let saving = nominal
  let taxLeft: number | null = null // 이미 기부한 금액까지 반영한 올해 세금(지방소득세 포함)
  let capped = false
  if (salary > 0) {
    const before = itemTaxSaving({ salary }, { hometown: p })
    const after = itemTaxSaving({ salary }, { hometown: p + a })
    saving = after.saving - before.saving
    taxLeft = before.after.totalTax
    capped = a > 0 && after.after.determined === 0 && saving < nominal
  }
  const gift = Math.floor(a * GIFT_RATE)
  return {
    amount: a, over: Math.max(0, Math.floor(amount) - a), prior: p,
    income, local, nominal, saving, lost: Math.max(0, nominal - saving), capped, taxLeft,
    gift, benefit: saving + gift, cost: a - saving - gift, bands,
  }
}
export type DonateResult = ReturnType<typeof donate>

/** 실제 부담이 0원 이하인 가장 큰 기부액 (없으면 0). 실부담은 누적 10만원 지점에서 가장 낮고 그 뒤로는 늘기만 해서 이분 탐색 */
export function breakEven({ salary = 0, prior = 0 }: Omit<DonateIn, 'amount'>) {
  const p = clamp(prior, 0, CAP)
  let lo = Math.max(0, 100_000 - p)
  let hi = CAP - p
  if (lo === 0 || donate({ amount: lo, salary, prior: p }).cost > 0) return 0
  while (hi - lo > 1) {
    const m = Math.floor((lo + hi) / 2)
    if (donate({ amount: m, salary, prior: p }).cost <= 0) lo = m
    else hi = m
  }
  return lo
}

/** "실질 부담" 곡선: 0 ~ max 기부액. 구간이 꺾이는 지점(누적 10만·20만)과 0원 지점을 점으로 넣는다 */
export function curve({ salary = 0, prior = 0 }: Omit<DonateIn, 'amount'>, max: number, steps = 100) {
  const p = clamp(prior, 0, CAP)
  const top = Math.min(max, CAP - p)
  const be = breakEven({ salary, prior: p })
  const xs = new Set<number>([be, 100_000 - p, 200_000 - p].filter((x) => x > 0 && x < top))
  for (let i = 0; i <= steps; i++) xs.add(Math.round((top * i) / steps))
  return [...xs].sort((x, y) => x - y).map((a) => ({ a, cost: donate({ amount: a, salary, prior: p }).cost }))
}

/** 차트 x축 끝: 100만원, 그보다 크게 기부하면 100만원 단위로 올림 */
export const chartMax = (amount: number) => Math.max(1_000_000, Math.ceil(amount / 1_000_000) * 1_000_000)

/** 비교표: 10만·20만·30만·50만·100만 */
export const compare = (x: Omit<DonateIn, 'amount'>) => PRESETS.map((amount) => donate({ ...x, amount }))

/** 특별재난지역(선포일부터 3개월 이내) 기부 시 명목 공제 (지방소득세 포함) — 안내 문구용 */
export function disasterCredit(amount: number) {
  const a = Math.min(Math.max(amount, 0), CAP)
  const income = Math.floor((Math.min(a, 100_000) * 100) / 110 + Math.min(Math.max(a - 100_000, 0), 100_000) * 0.4 + Math.max(a - 200_000, 0) * DISASTER_RATE)
  return income + Math.floor(income * 0.1)
}

/** 페이지 본문·FAQ 사례 (숫자는 page.tsx가 이 함수들로 렌더링, 값은 check 스크립트에서 고정) */
export const EXAMPLES = {
  /** 처음 10만원 기부 */
  ten: { amount: 100_000 },
  /** 20만원 기부 (계산기 첫 화면 기본값) */
  twenty: { amount: 200_000 },
  /** 100만원 기부 */
  million: { amount: 1_000_000 },
  /** 이미 10만원 기부한 사람이 10만원 더 */
  more: { amount: 100_000, prior: 100_000 },
  /** 결정세액 한도: 연봉 2,000만원이 50만원 기부 */
  low: { amount: 500_000, salary: 20_000_000 },
}
