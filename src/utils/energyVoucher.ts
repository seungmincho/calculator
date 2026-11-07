// 에너지바우처(냉·난방 에너지이용권) 대상 판정과 지원 금액 — 2026년도 사업. 회귀 체크: node scripts/check-energy-voucher.ts
// 모든 숫자·날짜는 아래 원문에서 2026-11-07 확인.
//  [누리집] 한국에너지공단 에너지바우처 https://www.energyv.or.kr/info/support_info.do
//           2. 신청대상(소득기준·세대원 특성기준·제외) 3. 지원금액 표(총액, 괄호 = 다른 동절기 이용권 희망 시 하절기만) 4. 신청·사용기간
//           신청안내 /info/apl_info.do(자동신청·준비물) · 사용안내 /info/use_info.do(요금차감·국민행복카드) · 잔액조회 /info/balance_inquiry.do
//           물어보세요 /board/boardDetail.do?boardId=1102(금액) 131(연탄쿠폰 등과 중복: 하절기만, 9/30 소멸) 1103(세대당 1개)
//           1107(이사 = 요금차감 자동중지·재신청) 122(신청 기간 안이면 전액) 140(사용 마감)
//  [정책브리핑] 기후에너지환경부(2026-06-17) https://www.korea.kr/news/policyNewsView.do?newsId=148966678 — 금액·기간 동일
//  [복지로] 기후에너지환경부(2026-06-14) https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/news/1309922_1114.html — 자동 등록·사전 예외지급
// 갱신: 해마다 5~6월 새 사업 공고(2024 5/29 · 2025 6/9 · 2026 6/15 시작). support_info.do 의 금액표(주석 처리된 옛 표 말고 화면에
//  보이는 표)·기간·노인/영유아 출생일 기준을 옮기고 EV_YEAR 를 올린다. 블로그 수치는 틀린 게 많다(2인 412,200·3인 532,900 등).

export const EV_YEAR = 2026

/** 신청 기간 [누리집 4.] — 홈 '다가오는 일정'이 import 한다 */
export const APPLY_PERIOD = { start: '2026-06-15', end: '2026-12-31' } as const
/** 사용기간 전체 [누리집 4.] 하·동절기 구분 없이 총액 안에서 자유롭게 */
export const USE_PERIOD = { start: '2026-07-01', end: '2027-05-31' } as const
/** 하절기: 요금차감(전기)만 */
export const SUMMER = { start: '2026-07-01', end: '2026-09-30' } as const
/** 동절기: 가상카드(요금차감) 10/1, 실물카드(국민행복카드) 10/3 시작 */
export const WINTER = { virtual: '2026-10-01', card: '2026-10-03', end: '2027-05-31' } as const

/** 세대원 특성 기준일(주민등록 기준): 노인 = 이 날 이전 출생, 영유아 = 이 날 이후 출생한 7세 이하 취학 전 아동 */
export const SENIOR_BORN_BY = '1961-12-31'
export const INFANT_BORN_FROM = '2019-01-01'

export type Size = 1 | 2 | 3 | 4 // 4 = 4인 이상. 주민등록표 등본의 세대원 수
/** [누리집 3. 지원금액] total = 연간 총액, summerOnly = 연탄쿠폰·연탄전환 바우처·긴급복지 연료비를 받을 때(하절기만) */
export const AMOUNT: Record<Size, { total: number; summerOnly: number }> = {
  1: { total: 295_200, summerOnly: 40_700 },
  2: { total: 407_500, summerOnly: 58_800 },
  3: { total: 532_700, summerOnly: 75_800 },
  4: { total: 701_300, summerOnly: 102_000 },
}

export const BENEFITS = ['livelihood', 'medical', 'housing', 'education'] as const // 기초생활 생계·의료·주거·교육급여
export const TRAITS = ['senior', 'infant', 'disabled', 'pregnant', 'illness', 'singleParent', 'childHead', 'multiChild'] as const
export const WINTER_OTHER = ['none', 'emergency', 'coalCoupon', 'coalSwitch'] as const // 긴급복지 동절기 연료비 · 연탄쿠폰 · 연탄전환 바우처
export type Benefit = (typeof BENEFITS)[number]
export type Trait = (typeof TRAITS)[number]
export type WinterOther = (typeof WINTER_OTHER)[number]

export interface VoucherInput {
  benefits: Benefit[]
  traits: Trait[]
  size: number
  winterOther: WinterOther
  facility: boolean // 세대원 모두 기초생활보장법 제32조 보장시설에서 급여를 받음
}
export type Status = 'eligible' | 'summerOnly' | 'ineligible'
export type Reason = 'noIncome' | 'noTrait' | 'facility'

export const sizeOf = (n: number): Size => (n >= 4 ? 4 : n <= 1 ? 1 : (Math.floor(n) as Size))

export function judgeVoucher(x: VoucherInput) {
  const size = sizeOf(x.size)
  const reasons: Reason[] = []
  if (!x.benefits.length) reasons.push('noIncome') // 소득기준: 기초생활수급자만(차상위 제외)
  if (!x.traits.length) reasons.push('noTrait') // 소득기준과 특성기준을 '모두' 충족
  if (x.facility) reasons.push('facility')
  const status: Status = reasons.length ? 'ineligible' : x.winterOther !== 'none' ? 'summerOnly' : 'eligible'
  const amount = status === 'eligible' ? AMOUNT[size].total : status === 'summerOnly' ? AMOUNT[size].summerOnly : 0
  const period = status === 'summerOnly' ? SUMMER : USE_PERIOD
  return { status, reasons, size, amount, period, full: AMOUNT[size].total }
}
export type VoucherResult = ReturnType<typeof judgeVoucher>

/** 다른 동절기 이용권을 고른 세대는 하절기 사용기간 안에 신청해야 하절기 몫을 받는다 [물어보세요 131] */
export const summerClosed = (today: string) => today > SUMMER.end

/** 주 난방 에너지 → 동절기 사용 방식. 지역난방은 요금차감만, 등유·LPG·연탄은 국민행복카드만 [사용안내] */
export type Fuel = 'electric' | 'gas' | 'district' | 'kerosene' | 'lpg' | 'coal'
export const methodFor = (f: Fuel): 'virtual' | 'card' => (f === 'kerosene' || f === 'lpg' || f === 'coal' ? 'card' : 'virtual')
