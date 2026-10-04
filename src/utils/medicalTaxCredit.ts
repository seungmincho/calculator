// 의료비 세액공제 계산기(/medical-tax-credit) 전용 로직. 공제액·세금은 yearEndTax.ts(연말정산 계산기와 같은 함수)로 계산.
// 회귀 체크: node scripts/check-medical-tax-credit.ts
// 근거: 소득세법 §59의4② (3% 문턱 차감 순서·700만 한도·공제율), 시행령 §118의5 (대상 의료비·실손보험금 차감)
import { medicalCredit, itemTaxSaving, type Medical } from './yearEndTax.ts'

/** 입력 그룹. self·family는 법 §59의4②2호(한도 없음)를 본인/가족으로 나눈 것 —
 *  맞벌이 비교에서 '본인' 의료비를 배우자가 결제하면 배우자 쪽에서는 일반 의료비(1호, 700만 한도)가 된다 */
export const GROUPS = ['self', 'family', 'general', 'premature', 'infertility'] as const
export type Group = (typeof GROUPS)[number]
export type Expenses = Record<Group, number>
export const ZERO: Expenses = { self: 0, family: 0, general: 0, premature: 0, infertility: 0 }

/** 법 §59의4② 공제율. 문턱 차감 순서도 이 순서 (1호 일반 → 2호 본인 등 → 3호 미숙아 → 4호 난임) */
export const LEGAL = ['general', 'special', 'premature', 'infertility'] as const
export const RATE: Record<keyof Medical, number> = { general: 0.15, special: 0.15, premature: 0.2, infertility: 0.3 }
export const GENERAL_CAP = 7_000_000
export const threshold = (salary: number) => Math.floor(Math.max(0, salary) * 0.03)

const map = (f: (k: Group) => number) => Object.fromEntries(GROUPS.map((k) => [k, f(k)])) as Expenses
export const sumOf = (e: Expenses) => GROUPS.reduce((a, k) => a + e[k], 0)
/** 실손보험금은 그 보험금을 받게 된 의료비에서 뺀다 (시행령 §118의5①) */
export const netOf = (paid: Expenses, insured: Expenses) => map((k) => Math.max(0, paid[k] - insured[k]))
export const toMedical = (e: Expenses): Medical => ({ special: e.self + e.family, general: e.general, premature: e.premature, infertility: e.infertility })

/** 법정 순서대로 문턱 차감·700만 한도 → 그룹별 공제 대상액. medicalCredit과 같은 규칙 (check 스크립트가 일치 확인) */
export function breakdown(salary: number, m: Medical) {
  let left = threshold(salary)
  return LEGAL.map((key) => {
    const cut = Math.min(m[key], left)
    left -= cut
    const capped = key === 'general' ? Math.max(0, m[key] - cut - GENERAL_CAP) : 0
    return { key, amount: m[key], cut, capped, eligible: m[key] - cut - capped, rate: RATE[key] }
  })
}

/** none 의료비 없음 / threshold 3% 미달 / noTax 낼 세금이 원래 0 / standard 표준세액공제(13만)가 더 유리 /
 *  partial 결정세액 한도로 일부만 / full 공제액(+지방소득세 10%)만큼 그대로 줄어듦 */
export type Status = 'none' | 'threshold' | 'noTax' | 'standard' | 'partial' | 'full'
export const EXTRA = 1_000_000

export function analyze(salary: number, e: Expenses) {
  const m = toMedical(e)
  const spent = sumOf(e)
  const th = threshold(salary)
  const credit = medicalCredit(salary, m)
  const { before, after, saving } = itemTaxSaving({ salary }, m)
  const status: Status = spent === 0 ? 'none' : credit === 0 ? 'threshold' : before.determined === 0 ? 'noTax'
    : after.standard ? 'standard' : saving + 2 < Math.floor(credit * 1.1) ? 'partial' : 'full'
  // 12월 31일 전에 본인 의료비를 EXTRA만큼 더 결제하면 추가로 줄어드는 세금
  const more = itemTaxSaving({ salary }, { ...m, special: m.special + EXTRA }).saving - saving
  return { m, spent, threshold: th, gap: Math.max(0, th - spent), rows: breakdown(salary, m), credit, saving, status, more, tax: before.totalTax }
}

// ── 맞벌이: 누가 결제하고 공제받을까 ──
// 의료비는 실제로 결제한 근로자가 공제 (시행령 §118의5① '해당 근로자가 직접 부담'). 배우자 의료비는 배우자 소득과 관계없이
// 결제한 쪽이, 자녀·부모 의료비는 그 가족을 기본공제 받는 쪽이 결제해야 공제 (국세청 상담센터 의료비 Q&A).
export type Who = 'me' | 'spouse'
export interface Plan { mine: Who; spouse: Who; family: Who }
export const CURRENT: Plan = { mine: 'me', spouse: 'spouse', family: 'me' }
const moves = (p: Plan) => (p.mine !== 'me' ? 1 : 0) + (p.spouse !== 'spouse' ? 1 : 0) + (p.family !== 'me' ? 1 : 0)
const W: Who[] = ['me', 'spouse']
/** 8가지 배분, 지금(CURRENT)에서 덜 옮기는 순 — 같은 금액이면 덜 옮기는 쪽을 추천 */
export const PLANS: Plan[] = W.flatMap((mine) => W.flatMap((spouse) => W.map((family) => ({ mine, spouse, family }))))
  .sort((a, b) => moves(a) - moves(b))

export function splitFor(p: Plan, e: Expenses, spouseOwn: number) {
  const me: Medical = { special: 0, general: 0, premature: 0, infertility: 0 }
  const sp: Medical = { ...me }
  // 본인 의료비는 본인이 공제하면 한도 없음(2호), 배우자가 결제·공제하면 일반 의료비(1호, 700만 한도)
  if (p.mine === 'me') me.special += e.self; else sp.general += e.self
  if (p.spouse === 'spouse') sp.special += spouseOwn; else me.general += spouseOwn
  const f = p.family === 'me' ? me : sp
  f.special += e.family; f.general += e.general; f.premature += e.premature; f.infertility += e.infertility
  return { me, spouse: sp }
}

/** 각자 다른 공제가 없다고 본 근사 (연봉만으로 결정세액 계산) */
export function couple(salary: number, spouseSalary: number, e: Expenses, spouseOwn: number) {
  const results = PLANS.map((plan) => {
    const s = splitFor(plan, e, spouseOwn)
    const me = itemTaxSaving({ salary }, s.me).saving
    const spouse = itemTaxSaving({ salary: spouseSalary }, s.spouse).saving
    return { plan, me, spouse, total: me + spouse }
  })
  const current = results[0]
  const best = results.reduce((x, y) => (y.total > x.total ? y : x))
  const find = (w: Who) => results.find((r) => r.plan.mine === w && r.plan.spouse === w && r.plan.family === w)!
  return { results, current, best, allMe: find('me'), allSpouse: find('spouse'), gain: best.total - current.total }
}

// ── 페이지 예시 (page.tsx 본문·FAQ가 이 값으로 렌더링, check 스크립트가 숫자 고정) ──
export const EXAMPLES = {
  /** 계산기 첫 화면 기본값: 연봉 5,000만, 본인 70만 + 부양가족 180만 → 문턱 150만을 100만 넘김 */
  d: { salary: 50_000_000, e: { ...ZERO, self: 700_000, general: 1_800_000 } },
  /** 결정세액 한도: 연봉 2,000만, 본인 수술비 300만 */
  low: { salary: 20_000_000, e: { ...ZERO, self: 3_000_000 } },
  /** 연봉 3,500만: 본인 치과·약값 130만 + 안경 50만 */
  a: { salary: 35_000_000, e: { ...ZERO, self: 1_800_000 } },
  /** 연봉 5,000만: 70세 아버지 수술 800만(실손 500만 수령) + 초등 자녀 진료 120만 */
  b: { salary: 50_000_000, paid: { ...ZERO, family: 8_000_000, general: 1_200_000 }, insured: { ...ZERO, family: 5_000_000 } },
  /** 연봉 8,000만 + 배우자 3,500만: 본인 50만 + 초등 자녀 300만 */
  c: { salary: 80_000_000, spouseSalary: 35_000_000, e: { ...ZERO, self: 500_000, general: 3_000_000 }, spouseOwn: 0 },
}
