// 영수증 작성기 순수 로직. 회귀 체크: node scripts/check-receipt.ts
// 금액·부가세 계산은 견적서 엔진(invoiceDoc.computeTotals) 재사용.
import { computeTotals, type VatMode } from './invoiceDoc.ts'
import { validate } from './businessNumber.ts'

export type Purpose = 'general' | 'rent' | 'dues' | 'money' | 'used' | 'lesson' | 'custom'
export const PURPOSES: Purpose[] = ['general', 'rent', 'dues', 'money', 'used', 'lesson', 'custom']
export type Pay = 'cash' | 'transfer' | 'card'
export type { VatMode }

export interface Item { name: string; qty: number; price: number }

/** 건당 3만원 초과(부가세 포함) 지출은 적격증빙 수취 대상 — 법인세법 시행령 제158조②1, 소득세법 시행령 제208조의2 */
export const PROOF_LIMIT = 30_000
/** 증명서류 수취 불성실 가산세 2% — 법인세법 제75조의5, 소득세법 제81조의6 */
export const PROOF_PENALTY = 0.02
/** 현금영수증 의무발행업종: 건당 10만원 이상 현금거래는 요청 없어도 발급 — 소득세법 제162조의3④, 법인세법 제117조의2④ */
export const CASH_RECEIPT_MIN = 100_000
/** 의무발행 위반 가산세: 미발급액의 20% (10일 이내 자진 발급·신고 시 10%) */
export const CASH_RECEIPT_PENALTY = 0.2

const ym = (date: string) => {
  const m = /^(\d{4})-(\d{2})/.exec(date)
  return m ? { y: Number(m[1]), m: Number(m[2]) } : null
}

/** 용도별 기본 명목 ('2026년 10월분 월세·관리비' 등) */
export function presetSubject(p: Purpose, date: string): string {
  const d = ym(date)
  switch (p) {
    case 'general': return '물품(용역) 대금'
    case 'rent': return d ? `${d.y}년 ${d.m}월분 월세·관리비` : '월세·관리비'
    case 'dues': return d ? `${d.y}년 ${d.m}월 회비` : '회비'
    case 'money': return '금전'
    case 'used': return '중고 물품 매매대금'
    case 'lesson': return d ? `${d.m}월 강습비` : '강습비'
    case 'custom': return ''
  }
}

/** 용도별 기본 품목. 개인 간 금전 수령은 금액만(품목 없음) */
export function presetItems(p: Purpose, date: string): { useItems: boolean; items: Item[]; amount: number } {
  const d = ym(date)
  const mm = d ? `${d.m}월` : ''
  switch (p) {
    case 'general': return { useItems: true, items: [{ name: '사무용품', qty: 2, price: 15_000 }, { name: '배송비', qty: 1, price: 3_000 }], amount: 0 }
    case 'rent': return { useItems: true, items: [{ name: `${mm} 월세`.trim(), qty: 1, price: 500_000 }, { name: `${mm} 관리비`.trim(), qty: 1, price: 100_000 }], amount: 0 }
    case 'dues': return { useItems: true, items: [{ name: `${mm} 정기 회비`.trim(), qty: 1, price: 30_000 }], amount: 0 }
    case 'money': return { useItems: false, items: [], amount: 1_000_000 }
    case 'used': return { useItems: true, items: [{ name: '중고 물품', qty: 1, price: 150_000 }], amount: 0 }
    case 'lesson': return { useItems: true, items: [{ name: `${mm} 레슨 (주 1회)`.trim(), qty: 4, price: 50_000 }], amount: 0 }
    case 'custom': return { useItems: false, items: [], amount: 100_000 }
  }
}

/** 영수 문구. 명목이 비면 빈칸으로 */
export function statement(p: Purpose, subject: string): string {
  const s = subject.trim() || '              '
  if (p === 'money') return `위 금액을 ${s} 명목으로 틀림없이 받았음을 확인합니다.`
  if (p === 'used') return `위 금액을 ${s} 명목으로 정히 영수하였으며, 해당 물품은 현 상태 그대로 인도합니다.`
  return `위 금액을 ${s} 명목으로 정히 영수합니다.`
}

export interface Totals {
  supply: number
  vat: number
  /** 품목(또는 금액)으로 계산한 합계 */
  sum: number
  /** 용지에 적힐 영수 금액: 품목 모드에서 직접 적은 금액이 있으면 그 값, 없으면 sum */
  total: number
  /** 직접 적은 영수 금액과 품목 합계가 다름 */
  mismatch: boolean
  lines: { name: string; qty: number; price: number; amount: number }[]
}

/**
 * 품목 모드: 품목 합계(부가세 반영) = sum, amount > 0이면 영수 금액으로 따로 적은 값(불일치 검사용).
 * 금액만 모드: amount 한 줄. 부가세 별도면 amount = 공급가액, 포함이면 amount = 합계.
 */
export function totals(useItems: boolean, items: Item[], amount: number, vat: VatMode): Totals {
  const rows = useItems ? items : [{ name: '', qty: 1, price: amount }]
  const t = computeTotals(rows.map((r) => ({ qty: r.qty, price: r.price, taxable: true })), vat, 'line')
  const sum = t.total
  const override = useItems && amount > 0
  return {
    supply: t.supply,
    vat: t.vat,
    sum,
    total: override ? amount : sum,
    mismatch: override && amount !== sum,
    lines: rows.map((r) => ({ ...r, amount: Math.round(r.qty * r.price) })),
  }
}

/** 사업자번호: 빈칸이면 개인(검사 안 함), 있으면 형식·검증번호 확인 */
export function bizStatus(no: string): 'none' | 'valid' | 'invalid' {
  if (!no.replace(/\D/g, '')) return 'none'
  return validate(no).valid ? 'valid' : 'invalid'
}

/** 사업자가 현금·계좌이체(세법상 현금거래)로 10만원 이상 받음 → 의무발행업종이면 현금영수증 발급 의무 */
export const cashReceiptDuty = (isBiz: boolean, pay: Pay, total: number) => isBiz && pay !== 'card' && total >= CASH_RECEIPT_MIN

/** 받는 쪽이 사업자라면 3만원 초과 시 간이영수증만으로는 증빙불비가산세 대상 */
export const overProofLimit = (total: number) => total > PROOF_LIMIT
