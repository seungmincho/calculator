// 청약가점 계산 순수 로직 — 주택공급에 관한 규칙 별표1 (가점제 적용기준).
// 날짜는 'YYYY-MM-DD' 문자열, 기준일 = 입주자모집공고일. 검증: node scripts/check-housing-subscription.ts
import { addYears, addMonths, ymd } from './dday.ts'

/**
 * 무주택기간 기산일: 만 30세가 되는 날, 그 전에 혼인했으면 혼인신고일(둘 중 이른 날).
 * 주택을 처분한 적 있으면 '마지막으로 무주택이 된 날'과 비교해 늦은 날.
 */
export function homelessStart(birth: string, marriage?: string | null, disposal?: string | null): string {
  const thirty = addYears(birth, 30)
  const base = marriage && marriage < thirty ? marriage : thirty
  return disposal && disposal > base ? disposal : base
}

/** 무주택기간 점수: 기산일 전(만30세 미만 미혼)·유주택(null) 0점, 1년 미만 2점, 1년마다 +2, 15년 이상 32점 */
export function homelessScore(start: string | null, ref: string): number {
  if (!start || start > ref) return 0
  return Math.min(32, 2 + 2 * ymd(start, ref).years)
}

/** 부양가족 점수: 0명 5점, 1명당 +5, 6명 이상 35점 */
export const dependentScore = (n: number) => 5 + 5 * Math.min(6, Math.max(0, Math.floor(n)))

/** 본인 청약통장 점수(가입 개월 수): 6개월 미만 1, 6개월~1년 2, 1~2년 3 … 15년 이상 17 */
export function subScoreByMonths(m: number): number {
  if (m < 6) return 1
  if (m < 12) return 2
  return Math.min(17, 2 + Math.floor(m / 12))
}

/** 배우자 통장: 가입기간의 50%를 같은 표로 환산, 최대 3점 (2024.3.25~ 민영 일반공급) */
export const spouseSubScoreByMonths = (m: number) => Math.min(3, subScoreByMonths(Math.floor(m / 2)))

const monthsSince = (start: string, ref: string) => (start > ref ? -1 : ymd(start, ref).totalMonths)

export interface ScoreInput {
  homelessStart: string | null // null = 유주택(0점)
  subStart: string | null // null = 통장 없음(0점)
  spouseSubStart: string | null
  dependents: number
}

export interface Score {
  a: number; b: number; c: number; cOwn: number; cSpouse: number; total: number
  homelessYears: number | null // null = 산정 안 됨
  subMonths: number
}

export function scoreAt(i: ScoreInput, ref: string): Score {
  const a = homelessScore(i.homelessStart, ref)
  const b = dependentScore(i.dependents)
  const sm = i.subStart ? monthsSince(i.subStart, ref) : -1
  const ssm = i.spouseSubStart ? monthsSince(i.spouseSubStart, ref) : -1
  const cOwn = sm < 0 ? 0 : subScoreByMonths(sm)
  const cSpouse = ssm < 0 ? 0 : spouseSubScoreByMonths(ssm)
  const c = Math.min(17, cOwn + cSpouse)
  const homelessYears = i.homelessStart && i.homelessStart <= ref ? ymd(i.homelessStart, ref).years : null
  return { a, b, c, cOwn, cSpouse, total: a + b + c, homelessYears, subMonths: Math.max(0, sm) }
}

/** 다음 점수가 오르는 날 (이미 만점이면 null) */
export function nextHomelessUp(start: string | null, ref: string): string | null {
  if (!start) return null
  if (start > ref) return start
  const y = ymd(start, ref).years
  return y >= 15 ? null : addYears(start, y + 1)
}

const SUB_STEPS = [6, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168, 180]
export function nextSubUp(start: string | null, ref: string): string | null {
  if (!start) return null
  const m = monthsSince(start, ref)
  const step = SUB_STEPS.find(s => s > m)
  return step == null ? null : addMonths(start, step)
}

/** 가구원 수(본인+부양가족)로 받을 수 있는 최고점 — 4인 가구 69점 등 */
export const householdMax = (dependents: number) => 32 + dependentScore(dependents) + 17

/** 혼인신고 7년 이내 (신혼부부 특별공급 기본 요건) */
export const isNewlywed = (marriage: string | null | undefined, ref: string) =>
  !!marriage && marriage <= ref && addYears(marriage, 7) >= ref

/** 직접 선택 모드 → 같은 엔진을 쓰도록 기준일에서 거꾸로 날짜를 만든다 */
export const backYears = (ref: string, years: number) => addYears(ref, -years)
export const backMonths = (ref: string, months: number) => addMonths(ref, -months)
