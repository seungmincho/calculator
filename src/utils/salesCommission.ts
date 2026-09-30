// 영업 커미션·인센티브 계산 (순수 함수). 회귀 체크: node scripts/check-sales-commission.ts
// 금액 단위: 원(정수). 비율 단위: %.

export type Structure = 'flat' | 'tiered' | 'target' | 'perDeal'
export type TierMode = 'marginal' | 'whole'
export type TaxMode = 'freelance' | 'employee' | 'none'

/** from 원 "이상"부터 rate% 적용. tiers[0].from 은 0. */
export interface Tier { from: number; rate: number }

export interface Plan {
  structure: Structure
  rate: number          // flat: 매출 × rate%
  tiers: Tier[]         // tiered
  tierMode: TierMode    // marginal = 초과분만 높은 요율(누진), whole = 도달 구간 요율을 전체 매출에
  target: number        // target: 목표 매출
  targetRate: number    //   목표까지 요율 %
  accel: number         //   목표 초과분 배수 (1.5 → 초과분은 targetRate × 1.5)
  threshold: number     //   달성률 이 % 미만이면 커미션 0 (0 = 없음)
  perDeal: number       // perDeal: 건당 고정액
  avgDeal: number       //   평균 계약 금액 → 건수 = floor(매출 / avgDeal)
  base: number          // 기본급(고정, 월) — 모든 구조에 더해짐
  split: number         // 팀 분배: 내 몫 % (커미션에만 적용)
}

export const DEFAULT_TIERS: Tier[] = [
  { from: 0, rate: 3 },
  { from: 10_000_000, rate: 5 },
  { from: 30_000_000, rate: 7 },
]

export const PLAN_A: Plan = {
  structure: 'tiered', rate: 5, tiers: DEFAULT_TIERS, tierMode: 'marginal',
  target: 20_000_000, targetRate: 4, accel: 1.5, threshold: 0,
  perDeal: 300_000, avgDeal: 2_000_000, base: 0, split: 100,
}
export const PLAN_B: Plan = { ...PLAN_A, structure: 'flat', rate: 2, base: 2_000_000 }

const floorWon = (x: number) => Math.floor(x + 1e-6)
const pct = (amount: number, rate: number) => floorWon((amount * rate) / 100)

/** 부가세 포함 매출 → 공급가액 (10%) */
export const supplyValue = (sales: number, vatIncluded: boolean) =>
  vatIncluded ? Math.round(sales / 1.1) : sales

const sortedTiers = (tiers: Tier[]) => {
  const t = tiers.filter((x) => Number.isFinite(x.from) && x.from >= 0).slice().sort((a, b) => a.from - b.from)
  if (!t.length || t[0].from !== 0) t.unshift({ from: 0, rate: 0 })
  return t
}

export function tieredCommission(sales: number, tiers: Tier[], mode: TierMode): number {
  const t = sortedTiers(tiers)
  if (mode === 'whole') {
    const cur = [...t].reverse().find((x) => sales >= x.from)!
    return pct(sales, cur.rate)
  }
  let sum = 0
  t.forEach((x, i) => {
    const hi = i + 1 < t.length ? t[i + 1].from : Infinity
    const part = Math.min(sales, hi) - x.from
    if (part > 0) sum += (part * x.rate) / 100
  })
  return floorWon(sum)
}

/** 매출(공급가액) → 커미션(분배 전) */
export function rawCommission(p: Plan, sales: number): number {
  const s = Math.max(0, sales)
  switch (p.structure) {
    case 'flat': return pct(s, p.rate)
    case 'tiered': return tieredCommission(s, p.tiers, p.tierMode)
    case 'target': {
      if (p.target <= 0) return pct(s, p.targetRate)
      if (p.threshold > 0 && (s / p.target) * 100 < p.threshold) return 0
      const within = Math.min(s, p.target), over = Math.max(0, s - p.target)
      return floorWon((within * p.targetRate) / 100 + (over * p.targetRate * p.accel) / 100)
    }
    case 'perDeal': return p.avgDeal > 0 ? Math.floor(s / p.avgDeal) * p.perDeal : 0
  }
}

export interface Withholding { incomeTax: number; localTax: number; total: number }

/**
 * 사업소득 원천징수(소득세법 제129조① 3%) + 지방소득세(소득세의 10%).
 * 각 세목 10원 미만 절사(국고금 관리법 제47조). 2024.7.1 이후 계속·반복 인적용역 사업소득은
 * 1천원 미만이어도 소액부징수 적용 제외(소득세법 제86조) → 여기서는 항상 징수.
 */
export function withholding33(pay: number): Withholding {
  const incomeTax = Math.floor(Math.max(0, pay) * 0.03 / 10 + 1e-9) * 10
  const localTax = Math.floor(incomeTax * 0.1 / 10 + 1e-9) * 10
  return { incomeTax, localTax, total: incomeTax + localTax }
}

export interface Result {
  sales: number        // 공급가액 기준 매출
  raw: number          // 분배 전 커미션
  commission: number   // 내 몫 커미션
  base: number
  gross: number        // 기본급 + 커미션
  tax: Withholding
  net: number
  effRate: number      // 커미션 / 매출 (%)
  attainment: number | null
  deals: number | null
}

export function calc(p: Plan, salesInput: number, vatIncluded: boolean, tax: TaxMode): Result {
  const sales = supplyValue(Math.max(0, salesInput), vatIncluded)
  const raw = rawCommission(p, sales)
  const commission = floorWon((raw * p.split) / 100)
  const gross = commission + p.base
  const w = tax === 'freelance' ? withholding33(gross) : { incomeTax: 0, localTax: 0, total: 0 }
  return {
    sales, raw, commission, base: p.base, gross, tax: w, net: gross - w.total,
    effRate: sales > 0 ? (commission / sales) * 100 : 0,
    attainment: p.structure === 'target' && p.target > 0 ? (sales / p.target) * 100 : null,
    deals: p.structure === 'perDeal' && p.avgDeal > 0 ? Math.floor(sales / p.avgDeal) : null,
  }
}

/** 다음으로 요율/지급이 바뀌는 매출 경계(공급가액) — 없으면 null */
export function nextBoundary(p: Plan, sales: number): number | null {
  const pts: number[] = []
  if (p.structure === 'tiered') pts.push(...sortedTiers(p.tiers).map((x) => x.from))
  if (p.structure === 'target' && p.target > 0) {
    pts.push(p.target)
    if (p.threshold > 0) pts.push(Math.ceil((p.target * p.threshold) / 100))
  }
  if (p.structure === 'perDeal' && p.avgDeal > 0) pts.push((Math.floor(sales / p.avgDeal) + 1) * p.avgDeal)
  const next = pts.filter((x) => x > sales).sort((a, b) => a - b)[0]
  return next ?? null
}

/** 1·2·5 × 10^k 로 반올림한 보기 좋은 증분 (매출의 약 10%) */
export function niceStep(x: number): number {
  if (x <= 0) return 1_000_000
  const e = Math.pow(10, Math.floor(Math.log10(x)))
  const m = x / e
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * e
}

// ── URL 인코딩: 구조~방식~요율~구간(from-rate_…)~목표~목표요율~배수~문턱~건당~평균계약~기본급~분배 ──
const S_CODES: Record<Structure, string> = { flat: 'f', tiered: 't', target: 'g', perDeal: 'd' }

export function encodePlan(p: Plan): string {
  return [
    S_CODES[p.structure], p.tierMode === 'whole' ? 'w' : 'm', p.rate,
    p.tiers.map((x) => `${x.from}-${x.rate}`).join('_'),
    p.target, p.targetRate, p.accel, p.threshold, p.perDeal, p.avgDeal, p.base, p.split,
  ].join('~')
}

export function decodePlan(s: string | null): Plan | null {
  if (!s) return null
  const f = s.split('~')
  if (f.length !== 12) return null
  const structure = (Object.keys(S_CODES) as Structure[]).find((k) => S_CODES[k] === f[0])
  const n = (i: number, max: number) => {
    const v = Number(f[i])
    return Number.isFinite(v) && v >= 0 ? Math.min(v, max) : NaN
  }
  const tiers = f[3].split('_').slice(0, 6).map((pair) => {
    const [a, b] = pair.split('-').map(Number)
    return { from: a, rate: b }
  })
  const nums = [n(2, 100), n(4, 1e13), n(5, 100), n(6, 10), n(7, 200), n(8, 1e11), n(9, 1e13), n(10, 1e11), n(11, 100)]
  if (!structure || nums.some(Number.isNaN)) return null
  if (tiers.some((x) => !Number.isFinite(x.from) || !Number.isFinite(x.rate) || x.from < 0 || x.rate < 0 || x.rate > 100)) return null
  const [rate, target, targetRate, accel, threshold, perDeal, avgDeal, base, split] = nums
  return { structure, tierMode: f[1] === 'w' ? 'whole' : 'marginal', rate, tiers, target, targetRate, accel, threshold, perDeal, avgDeal, base, split }
}
