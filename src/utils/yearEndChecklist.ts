// 연말정산 준비 체크리스트(/year-end-checklist) 항목 정의 — 데이터만. 문구는 messages yearEndChecklist.items.<id>.
// 회귀 체크: node scripts/check-year-end-checklist.ts
// 근거(2026-11-08 확인):
//  - 간소화 일정: 국세청 보도자료 2026.1.14 「연말정산 간소화 서비스, 1월 15일(목) 개통」(2025년 귀속) — 개통 1.15,
//    수정·추가 자료 1.15~1.18, 최종 확정자료 1.20부터, 조회되지 않는 의료비 신고 1.15~1.17, 일괄제공 1.17 또는 1.20.
//    2026년 귀속 일정은 아직 공지 전 → 화면에 '예년 기준'으로 표기. 공지되면 messages groups.jan.* 문구와 NTS_URL 교체.
//    안경·취학 전 학원·교복·전자기부금 외 기부금·카드 결제 월세 = 제출 의무 없는 자료(△), 장애인복지법 장애인·유공자 증명 = 제공(○)
//  - 조특법 §92 혼인세액공제: 2026.12.31 이전 혼인신고, 혼인신고한 날이 속하는 과세기간에 50만 → TAX_YEAR 2027부터는 연장 확인 필요
//  - 조특법 §95의2 월세: 과세기간 종료일 현재 무주택 세대주 / §87②④ 청약: 총급여 7천만 이하, 연 300만 40%, 다음 해 2월 말까지 무주택확인서
//  - 소득세법 §137 2월분 급여 지급 때 연말정산(④ 추가 납부 10만 초과 시 2~4월 분납), 국세기본법 §45의2⑤ 경정청구 5년
import { DEADLINE } from './yearEndTax.ts'

export const SITUATIONS = ['rent', 'kids', 'parents', 'dual', 'religious', 'glasses', 'disabled', 'sme', 'married', 'housing'] as const
export type Situation = (typeof SITUATIONS)[number]

export type Group = 'dec' | 'jan' | 'docs' | 'submit'
/** 묶음 순서 = 화면 순서. date 가 있으면 D-day */
export const GROUPS: { id: Group; date?: string }[] = [
  { id: 'dec', date: DEADLINE.yearEnd },
  { id: 'jan', date: DEADLINE.simplified },
  { id: 'docs' },
  { id: 'submit' },
]

export const NTS_URL = 'https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?mi=2201&bbsId=1028&nttSn=1347979'

/** when 이 없으면 공통 항목, 있으면 그중 하나라도 켰을 때만. href = 관련 도구(menuConfig) */
export interface Item { id: string; group: Group; when?: Situation[]; href?: string }

const FAMILY: Situation[] = ['parents', 'kids', 'dual', 'disabled']

export const ITEMS: Item[] = [
  { id: 'pension', group: 'dec', href: '/pension-tax-credit' },
  { id: 'card', group: 'dec', href: '/card-deduction' },
  { id: 'medical', group: 'dec', href: '/medical-tax-credit' },
  { id: 'donation', group: 'dec', href: '/donation-tax-credit' },
  { id: 'hometown', group: 'dec', href: '/hometown-donation' },
  { id: 'marriage', group: 'dec', when: ['married'], href: '/year-end-tax' },
  { id: 'rentHome', group: 'dec', when: ['rent'], href: '/rent-tax-credit' },
  { id: 'housing', group: 'dec', when: ['housing'], href: '/year-end-tax' },
  { id: 'dependents', group: 'dec', when: FAMILY, href: '/dependent-deduction' },
  { id: 'dual', group: 'dec', when: ['dual'], href: '/dependent-deduction' },
  { id: 'child', group: 'dec', when: ['kids'], href: '/child-tax-credit' },
  { id: 'education', group: 'dec', when: ['kids'], href: '/education-tax-credit' },

  { id: 'download', group: 'jan' },
  { id: 'consent', group: 'jan', when: ['parents', 'dual', 'kids', 'disabled'] },
  { id: 'fix', group: 'jan' },

  { id: 'missing', group: 'docs' },
  { id: 'glasses', group: 'docs', when: ['glasses'], href: '/medical-tax-credit' },
  { id: 'uniform', group: 'docs', when: ['kids'], href: '/education-tax-credit' },
  { id: 'academy', group: 'docs', when: ['kids'], href: '/education-tax-credit' },
  { id: 'religious', group: 'docs', when: ['religious'], href: '/donation-tax-credit' },
  { id: 'rentDocs', group: 'docs', when: ['rent'], href: '/rent-tax-credit' },
  { id: 'disabledCert', group: 'docs', when: ['disabled'], href: '/dependent-deduction' },
  { id: 'smeForm', group: 'docs', when: ['sme'], href: '/sme-tax-exemption' },

  { id: 'company', group: 'submit' },
  { id: 'february', group: 'submit', href: '/year-end-tax' },
  { id: 'missed', group: 'submit', href: '/income-tax' },
]

export const visibleItems = (on: readonly Situation[]) => ITEMS.filter((i) => !i.when || i.when.some((s) => on.includes(s)))

/** URL·저장값 → 알려진 상황만, 정의 순서로 (중복·모르는 값 제거) */
export const parseSituations = (list: readonly unknown[]): Situation[] => SITUATIONS.filter((s) => list.includes(s))
