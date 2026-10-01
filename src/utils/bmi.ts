// BMI 판정 — 순수 로직. 키 cm, 체중 kg. 회귀 체크: node scripts/check-bmi.ts
//
// 판정은 "화면에 보이는 값"(소수 첫째 자리 반올림)으로 한다 → 22.96은 23.0으로 보이고 비만 전단계.
// 체중 경계(kg)도 0.1kg 단위로, 그 체중을 넣으면 실제로 그 단계가 나오는 값을 돌려준다.
import { ABDOMINAL, whtr, type Sex } from './bodyFat.ts'
export { ABDOMINAL, whtr, type Sex }

export type Standard = 'kr' | 'who'
export const STANDARDS: Standard[] = ['kr', 'who']
export type BmiClass = 'under' | 'normal' | 'pre' | 'obese1' | 'obese2' | 'obese3'
export const CLASSES: BmiClass[] = ['under', 'normal', 'pre', 'obese1', 'obese2', 'obese3']

/**
 * 단계 하한. kr = 대한비만학회 비만 진료지침 2022 (18.5 / 23 / 25 / 30 / 35),
 * who = WHO 성인 기준 (18.5 / 25 / 30 / 35 / 40).
 */
export const CUTS: Record<Standard, number[]> = {
  kr: [18.5, 23, 25, 30, 35],
  who: [18.5, 25, 30, 35, 40],
}
/** 게이지 표시 범위 */
export const GAUGE: Record<Standard, [number, number]> = { kr: [15, 40], who: [15, 45] }

export const round1 = (x: number) => Math.round(x * 10) / 10
export const bmi = (heightCm: number, weightKg: number) => weightKg / (heightCm / 100) ** 2
export const valid = (heightCm: number, weightKg: number) =>
  heightCm >= 50 && heightCm <= 250 && weightKg >= 10 && weightKg <= 400

export function classify(b: number, std: Standard): BmiClass {
  const r = round1(b)
  return CLASSES[CUTS[std].filter((c) => r >= c).length]
}

/** 표시 BMI가 cut 이상이 되는 가장 가벼운 체중 (0.1kg 단위) */
export function weightAt(cut: number, heightCm: number): number {
  let k = Math.floor((cut - 0.06) * (heightCm / 100) ** 2 * 10)
  while (round1(bmi(heightCm, k / 10)) < cut) k++
  return k / 10
}

/** 단계별 체중 구간 [min, max] (max = 다음 단계 직전, 마지막 단계는 null) */
export function classRanges(heightCm: number, std: Standard) {
  const cuts = CUTS[std]
  return CLASSES.map((c, i) => ({
    c,
    bmiMin: i === 0 ? null : cuts[i - 1],
    bmiMax: i === cuts.length ? null : round1(cuts[i] - 0.1),
    kgMin: i === 0 ? null : weightAt(cuts[i - 1], heightCm),
    kgMax: i === cuts.length ? null : round1(weightAt(cuts[i], heightCm) - 0.1),
  }))
}

export interface BmiResult {
  bmi: number // 소수 첫째 자리
  cls: BmiClass
  /** 정상 체중 범위 (BMI 18.5 ~ 정상 상한, 0.1kg) */
  healthyMin: number
  healthyMax: number
  /** 정상까지: 음수 = 감량, 양수 = 증량, 0 = 이미 정상 */
  toNormal: number
  /** 한 단계 아래로 내려가려면 줄여야 할 kg (저체중이면 null) */
  toLower: number | null
  /** 한 단계 위로 올라가는 데 남은 kg (최고 단계면 null) */
  toUpper: number | null
  /** BMI 22 표준체중 */
  standardKg: number
}

export function analyze(heightCm: number, weightKg: number, std: Standard): BmiResult {
  const b = round1(bmi(heightCm, weightKg))
  const cls = classify(b, std)
  const i = CLASSES.indexOf(cls)
  const cuts = CUTS[std]
  const healthyMin = weightAt(cuts[0], heightCm)
  const healthyMax = round1(weightAt(cuts[1], heightCm) - 0.1)
  const toNormal = cls === 'normal' ? 0 : weightKg < healthyMin ? round1(healthyMin - weightKg) : round1(healthyMax - weightKg)
  return {
    bmi: b,
    cls,
    healthyMin,
    healthyMax,
    toNormal,
    toLower: i === 0 ? null : round1(weightKg - (weightAt(cuts[i - 1], heightCm) - 0.1)),
    toUpper: i === cuts.length ? null : round1(weightAt(cuts[i], heightCm) - weightKg),
    standardKg: round1(22 * (heightCm / 100) ** 2),
  }
}

/** 게이지 위 위치(0~100%) */
export function gaugePos(b: number, std: Standard) {
  const [lo, hi] = GAUGE[std]
  return Math.min(100, Math.max(0, ((b - lo) / (hi - lo)) * 100))
}

/**
 * 대한비만학회 2022: BMI 단계 × 복부비만 여부에 따른 동반질환 위험도 (1 낮음 ~ 6 가장 높음).
 * [허리둘레 정상, 복부비만]
 */
export type Risk = 'low' | 'average' | 'slight' | 'high' | 'veryHigh' | 'highest'
export const RISK: Record<BmiClass, [Risk, Risk]> = {
  under: ['low', 'average'],
  normal: ['average', 'slight'],
  pre: ['slight', 'high'],
  obese1: ['high', 'veryHigh'],
  obese2: ['veryHigh', 'highest'],
  obese3: ['highest', 'highest'],
}

export interface Waist { abdominal: boolean; ratio: number; risk: Risk | null }
/** 허리둘레(선택) 판정. 동반질환 위험도는 대한비만학회 기준이라 kr일 때만 */
export function waistCheck(sex: Sex, waistCm: number, heightCm: number, cls: BmiClass, std: Standard): Waist | null {
  if (!(waistCm >= 40 && waistCm <= 200)) return null
  const abdominal = waistCm >= ABDOMINAL[sex]
  return { abdominal, ratio: whtr(waistCm, heightCm), risk: std === 'kr' ? RISK[cls][abdominal ? 1 : 0] : null }
}

/** 나이별 안내: 만 19세 미만은 성인 기준 미적용, 65세 이상은 노인 참고 */
export const ageNote = (age: number): 'child' | 'senior' | null =>
  age > 0 && age < 19 ? 'child' : age >= 65 ? 'senior' : null

export const parseStd = (v: string | null): Standard => (v === 'who' ? 'who' : 'kr')

// ── 기록 (localStorage) ──
export interface LogEntry { d: string; h: number; w: number }
export const LOG_KEY = 'toolhub-bmi-log'

export function sanitizeLog(raw: unknown): LogEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((e): e is LogEntry =>
      !!e && typeof e.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.d) && valid(e.h, e.w))
    .sort((a, b) => a.d.localeCompare(b.d))
    .slice(-200)
}

/** 같은 날짜는 덮어쓰기 */
export const upsertLog = (log: LogEntry[], e: LogEntry) => sanitizeLog([...log.filter((x) => x.d !== e.d), e])

const ymd = (ts: number) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 예전 '계산 기록'(calculation_history, type 'bmi') → 새 기록. 같은 날은 가장 최근 것 */
export function fromLegacy(raw: unknown): LogEntry[] {
  if (!Array.isArray(raw)) return []
  const out: LogEntry[] = []
  for (const e of [...raw].sort((a, b) => (Number(a?.timestamp) || 0) - (Number(b?.timestamp) || 0))) {
    if (e?.type !== 'bmi' || !Number.isFinite(Number(e.timestamp))) continue
    const h = Number(e.inputs?.height), w = Number(e.inputs?.weight)
    if (!valid(h, w)) continue
    const d = ymd(Number(e.timestamp))
    const i = out.findIndex((x) => x.d === d)
    if (i >= 0) out.splice(i, 1)
    out.push({ d, h, w })
  }
  return sanitizeLog(out)
}
