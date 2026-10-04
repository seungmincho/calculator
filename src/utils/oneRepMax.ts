/**
 * 1RM(1회 최대 중량) 계산기 (OneRepMaxCalculator). 회귀 체크: node scripts/check-one-rep-max.ts
 *
 * 추정 공식 (w = 든 무게, r = 반복 횟수)
 *   Epley (1985, Boyd Epley Workout "Poundage Chart")            w × (1 + r/30)
 *   Brzycki (1993, JOPERD 64(1):88–90)                           w × 36 / (37 − r)
 *   Lombardi (1989, Beginning Weight Training)                   w × r^0.10
 *   O'Conner 외 (1989, Weight Training Today)                    w × (1 + 0.025r)
 * r = 1이면 든 무게가 곧 1RM (Epley·O'Conner도 w로 고정). 반복은 1~12회만 받는다.
 * %1RM ↔ 반복 수: NSCA Essentials of Strength Training and Conditioning 표, 65% 아래는 Epley 역산 근사.
 */

export const FORMULAS = ['epley', 'brzycki', 'lombardi', 'oconner'] as const
export type Formula = (typeof FORMULAS)[number]
export const MAX_REPS = 12
/** 이보다 많으면 추정 오차가 커진다는 경고 */
export const WARN_REPS = 10
export const LB_TO_KG = 0.45359237

const fns: Record<Formula, (w: number, r: number) => number> = {
  epley: (w, r) => w * (1 + r / 30),
  brzycki: (w, r) => (w * 36) / (37 - r),
  lombardi: (w, r) => w * r ** 0.1,
  oconner: (w, r) => w * (1 + 0.025 * r),
}

const clampReps = (r: number) => (Number.isFinite(r) ? Math.min(MAX_REPS, Math.max(1, Math.round(r))) : 1)
/** 소수 첫째 자리 반올림 (표시값끼리 합이 맞도록 합계 전에 씀) */
export const round1 = (x: number) => Math.round(x * 10 + 1e-9) / 10

/** 든 무게 × 반복 → 공식별 1RM과 평균 */
export function estimate1RM(weight: number, reps: number) {
  const w = Number.isFinite(weight) && weight > 0 ? weight : 0
  const r = clampReps(reps)
  const byFormula = Object.fromEntries(FORMULAS.map((f) => [f, r === 1 ? w : fns[f](w, r)])) as Record<Formula, number>
  const values = FORMULAS.map((f) => byFormula[f])
  return {
    weight: w,
    reps: r,
    byFormula,
    average: values.reduce((s, v) => s + v, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  }
}

/** 가장 가까운 원판 단위(예: 2.5kg)로 반올림 */
export const roundTo = (x: number, step: number) => Math.round(x / step + 1e-9) * step

export type Zone = 'strength' | 'hypertrophy' | 'endurance'
/** NSCA 지침: ≥85% 근력(≤6회), 67~85% 근비대(6~12회), ≤67% 근지구력(≥12회) */
export const PERCENT_ROWS: readonly { pct: number; reps: number; zone: Zone }[] = [
  { pct: 100, reps: 1, zone: 'strength' },
  { pct: 95, reps: 2, zone: 'strength' },
  { pct: 90, reps: 4, zone: 'strength' },
  { pct: 85, reps: 6, zone: 'strength' },
  { pct: 80, reps: 8, zone: 'hypertrophy' },
  { pct: 75, reps: 10, zone: 'hypertrophy' },
  { pct: 70, reps: 12, zone: 'hypertrophy' },
  { pct: 65, reps: 15, zone: 'endurance' },
  { pct: 60, reps: 20, zone: 'endurance' },
  { pct: 55, reps: 25, zone: 'endurance' },
  { pct: 50, reps: 30, zone: 'endurance' },
]

/** 1RM의 50~100% 무게표 (원판 단위로 반올림) */
export const percentTable = (oneRm: number, step: number) =>
  PERCENT_ROWS.map((row) => ({ ...row, weight: roundTo((oneRm * row.pct) / 100, step) }))

/** 단위별 원판 반올림 단위·바벨·원판 (한쪽 기준) */
export const GEAR = {
  kg: { steps: [2.5, 1.25], bars: [20, 15, 10], plates: [25, 20, 15, 10, 5, 2.5, 1.25] },
  lb: { steps: [5, 2.5], bars: [45, 35], plates: [45, 35, 25, 10, 5, 2.5] },
} as const
export type Unit = keyof typeof GEAR

/**
 * 목표 무게 → 한쪽에 끼울 원판 (무거운 것부터, 목표를 넘지 않게).
 * ponytail: 탐욕법 — kg 원판은 최소 장수, lb는 60lb를 45+10+5로 끼우는 식(35+25가 더 적음). 헬스장 관행과 같아 그대로 둠.
 */
export function loadPlates(target: number, bar: number, plates: readonly number[]) {
  if (!(target >= bar)) return { perSide: [] as number[], side: 0, total: bar, short: 0, belowBar: true }
  let left = (target - bar) / 2
  const perSide: number[] = []
  for (const p of plates) {
    while (left >= p - 1e-9) {
      perSide.push(p)
      left -= p
    }
  }
  const side = perSide.reduce((s, p) => s + p, 0)
  const total = bar + side * 2
  return { perSide, side, total, short: Math.max(0, target - total), belowBar: false }
}

/** [원판, 장수] 묶음 (25,25,10 → [[25,2],[10,1]]) */
export function groupPlates(perSide: readonly number[]) {
  const out: [number, number][] = []
  for (const p of perSide) {
    const last = out[out.length - 1]
    if (last && last[0] === p) last[1]++
    else out.push([p, 1])
  }
  return out
}

export const convertUnit = (x: number, from: Unit, to: Unit) =>
  from === to ? x : to === 'kg' ? x * LB_TO_KG : x / LB_TO_KG

/** 3대(스쿼트·벤치·데드) 1RM 합계와 체중 배수. 종목별 0.1 단위로 반올림한 뒤 더함 */
export function bigThree(lifts: readonly { weight: number; reps: number }[], bodyweight: number) {
  const each = lifts.map((l) => round1(estimate1RM(l.weight, l.reps).average))
  const total = round1(each.reduce((s, v) => s + v, 0))
  return { each, total, ratio: bodyweight > 0 ? total / bodyweight : 0, nextGoal: Math.floor(total / 100) * 100 + 100 }
}
