// 출산 예정일 순수 로직. 날짜는 'YYYY-MM-DD' 문자열(dday.ts 헬퍼, 시간대 무관).
// 검증: node scripts/check-due-date.ts
// 근거: ACOG Committee Opinion 700 "Methods for Estimating the Due Date"(2017),
//       근로기준법 제74조(출산전후휴가)·제74조 제7항(임신기 근로시간 단축),
//       국민건강보험공단 임신·출산 진료비 지원(2024.1~ 다태아 태아당 100만원).
import { addDays, daysBetween } from './dday.ts'

export type Method = 'lmp' | 'conception' | 'ultrasound' | 'ivf'

export interface DueInput {
  method: Method
  /** LMP / 수정일 / 초음파 측정일 / 이식일 */
  date: string
  /** 생리 주기(일), LMP 전용. 기본 28 */
  cycle?: number
  /** 초음파 측정 당시 주·일 */
  usWeeks?: number
  usDays?: number
  /** IVF 배아 일수 (3일 또는 5일 배양) */
  embryo?: 3 | 5
}

export const FULL_TERM_DAYS = 280 // 40주 0일

/** 출산 예정일 (40주 0일) */
export function dueDate(i: DueInput): string {
  switch (i.method) {
    case 'lmp': // 네겔레 법칙 + 주기 보정: 배란이 (주기-14)일째라고 보고 28일 주기와의 차이만큼 이동
      return addDays(i.date, FULL_TERM_DAYS + ((i.cycle ?? 28) - 28))
    case 'conception': // 수정(배란)일 = 임신 2주 0일
      return addDays(i.date, 266)
    case 'ultrasound': // 측정일에 w주 d일이었다면 40주까지 남은 일수를 더함
      return addDays(i.date, FULL_TERM_DAYS - ((i.usWeeks ?? 0) * 7 + (i.usDays ?? 0)))
    case 'ivf': // ACOG: 5일 배아 이식일 + 261일, 3일 배아 + 263일 (이식일 = 임신 2주 + 배아일수)
      return addDays(i.date, 266 - (i.embryo ?? 5))
  }
}

/** 예정일로 환산한 '임신 0주 0일' (산과적 LMP) */
export const lmpOf = (edd: string) => addDays(edd, -FULL_TERM_DAYS)

/** 오늘 임신 주수. totalDays < 0 이면 아직 임신 전 날짜 */
export function gestAge(edd: string, today: string) {
  const totalDays = FULL_TERM_DAYS - daysBetween(today, edd)
  return { totalDays, weeks: Math.floor(totalDays / 7), days: ((totalDays % 7) + 7) % 7 }
}

/** ACOG 기준: 1분기 ~13주 6일, 2분기 14주 0일~27주 6일, 3분기 28주 0일~ */
export const trimester = (totalDays: number): 1 | 2 | 3 => (totalDays < 98 ? 1 : totalDays < 196 ? 2 : 3)

/** 한국식 임신 개월: 4주 = 1개월 (0~3주 = 1개월 … 36주~ = 10개월). 병원·책마다 다를 수 있는 관행 표기 */
export const koreanMonth = (weeks: number) => Math.max(1, Math.min(10, Math.floor(weeks / 4) + 1))

/** 진행률 0~100 (40주 기준) */
export const progress = (totalDays: number) => Math.min(100, Math.max(0, (totalDays / FULL_TERM_DAYS) * 100))

// ── 검사·일정 ─────────────────────────────────────
export interface Checkup { key: string; from: number; to: number }
/** 주수 구간 (to주 6일까지). 대한산부인과학회·질병관리청 국가건강정보포털·ACOG 권고 시기 */
export const CHECKUPS: Checkup[] = [
  { key: 'firstVisit', from: 6, to: 8 },   // 임신 확인·아기집/심장박동
  { key: 'nt', from: 11, to: 13 },         // 1차 기형아 검사 (NT 초음파 + 혈액)
  { key: 'quad', from: 15, to: 20 },       // 2차 기형아 검사 (쿼드 혈액검사)
  { key: 'anatomy', from: 20, to: 24 },    // 정밀 초음파
  { key: 'gdm', from: 24, to: 28 },        // 임신성 당뇨 선별검사
  { key: 'tdap', from: 27, to: 36 },       // 백일해(Tdap) 접종 — 질병관리청
  { key: 'gbs', from: 35, to: 37 },        // B군 연쇄상구균 검사 (병원별)
  { key: 'fullTerm', from: 37, to: 41 },   // 만삭 (37주 0일~41주 6일)
]

export type Status = 'past' | 'now' | 'upcoming'
export function checkupDates(edd: string, c: Checkup, today: string) {
  const lmp = lmpOf(edd)
  const start = addDays(lmp, c.from * 7)
  const end = addDays(lmp, c.to * 7 + 6)
  const status: Status = today > end ? 'past' : today >= start ? 'now' : 'upcoming'
  return { start, end, status }
}

// ── 지원 제도 ─────────────────────────────────────
/**
 * 출산전후휴가 (근로기준법 74조): 90일(다태아 120일), 출산 후 45일(다태아 60일) 이상 확보.
 * 단태아 = 출산 전 최대 44일 + 출산일 + 출산 후 45일 → 가장 이른 시작일 = 예정일 44일 전 (다태아 59일 전).
 */
export function maternityLeave(edd: string, fetuses: number) {
  const multi = fetuses > 1
  const total = multi ? 120 : 90
  const after = multi ? 60 : 45
  const earliestStart = addDays(edd, -(total - after - 1))
  return { total, after, earliestStart, endIfOnTime: addDays(earliestStart, total - 1) }
}

/** 임신·출산 진료비 바우처(만원): 태아 1명당 100만원, 분만취약지 +20만원 */
export const voucher = (fetuses: number, remote = false) => 100 * Math.max(1, fetuses) + (remote ? 20 : 0)

/** 임신기 근로시간 단축(근로기준법 74조 7항, 2025.2.23~): 12주 이내 · 32주 이후, 하루 2시간 */
export function shortHours(edd: string) {
  const lmp = lmpOf(edd)
  return { week12: addDays(lmp, 12 * 7), week32: addDays(lmp, 32 * 7) }
}
