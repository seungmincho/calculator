// 위임장 작성기 — 용도 프리셋과 검사 (순수 함수). 위임 사항 문구는 문서 본문이라 한국어 고정.
import { addMonths } from './dday.ts'

export type Purpose = 'resident' | 'seal' | 'car' | 'bank' | 'realty' | 'court' | 'corp' | 'custom'
export const PURPOSES: Purpose[] = ['resident', 'seal', 'car', 'bank', 'realty', 'court', 'corp', 'custom']

/** 용도별 위임 사항 후보 (체크박스). [0]이 프리셋 선택 시 기본 체크 */
export const MATTERS: Record<Purpose, string[]> = {
  resident: [
    '주민등록표 등본 발급 신청 및 수령',
    '주민등록표 초본 발급 신청 및 수령',
    '가족관계증명서 발급 신청 및 수령',
    '기본증명서 발급 신청 및 수령',
    '혼인관계증명서 발급 신청 및 수령',
  ],
  seal: [
    '인감증명서(일반용) 발급 신청 및 수령',
    '인감증명서(부동산 매도용) 발급 신청 및 수령',
    '인감증명서(자동차 매도용) 발급 신청 및 수령',
  ],
  car: [
    '자동차 소유권 이전등록 신청',
    '자동차 신규·변경등록 신청',
    '자동차 말소등록 신청',
    '자동차 등록번호판 교부 및 반납',
    '취득세·공채 등 등록 관련 세금·수수료 납부',
    '관련 서류의 제출 및 수령',
  ],
  bank: [
    '예금 계좌 개설',
    '예금 인출 및 이체',
    '통장·카드 재발급 및 수령',
    '잔액증명서·거래내역서 발급 및 수령',
    '예금 계좌 해지',
  ],
  realty: [
    '부동산 매매계약 체결',
    '부동산 임대차계약 체결',
    '계약금·중도금·잔금의 지급 또는 수령',
    '소유권이전등기 신청 및 등기필정보 수령',
    '관련 서류의 제출 및 수령',
  ],
  court: [
    '판결문·결정문 등 재판서의 발급 신청 및 수령',
    '사건 기록의 열람 및 복사',
    '서류의 제출 및 접수',
    '각종 증명서의 발급 신청 및 수령',
  ],
  corp: [
    '법인등기사항증명서 발급 신청 및 수령',
    '법인인감증명서 발급 신청 및 수령',
    '사업자 관련 신고·신청 서류의 제출 및 수령',
    '세무 관련 서류의 제출 및 수령',
    '계약 체결 및 관련 서류의 수령',
  ],
  custom: [],
}

/** 포괄 위임으로 읽히는 표현 */
export const BROAD_RE = /일체|모든|전부|포괄|무제한|제한\s*없/

/** 인감증명서 발급 위임장 유효기간 (인감증명법 시행령 제13조 제7항: 위임일부터 6개월) */
export const SEAL_VALID_MONTHS = 6

/** 체크한 항목 + 자유 입력(줄 단위) */
export function matterList(items: string[], extra: string): string[] {
  return [...items, ...extra.split('\n').map((s) => s.trim()).filter(Boolean)]
}

export type PoaCode = 'noMatters' | 'periodOrder' | 'periodLong' | 'sealForm' | 'sealOver6m' | 'broad' | 'noTarget'

export interface PoaInput {
  purpose: Purpose
  items: string[]
  extra: string
  periodMode: 'range' | 'done'
  from: string
  to: string
  target: string
}

/** 검사 코드 목록 (경고 레벨은 호출부에서 정함) */
export function checkPoa(x: PoaInput): PoaCode[] {
  const out: PoaCode[] = []
  if (!matterList(x.items, x.extra).length) out.push('noMatters')
  if (x.periodMode === 'range' && x.from && x.to) {
    if (x.to < x.from) out.push('periodOrder')
    else if (x.purpose === 'seal' && x.to > addMonths(x.from, SEAL_VALID_MONTHS)) out.push('sealOver6m')
    else if (x.to > addMonths(x.from, 12)) out.push('periodLong')
  }
  if (x.purpose === 'seal') out.push('sealForm')
  if (BROAD_RE.test(x.extra) || BROAD_RE.test(x.target)) out.push('broad')
  if ((x.purpose === 'realty' || x.purpose === 'bank' || x.purpose === 'car') && !x.target.trim()) out.push('noTarget')
  return out
}
