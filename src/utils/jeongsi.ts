// 2027학년도 정시 일정과 오늘 기준 단계 판정 (회귀 체크: node scripts/check-jeongsi.ts).
// 날짜 출처: 대교협 「2027학년도 대학입학전형시행계획 주요사항」(2025-04-30) 일정 표,
//   「2027학년도 대학입학전형기본사항」(2026-07-31 개정 — 개정은 지역인재 특별전형뿐, 일정 동일).
//   수능 시험일·성적 통지일: 평가원 2027학년도 수능 시행기본계획(2026-03-31). 시험일은 koreanHolidays.CSAT(연도별 표) 공용.
// 내년: 이 파일을 복사해 YEAR와 STEPS 날짜만 바꾸면 된다(키·번역은 그대로).
import { CSAT, daysBetween } from './dday.ts'

export const YEAR = 2027 // 학년도

export interface Step {
  key: string
  start: string
  /** 기간이면 마지막 날 */
  end?: string
  /** 마감일만 정해진 일정(start = 마감일, 'OO까지') */
  until?: boolean
  /** 마감 시각(KST) */
  time?: string
}

export const STEPS: Step[] = [
  { key: 'csat', start: CSAT[YEAR - 1] }, // 2026-11-19(목)
  { key: 'score', start: '2026-12-11' },
  { key: 'susiResult', start: '2026-12-18', until: true },
  { key: 'susiReg', start: '2026-12-21', end: '2026-12-23' },
  { key: 'susiExtra', start: '2026-12-24', end: '2026-12-29', time: '18:00' },
  { key: 'susiExtraReg', start: '2026-12-30', until: true, time: '22:00' },
  { key: 'apply', start: '2027-01-04', end: '2027-01-07' }, // 이 중 대학별 3일 이상
  { key: 'groupA', start: '2027-01-11', end: '2027-01-17' },
  { key: 'groupB', start: '2027-01-18', end: '2027-01-24' },
  { key: 'groupC', start: '2027-01-25', end: '2027-01-31' },
  { key: 'result', start: '2027-02-05', until: true },
  { key: 'reg', start: '2027-02-10', end: '2027-02-12' },
  { key: 'extra', start: '2027-02-13', end: '2027-02-17', time: '18:00' },
  { key: 'extraReg', start: '2027-02-18', until: true, time: '22:00' },
  { key: 'addRecruit', start: '2027-02-19', end: '2027-02-26', time: '22:00' }, // 합격 통보 18시·등록 마감 22시
]

export const APPLY = STEPS.find((s) => s.key === 'apply')!
const APPLY_IDX = STEPS.indexOf(APPLY)

export type Status = 'past' | 'now' | 'future'
/** 머리 문구 종류: future(~까지 D-n) · futureUntil(~ 마감까지 D-n) · ongoing(진행 중, 마감까지 D-n) · lastDay(오늘 마감) · today(오늘) */
export type Kind = 'future' | 'futureUntil' | 'ongoing' | 'lastDay' | 'today'

export const lastDay = (s: Step) => s.end ?? s.start

export function statusOf(s: Step, today: string): Status {
  if (today > lastDay(s)) return 'past'
  return today >= s.start ? 'now' : 'future'
}

/** 상태 + 머리 문구 종류 + 남은 날(시작 전이면 시작까지, 진행 중이면 마감까지) */
export function describe(s: Step, today: string): { status: Status; kind: Kind; days: number } {
  const status = statusOf(s, today)
  if (status === 'future') return { status, kind: s.until ? 'futureUntil' : 'future', days: daysBetween(today, s.start) }
  const days = daysBetween(today, lastDay(s))
  if (status === 'now' && days > 0) return { status, kind: 'ongoing', days }
  return { status, kind: s.end || s.until ? 'lastDay' : 'today', days }
}

/** 맨 위 카드의 기준 일정: 원서접수 전엔 원서접수, 그 뒤엔 정시·추가모집 중 아직 안 끝난 첫 일정. 다 끝났으면 null */
export function focusStep(today: string): Step | null {
  if (today < APPLY.start) return APPLY
  return STEPS.slice(APPLY_IDX).find((s) => lastDay(s) >= today) ?? null
}

/** 기준 일정 말고 이어지는 일정(진행 중 포함) n개 */
export function upcoming(today: string, n = 3): Step[] {
  const focus = focusStep(today)
  return STEPS.filter((s) => s !== focus && lastDay(s) >= today).slice(0, n)
}

/** 지금 단계: 진행 중이거나 가장 최근에 시작한 일정(수능 전이면 null) */
export function phaseStep(today: string): Step | null {
  let cur: Step | null = null
  for (const s of STEPS) if (s.start <= today) cur = s
  return cur
}
