// 사직서 작성기 순수 로직. 날짜는 'YYYY-MM-DD'. '퇴직 희망일' = 마지막 근무일.
// 검증: node scripts/check-resignation.ts
import { addDays, addMonths, addYears, daysBetween, ymd } from './dday.ts'

/**
 * 회사가 사직을 수리하지 않을 때 근로관계가 끝나는 마지막 날 (민법 제660조).
 * - general: 통고 다음 날부터 1개월(초일불산입) → 제출일의 1개월 응당일까지 재직
 * - monthly: 기간으로 보수를 정한 때(월급제, 임금 산정기간 1일~말일 가정) → 제출한 달의 다음 달 말일까지 재직
 */
export function noticeLastDay(submit: string): { general: string; monthly: string } {
  const nextMonthFirst = addMonths(submit.slice(0, 8) + '01', 1)
  return { general: addMonths(submit, 1), monthly: addDays(addMonths(nextMonthFirst, 1), -1) }
}

/** 퇴직금(계속근로 1년 이상, 근로자퇴직급여 보장법 제4조): 마지막 근무일이 1주년 전날 이상이어야 함 */
export function severance(hire: string, lastDay: string): { eligible: boolean; needLastDay: string; shortDays: number } {
  const needLastDay = addDays(addYears(hire, 1), -1)
  return { eligible: lastDay >= needLastDay, needLastDay, shortDays: Math.max(0, daysBetween(lastDay, needLastDay)) }
}

/** 근속기간 (입사일 ~ 마지막 근무일, 양 끝 포함) */
export const tenure = (hire: string, lastDay: string) => ymd(hire, addDays(lastDay, 1))

/**
 * 마지막 근무일이 입사 n주년 전날이면 n (그 해 연 단위 연차가 발생하지 않음 — 대법원 2021다227100,
 * 고용노동부 행정해석 2021.12.16: 1년 근로 후 다음 날 근로관계가 있어야 발생). 아니면 0.
 */
export function anniversaryEve(hire: string, lastDay: string): number {
  const n = ymd(hire, addDays(lastDay, 1)).totalMonths
  return n > 0 && n % 12 === 0 && addYears(hire, n / 12) === addDays(lastDay, 1) ? n / 12 : 0
}

export type ReasonKey = 'personal' | 'jobChange' | 'study' | 'health' | 'family' | 'contract' | 'recommended' | 'custom'

export const REASONS: ReasonKey[] = ['personal', 'jobChange', 'study', 'health', 'family', 'contract', 'recommended', 'custom']

/** 사유 템플릿 (용지 문구라 한국어 고정). custom은 기존 문구 유지 */
export const REASON_TEXT: Record<Exclude<ReasonKey, 'custom'>, string> = {
  personal: '일신상의 사유로 더 이상 근무를 계속하기 어려워 사직하고자 합니다. 그동안 베풀어 주신 배려와 지도에 깊이 감사드립니다.',
  jobChange: '새로운 분야에서 경력을 쌓고자 이직을 결정하게 되어 사직하고자 합니다. 재직하는 동안 많은 것을 배울 수 있도록 도와주신 데 깊이 감사드립니다.',
  study: '학업(진학)에 전념하고자 부득이 사직하고자 합니다. 그동안 베풀어 주신 배려에 깊이 감사드립니다.',
  health: '건강상의 이유로 정상적인 업무 수행이 어려워 치료와 요양에 전념하고자 부득이 사직하고자 합니다.',
  family: '가사 및 육아에 전념해야 하는 사정이 생겨 부득이 사직하고자 합니다. 그동안 베풀어 주신 배려에 깊이 감사드립니다.',
  contract: '근로계약기간 만료에 따라 근로관계가 종료되어 퇴직하고자 합니다.',
  recommended: '회사의 경영상 필요에 따른 인원 감축 방침에 따라 회사로부터 사직을 권고받았고, 이에 동의하여 사직하고자 합니다(권고사직).',
}
