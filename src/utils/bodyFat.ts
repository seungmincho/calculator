// 체지방률 추정 — 순수 로직. 모든 길이 cm, 체중 kg.
// 회귀 체크: scripts/check-body-fat.ts

export type Sex = 'male' | 'female'
export type Method = 'navy' | 'rfm' | 'bmi' | 'ymca'
export const METHODS: Method[] = ['navy', 'rfm', 'bmi', 'ymca']

export interface BodyInput {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  waistCm: number
  neckCm: number
  hipCm: number
}

/**
 * 방법별 대략적 오차(±%p, 1 표준오차 수준). 기준법(수중체중·DXA) 대비 문헌 보고치를 반올림한 참고값.
 * navy: Hodgdon & Beckett 1984 SEE ≈ 3.5~4 / bmi: Deurenberg 1991 SEE ≈ 4.1 /
 * rfm: Woolcott 2018 — BMI보다 정확, 개인 오차 ±4~5 수준 / ymca: 출처·검증 자료 부족 → 가장 넓게.
 */
export const ERR: Record<Method, number> = { navy: 3.5, rfm: 4.5, bmi: 4.5, ymca: 5 }

/** 표시용 하한·상한. 이 밖은 공식이 외삽된 값이라 잘라서 보여준다. */
const MIN = 2
const MAX = 60
const clamp = (x: number) => Math.min(MAX, Math.max(MIN, x))
const ok = (...xs: number[]) => xs.every((x) => Number.isFinite(x) && x > 0)

export const bmi = (heightCm: number, weightKg: number) => weightKg / (heightCm / 100) ** 2

/** US Navy (Hodgdon & Beckett 1984), cm 버전. 남: 허리−목, 여: 허리+엉덩이−목. */
export function navy(i: BodyInput): number | null {
  if (i.sex === 'male') {
    if (!ok(i.heightCm, i.waistCm, i.neckCm) || i.waistCm <= i.neckCm) return null
    return clamp(495 / (1.0324 - 0.19077 * Math.log10(i.waistCm - i.neckCm) + 0.15456 * Math.log10(i.heightCm)) - 450)
  }
  if (!ok(i.heightCm, i.waistCm, i.neckCm, i.hipCm) || i.waistCm + i.hipCm <= i.neckCm) return null
  return clamp(495 / (1.29579 - 0.35004 * Math.log10(i.waistCm + i.hipCm - i.neckCm) + 0.221 * Math.log10(i.heightCm)) - 450)
}

/** RFM 상대지방량 (Woolcott & Bergman 2018): 64(여 76) − 20 × 키/허리 */
export function rfm(i: BodyInput): number | null {
  if (!ok(i.heightCm, i.waistCm)) return null
  return clamp((i.sex === 'male' ? 64 : 76) - 20 * (i.heightCm / i.waistCm))
}

/** BMI 기반 (Deurenberg 1991, 성인): 1.2·BMI + 0.23·나이 − 10.8·성별(남 1) − 5.4 */
export function deurenberg(i: BodyInput): number | null {
  if (!ok(i.heightCm, i.weightKg, i.age)) return null
  return clamp(1.2 * bmi(i.heightCm, i.weightKg) + 0.23 * i.age - 10.8 * (i.sex === 'male' ? 1 : 0) - 5.4)
}

/** YMCA (허리둘레 inch·체중 lb): (−98.42 남 / −76.76 여 + 4.15·허리 − 0.082·체중) / 체중 × 100 */
export function ymca(i: BodyInput): number | null {
  if (!ok(i.weightKg, i.waistCm)) return null
  const lb = i.weightKg / 0.45359237
  const inch = i.waistCm / 2.54
  return clamp(((i.sex === 'male' ? -98.42 : -76.76) + 4.15 * inch - 0.082 * lb) / lb * 100)
}

export function estimate(i: BodyInput): Record<Method, number | null> {
  return { navy: navy(i), rfm: rfm(i), bmi: deurenberg(i), ymca: ymca(i) }
}

/** ACE(American Council on Exercise) 체지방률 분류. 나이 보정 없음. */
export type Category = 'essential' | 'athletic' | 'fitness' | 'average' | 'obese'
export const CATEGORIES: Category[] = ['essential', 'athletic', 'fitness', 'average', 'obese']
/** 각 분류의 하한(%). essential = 남 2~5, 여 10~13 */
export const ACE: Record<Sex, Record<Category, number>> = {
  male: { essential: 2, athletic: 6, fitness: 14, average: 18, obese: 25 },
  female: { essential: 10, athletic: 14, fitness: 21, average: 25, obese: 32 },
}
export function category(sex: Sex, bf: number): Category {
  const t = ACE[sex]
  return bf >= t.obese ? 'obese' : bf >= t.average ? 'average' : bf >= t.fitness ? 'fitness' : bf >= t.athletic ? 'athletic' : 'essential'
}

/**
 * 연령별 '건강' 체지방률 범위 (Gallagher et al. 2000, AJCN; BMI 18.5~25 대응, 20~79세).
 * [건강 하한, 건강 상한, 비만 하한]. 그 사이(상한 초과~비만 미만)는 과체중.
 */
const GALLAGHER: Record<Sex, [number, number, number][]> = {
  male: [[8, 19, 25], [11, 21, 28], [13, 24, 30]],
  female: [[21, 32, 39], [23, 33, 40], [24, 35, 42]],
}
export function healthyRange(sex: Sex, age: number) {
  const [min, max, obese] = GALLAGHER[sex][age < 40 ? 0 : age < 60 ? 1 : 2]
  return { min, max, obese, band: age < 40 ? '20-39' : age < 60 ? '40-59' : '60-79' }
}

/** 정수 표 기준이므로 '건강 상한 19'는 20 미만까지 */
export function healthyStatus(sex: Sex, age: number, bf: number): 'under' | 'healthy' | 'over' | 'obese' {
  const r = healthyRange(sex, age)
  return bf < r.min ? 'under' : bf < r.max + 1 ? 'healthy' : bf < r.obese ? 'over' : 'obese'
}

export function composition(weightKg: number, bf: number) {
  const fatKg = (weightKg * bf) / 100
  return { fatKg, leanKg: weightKg - fatKg }
}

/** 제지방량을 유지한 채 목표 체지방률에 도달할 때의 체중 */
export const targetWeight = (leanKg: number, goalBf: number) => leanKg / (1 - goalBf / 100)

/** 체지방 1kg ≈ 7,700kcal. 하루 deficit kcal 적자로 걸리는 주(週) 수 (대략) */
export const weeksToLose = (fatKg: number, deficit = 500) => (fatKg > 0 ? (fatKg * 7700) / (deficit * 7) : 0)

/** 대한비만학회 복부비만: 허리둘레 남 ≥ 90cm, 여 ≥ 85cm */
export const ABDOMINAL: Record<Sex, number> = { male: 90, female: 85 }
export const abdominalObese = (sex: Sex, waistCm: number) => waistCm >= ABDOMINAL[sex]
/** 허리/키 비율 (0.5 이상이면 심혈관 위험 증가 신호로 흔히 사용) */
export const whtr = (waistCm: number, heightCm: number) => waistCm / heightCm

/** 대한비만학회 BMI 분류(2022): 18.5 / 23 / 25 / 30 / 35 */
export type BmiClass = 'under' | 'normal' | 'pre' | 'obese1' | 'obese2' | 'obese3'
export function bmiClass(b: number): BmiClass {
  return b < 18.5 ? 'under' : b < 23 ? 'normal' : b < 25 ? 'pre' : b < 30 ? 'obese1' : b < 35 ? 'obese2' : 'obese3'
}

/** 예전 ?formula= 값 호환: covert-bailey/ymca(구버전은 BMI식이었음) */
export function parseMethod(v: string | null): Method {
  if (v === 'navy' || v === 'rfm' || v === 'bmi' || v === 'ymca') return v
  if (v === 'covert-bailey') return 'bmi'
  return 'navy'
}

// ── 기록 (localStorage) ──
export interface LogEntry { d: string; bf: number; w: number; waist: number; m: Method }
export const LOG_KEY = 'toolhub-bodyfat-log'

export function sanitizeLog(raw: unknown): LogEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((e): e is LogEntry =>
      !!e && typeof e.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.d) &&
      [e.bf, e.w, e.waist].every((x) => typeof x === 'number' && Number.isFinite(x) && x > 0) &&
      METHODS.includes(e.m))
    .sort((a, b) => a.d.localeCompare(b.d))
    .slice(-200)
}

/** 같은 날짜는 덮어쓰기 */
export const upsertLog = (log: LogEntry[], e: LogEntry) => sanitizeLog([...log.filter((x) => x.d !== e.d), e])

/** 첫 기록 대비 변화: 체지방률·체지방량·제지방량 */
export function logDelta(log: LogEntry[]) {
  if (log.length < 2) return null
  const a = log[0], b = log[log.length - 1]
  const ca = composition(a.w, a.bf), cb = composition(b.w, b.bf)
  return { bf: b.bf - a.bf, fatKg: cb.fatKg - ca.fatKg, leanKg: cb.leanKg - ca.leanKg, w: b.w - a.w, from: a.d, to: b.d }
}
