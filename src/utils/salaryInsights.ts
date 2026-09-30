/**
 * 연봉 계산기 결과 부가 지표 (상위 %, 인상 시뮬레이션, 시급 환산). 순수 함수.
 * 세금 계산 자체는 netSalary.ts 그대로 사용 — 여기서 요율/공식을 새로 만들지 않는다.
 */
import { calculateNetSalary, type NetSalaryInput } from './netSalary'

/**
 * 국세청 근로소득 백분위 (2023년 귀속, 2024 공개) — 연간 총급여(만원) 이하인 비율.
 * ponytail: SalaryRank.tsx의 INCOME_PERCENTILES와 같은 값의 복사본. 수정 시 둘 다 고치거나 SalaryRank가 이걸 import하게 합칠 것.
 */
export const NTS_INCOME_PERCENTILES: [number, number][] = [
  [10, 800], [20, 1500], [25, 1800], [30, 2200], [40, 2800], [50, 3500], [60, 4200],
  [70, 5000], [75, 5600], [80, 6300], [90, 8500], [95, 11000], [99, 20000], [99.9, 50000],
]
export const NTS_SOURCE_YEAR = 2023

/** 연 총급여(원) → 상위 몇 %인지 (0.1 단위, 최소 0.1). SalaryRank와 같은 선형 보간 */
export function topPercent(grossAnnual: number): number {
  const man = grossAnnual / 10000
  const p = NTS_INCOME_PERCENTILES
  let below: number
  if (man <= p[0][1]) below = p[0][0] * (man / p[0][1])
  else if (man >= p[p.length - 1][1]) below = 99.95
  else {
    const i = p.findIndex(([, v], k) => man >= v && man <= p[k + 1][1])
    const [pl, vl] = p[i], [ph, vh] = p[i + 1]
    below = pl + ((man - vl) / (vh - vl)) * (ph - pl)
  }
  return Math.max(0.1, Math.round((100 - below) * 10) / 10)
}

/** 월 소정근로시간 (주 40시간 + 주휴 8시간) × 4.345주 ≈ 209시간 */
export const MONTHLY_HOURS = 209

export function hourlyNet(netMonthly: number): number {
  return Math.floor(netMonthly / MONTHLY_HOURS)
}

/** 연봉 raisePct% 인상 시 실수령 변화. 같은 공제 조건(opt)으로 다시 계산 */
export function simulateRaise(grossAnnual: number, raisePct: number, opt: NetSalaryInput) {
  const before = calculateNetSalary(grossAnnual, opt)
  const newGross = Math.round(grossAnnual * (1 + raisePct / 100))
  const after = calculateNetSalary(newGross, opt)
  if (!before || !after) return null
  const grossGain = newGross - grossAnnual
  const netGain = after.netAnnual - before.netAnnual
  return {
    newGross,
    newNetMonthly: after.netMonthly,
    monthlyGain: after.netMonthly - before.netMonthly,
    netGainPct: (netGain / before.netAnnual) * 100,
    /** 인상분 중 실제로 손에 남는 비율 (%) */
    keepPct: grossGain > 0 ? (netGain / grossGain) * 100 : 0,
  }
}
