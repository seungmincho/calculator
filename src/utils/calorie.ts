// 칼로리 계산 (순수 함수). 회귀 체크: node scripts/check-calorie.ts
//
// BMR (kcal/day)
//  - Mifflin-St Jeor (1990): 10·kg + 6.25·cm − 5·나이 + 5(남) / −161(여)
//  - Harris-Benedict 개정식 (Roza & Shizgal 1984): 남 88.362 + 13.397·kg + 4.799·cm − 5.677·나이
//                                                  여 447.593 + 9.247·kg + 3.098·cm − 4.330·나이
//  - Katch-McArdle: 370 + 21.6 · 제지방량(kg)  — 체지방률을 알 때
// TDEE = BMR × 활동계수(1.2 / 1.375 / 1.55 / 1.725 / 1.9)
// 체중 1kg ≈ 7,700kcal (근사치 — 실제로는 수분·근육 변화로 개인차 큼)
import { FAT_KCAL_PER_KG, clampNum } from './exerciseCalorie.ts'
export { clampNum }
import { AMDR } from './nutrition.ts'

export type Sex = 'male' | 'female'
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive'
export type Formula = 'mifflin' | 'harris' | 'katch'
export type Goal = 'lose' | 'maintain' | 'gain'

export const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9,
}
export const ACTIVITIES = Object.keys(ACTIVITY_FACTOR) as Activity[]
export const FORMULAS: Formula[] = ['mifflin', 'harris', 'katch']
export const GOALS: Goal[] = ['lose', 'maintain', 'gain']
export const PACES: Record<Goal, number[]> = { lose: [0.25, 0.5, 0.75, 1], maintain: [], gain: [0.25, 0.5] }
export const KCAL_PER_KG = FAT_KCAL_PER_KG

/** 일반적인 최소 섭취 권고(의학적 기준 아님): 여 1,200 / 남 1,500 kcal */
export const MIN_KCAL: Record<Sex, number> = { female: 1200, male: 1500 }

export interface Body { sex: Sex; age: number; height: number; weight: number; bodyFat?: number | null }

export function mifflin({ sex, age, height, weight }: Body): number {
  return 10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161)
}

export function harris({ sex, age, height, weight }: Body): number {
  return sex === 'male'
    ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
    : 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age
}

/** 체지방률(%)이 없으면 null */
export function katch({ weight, bodyFat }: Body): number | null {
  if (bodyFat == null || !(bodyFat > 0 && bodyFat < 70)) return null
  return 370 + 21.6 * weight * (1 - bodyFat / 100)
}

export function bmrAll(b: Body): Record<Formula, number | null> {
  return { mifflin: mifflin(b), harris: harris(b), katch: katch(b) }
}

/** 선택한 공식. Katch-McArdle인데 체지방률이 없으면 Mifflin으로 대체 */
export function bmr(b: Body, f: Formula): number {
  if (f === 'harris') return harris(b)
  if (f === 'katch') return katch(b) ?? mifflin(b)
  return mifflin(b)
}

export const tdee = (bmrKcal: number, a: Activity) => bmrKcal * ACTIVITY_FACTOR[a]

/** 주당 pace kg 변화에 필요한 하루 kcal 차이 (0.5kg/주 → 550kcal) */
export const dailyDelta = (paceKgWeek: number) => (paceKgWeek * KCAL_PER_KG) / 7

export interface PlanInput extends Body { activity: Activity; formula: Formula; goal: Goal; pace: number }

/** 안전 하한 = max(성별 최소, BMR) */
export const floorKcal = (sex: Sex, bmrKcal: number) => Math.max(MIN_KCAL[sex], bmrKcal)

/** 해당 체중에서의 목표 섭취 kcal (감량은 안전 하한으로 clamp) */
export function targetAt(p: PlanInput, weight: number) {
  const b = bmr({ ...p, weight }, p.formula)
  const maint = tdee(b, p.activity)
  if (p.goal === 'maintain') return { bmr: b, tdee: maint, raw: maint, kcal: maint, floor: 0, clamped: false }
  const raw = p.goal === 'lose' ? maint - dailyDelta(p.pace) : maint + dailyDelta(p.pace)
  const floor = p.goal === 'lose' ? floorKcal(p.sex, b) : 0
  const clamped = raw < floor
  return { bmr: b, tdee: maint, raw, kcal: clamped ? floor : raw, floor, clamped }
}

/** 한 주 뒤 체중: (섭취 − TDEE)×7 / 7,700 */
const step = (p: PlanInput, w: number, intake: number) =>
  w + ((intake - tdee(bmr({ ...p, weight: w }, p.formula), p.activity)) * 7) / KCAL_PER_KG

export interface PlanResult {
  bmr: number
  tdee: number
  kcal: number // 오늘부터 권장 섭취
  raw: number // 하한 적용 전
  floor: number
  clamped: boolean
  /** 실제 적용되는 첫 주 변화량 (kg/주, 감량이면 양수) */
  effPace: number
  /** 목표 도달 주 수 (도달 불가/방향 불일치면 null) */
  weeks: number | null
  reason: 'ok' | 'maintain' | 'direction' | 'floor' | 'tooLong'
  /** week, plan: 매주 칼로리 재계산 시, fixed: 오늘 칼로리 그대로 먹을 때 */
  series: { week: number; plan: number; fixed: number }[]
}

export const MAX_WEEKS = 156 // 3년

export function plan(p: PlanInput, targetWeight: number | null): PlanResult {
  const now = targetAt(p, p.weight)
  const effPace = p.goal === 'maintain' ? 0 : (((now.kcal - now.tdee) * (p.goal === 'lose' ? -1 : 1)) * 7) / KCAL_PER_KG
  const base = { bmr: now.bmr, tdee: now.tdee, kcal: now.kcal, raw: now.raw, floor: now.floor, clamped: now.clamped, effPace }
  if (p.goal === 'maintain') return { ...base, weeks: null, reason: 'maintain', series: [] }
  const dir = p.goal === 'lose' ? -1 : 1
  if (targetWeight == null || !(targetWeight > 0) || (targetWeight - p.weight) * dir <= 0)
    return { ...base, weeks: null, reason: 'direction', series: [] }
  if (effPace < 0.01) return { ...base, weeks: null, reason: 'floor', series: [] }

  const series = [{ week: 0, plan: p.weight, fixed: p.weight }]
  let wp = p.weight, wf = p.weight, weeks: number | null = null
  for (let k = 0; k < MAX_WEEKS && weeks == null; k++) {
    const next = step(p, wp, targetAt(p, wp).kcal)
    if ((next - targetWeight) * dir >= 0) weeks = k + (targetWeight - wp) / (next - wp)
    wp = (next - targetWeight) * dir >= 0 ? targetWeight : next
    wf = step(p, wf, now.kcal)
    series.push({ week: k + 1, plan: wp, fixed: wf })
  }
  return { ...base, weeks, reason: weeks == null ? 'tooLong' : 'ok', series }
}

/** 목표별 단백질 g/kg — [기본, 하한, 상한]. 감량·증량은 운동 병행 기준(ISSN 2017 1.4~2.0 등), 유지는 KDRI 권장(≈0.91g/kg) 근처 */
export const PROTEIN_G_PER_KG: Record<Goal, [number, number, number]> = {
  lose: [1.6, 1.2, 2.0], maintain: [1.0, 0.9, 1.2], gain: [1.8, 1.6, 2.2],
}
export const FAT_PCT = 25 // KDRI 15~30%의 중간

/** 탄단지(g, kcal, %). 단백질 = g/kg × 기준 체중, 지방 = 25%, 탄수화물 = 나머지 */
export function macros(kcal: number, basisKg: number, goal: Goal) {
  const pG = PROTEIN_G_PER_KG[goal][0] * basisKg
  const pK = Math.min(pG * 4, kcal)
  const fK = Math.min((kcal * FAT_PCT) / 100, kcal - pK)
  const cK = Math.max(0, kcal - pK - fK)
  const pct = (x: number) => (kcal > 0 ? (x / kcal) * 100 : 0)
  return {
    protein: { g: pK / 4, kcal: pK, pct: pct(pK), range: AMDR.protein },
    fat: { g: fK / 9, kcal: fK, pct: pct(fK), range: AMDR.fat },
    carbs: { g: cK / 4, kcal: cK, pct: pct(cK), range: AMDR.carbs },
  }
}

/** 2020 한국인 영양소 섭취기준 에너지 필요추정량 (kcal/day, 연령대 기준 체위). [최소 나이, 남, 여] */
export const EER_2020: [number, number, number][] = [
  [12, 2500, 2000], [15, 2700, 2000], [19, 2600, 2000], [30, 2500, 1900], [50, 2200, 1700], [65, 2000, 1600], [75, 1900, 1500],
]
export function eer(sex: Sex, age: number): { from: number; to: number | null; kcal: number } | null {
  let idx = -1
  EER_2020.forEach(([from], i) => { if (age >= from) idx = i })
  if (idx < 0) return null
  const [from, m, f] = EER_2020[idx]
  const next = EER_2020[idx + 1]
  return { from, to: next ? next[0] - 1 : null, kcal: sex === 'male' ? m : f }
}

/** BMI (kg/m²) */
export const bmi = (kg: number, cm: number) => (cm > 0 ? kg / (cm / 100) ** 2 : 0)

/** 예전 링크의 goal 값 → 새 goal/pace */
export const LEGACY_GOAL: Record<string, [Goal, number]> = {
  loseFast: ['lose', 1], loseModerate: ['lose', 0.75], loseSlow: ['lose', 0.5], maintain: ['maintain', 0.5],
  gainSlow: ['gain', 0.25], gainModerate: ['gain', 0.5], gainFast: ['gain', 0.5],
}

