/**
 * 연봉 계산기 결과 부가 지표 (상위 %, 인상 시뮬레이션, 시급 환산). 순수 함수.
 * 세금 계산 자체는 netSalary.ts 그대로 사용 — 여기서 요율/공식을 새로 만들지 않는다.
 */
import { calculateNetSalary, type NetSalaryInput } from './netSalary'

/**
 * 국세청 근로소득 백분위 (2023년 귀속, 2024 공개) — 연간 총급여(만원) 이하인 비율.
 * 연봉 계산기(SalaryCalculator)와 연봉 순위(SalaryRank)가 같이 쓰는 단일 출처. 매년 갱신 시 여기만 수정.
 */
export const NTS_INCOME_PERCENTILES: [number, number][] = [
  [10, 800], [20, 1500], [25, 1800], [30, 2200], [40, 2800], [50, 3500], [60, 4200],
  [70, 5000], [75, 5600], [80, 6300], [90, 8500], [95, 11000], [99, 20000], [99.9, 50000],
]
export const NTS_SOURCE_YEAR = 2023

/** 연 총급여(원)가 분포표에서 하위 몇 %인지 (선형 보간). 표 최상단 초과 = 남은 구간의 중간 */
export function percentileBelow(grossAnnual: number, table: [number, number][] = NTS_INCOME_PERCENTILES): number {
  const man = grossAnnual / 10000
  const p = table
  if (man <= p[0][1]) return p[0][0] * (Math.max(0, man) / p[0][1])
  const [lp, lv] = p[p.length - 1]
  if (man >= lv) return lp + (100 - lp) / 2
  const i = p.findIndex(([, v], k) => man >= v && man <= p[k + 1][1])
  const [pl, vl] = p[i], [ph, vh] = p[i + 1]
  return pl + ((man - vl) / (vh - vl)) * (ph - pl)
}

/** 하위 % → 상위 % (0.1 단위, 최소 0.1) */
export const toTop = (below: number) => Math.max(0.1, Math.round((100 - below) * 10) / 10)

/** 연 총급여(원) → 국세청 기준 상위 몇 % */
export function topPercent(grossAnnual: number): number {
  return toTop(percentileBelow(grossAnnual))
}

/** 다음 국세청 구간까지: gap원 더 벌면 상위 top%. 표 최상단 이상이면 null */
export function nextMilestone(grossAnnual: number): { gap: number; top: number } | null {
  const row = NTS_INCOME_PERCENTILES.find(([, v]) => v * 10000 > grossAnnual)
  return row ? { gap: row[1] * 10000 - grossAnnual, top: toTop(row[0]) } : null
}

/** [a,b) 만원 구간에 속한 근로자 비율(%) — 분포 곡선용. 같은 보간표에서 파생 */
export function shareBetween(aMan: number, bMan: number): number {
  return percentileBelow(bMan * 10000) - percentileBelow(aMan * 10000)
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
