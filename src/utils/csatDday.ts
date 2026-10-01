// 수능 D-day·시간표·대입 일정 순수 로직 (scripts/check-csat-dday.ts로 회귀 체크).
// 시각은 모두 한국시간(KST, UTC+9 고정 — 서머타임 없음) 기준. 시험일은 csatGrade.ts가 단일 출처.

import { CSAT_EXAM_DATE, daysUntil } from './csatGrade.ts'

const KST_OFFSET = 9 * 3_600_000

/** UTC 시각(ms) → KST 날짜·자정 이후 분·초 */
export function kstParts(ms: number): { date: string; min: number; sec: number } {
  const d = new Date(ms + KST_OFFSET)
  const date = d.toISOString().slice(0, 10)
  return { date, min: d.getUTCHours() * 60 + d.getUTCMinutes(), sec: d.getUTCSeconds() }
}

export const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
export const fmtMin = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** KST 날짜 + 'HH:MM' → UTC ms */
export function kstToMs(date: string, hhmm: string): number {
  const [y, mo, d] = date.split('-').map(Number)
  return Date.UTC(y, mo - 1, d) + toMin(hhmm) * 60_000 - KST_OFFSET
}

export interface Slot { key: string; start: string; end?: string; exam?: boolean }

/** 2027학년도 수능 시간표 (평가원 시행기본계획) */
export const SCHEDULE: Slot[] = [
  { key: 'arrive', start: '08:10' },
  { key: 'kor', start: '08:40', end: '10:00', exam: true },
  { key: 'math', start: '10:30', end: '12:10', exam: true },
  { key: 'lunch', start: '12:10', end: '13:00' },
  { key: 'eng', start: '13:10', end: '14:20', exam: true },
  { key: 'inq', start: '14:50', end: '16:37', exam: true },
  { key: 'lang2', start: '17:05', end: '17:45', exam: true },
]

/** 4교시 세부 (예년 기준 — 수험생 유의사항으로 확인) */
export const INQ_DETAIL: Slot[] = [
  { key: 'hist', start: '14:50', end: '15:20' },
  { key: 'swap', start: '15:20', end: '15:35' },
  { key: 'inq1', start: '15:35', end: '16:05' },
  { key: 'inq2', start: '16:07', end: '16:37' },
]

export const EXAM_START = SCHEDULE[1].start
export const EXAM_END = SCHEDULE[SCHEDULE.length - 1].end!

/**
 * 자정 이후 분(min) 기준 현재 상태.
 * now: 진행 중인 구간(시작 포함·종료 제외) + 종료까지 남은 분 / next: 다음 구간 + 시작까지 남은 분 / done: 모두 종료.
 */
export function slotAt(min: number, sched = SCHEDULE):
  | { type: 'now'; idx: number; left: number }
  | { type: 'next'; idx: number; left: number }
  | { type: 'done' } {
  for (let i = 0; i < sched.length; i++) {
    const s = sched[i]
    if (!s.end) continue
    if (min >= toMin(s.start) && min < toMin(s.end)) return { type: 'now', idx: i, left: toMin(s.end) - min }
  }
  for (let i = 0; i < sched.length; i++) {
    if (sched[i].end && min < toMin(sched[i].start)) return { type: 'next', idx: i, left: toMin(sched[i].start) - min }
  }
  return { type: 'done' }
}

export interface Countdown {
  phase: 'before' | 'during' | 'after'
  /** 달력 기준 D-N (당일 0, 지나면 음수) */
  dday: number
  d: number; h: number; m: number; s: number
}

/** 시험 시작(1교시 08:40 KST)까지 카운트다운 */
export function countdown(nowMs: number, exam = CSAT_EXAM_DATE): Countdown {
  const start = kstToMs(exam, EXAM_START)
  const end = kstToMs(exam, EXAM_END)
  const dday = daysUntil(kstParts(nowMs).date, exam)
  const phase = nowMs < start ? 'before' : nowMs < end ? 'during' : 'after'
  const left = Math.max(0, Math.floor((start - nowMs) / 1000))
  return { phase, dday, d: Math.floor(left / 86400), h: Math.floor(left / 3600) % 24, m: Math.floor(left / 60) % 60, s: left % 60 }
}

/** until: 해당 날짜'까지' (마감일), approx: 날짜 미확정 — D-N 표시 안 함 */
export interface TimelineItem { key: string; start: string; end?: string; until?: boolean; approx?: boolean }

/** 2027학년도 수능 이후 대입 일정 (대교협 대입전형 시행계획) */
export const TIMELINE: TimelineItem[] = [
  { key: 'exam', start: CSAT_EXAM_DATE },
  { key: 'score', start: '2026-12-11' },
  { key: 'susiResult', start: '2026-12-18', until: true },
  { key: 'susiReg', start: '2026-12-21', end: '2026-12-23' },
  { key: 'susiExtra', start: '2026-12-24', end: '2026-12-29' },
  { key: 'jeongsiApply', start: '2027-01-04', end: '2027-01-07' },
  { key: 'jeongsiResult', start: '2027-02-05', until: true },
  { key: 'jeongsiReg', start: '2027-02-10', end: '2027-02-12' },
  { key: 'jeongsiExtra', start: '2027-02-13', end: '2027-02-17' },
  { key: 'addRecruit', start: '2027-02-28', approx: true },
]

/** 오늘 기준 일정 상태 (YYYY-MM-DD 문자열 비교) */
export function timelineStatus(item: TimelineItem, today: string): 'past' | 'now' | 'future' {
  if (today > (item.end ?? item.start)) return 'past'
  return today >= item.start ? 'now' : 'future'
}

export const progress = (checked: Record<string, boolean>, keys: string[]) =>
  ({ done: keys.filter((k) => checked[k]).length, total: keys.length })

/** 가채점표 과목별 문항 수 (예년 기준) */
export const SHEET: { key: string; count: number; select?: boolean }[] = [
  { key: 'kor', count: 45, select: true },
  { key: 'math', count: 30, select: true },
  { key: 'eng', count: 45 },
  { key: 'hist', count: 20 },
  { key: 'inq1', count: 20, select: true },
  { key: 'inq2', count: 20, select: true },
  { key: 'lang2', count: 30, select: true },
]

/** 수학 단답형 문항 (16~22, 29~30) */
export const isShortAnswer = (subject: string, q: number) =>
  subject === 'math' && ((q >= 16 && q <= 22) || q >= 29)

/** 입력 정리: 선다형 1~5 한 자리, 단답형 0~999 */
export function cleanAnswer(subject: string, q: number, v: string): string {
  const digits = v.replace(/\D/g, '')
  if (isShortAnswer(subject, q)) return digits.slice(0, 3)
  const last = digits.slice(-1)
  return last >= '1' && last <= '5' ? last : ''
}
