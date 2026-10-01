// 견적서·거래명세서·청구서 금액 계산 (순수 함수). 회귀 체크: node scripts/check-invoice.ts
// 품목별 세액 = 공급가액 × 10% 원 미만 절사 (vat.ts lineAmounts 재사용). 원 미만 처리는 법정 규칙이 없고 당사자 약정 — 실무 다수가 절사.
import { lineAmounts, vatOf, fromTotal, type Split } from './vat.ts'
import { parseAmount, toKoreanFormal } from './numberToKorean.ts'

export type DocType = 'quote' | 'statement' | 'bill'
/** excl = 단가에 부가세 별도, incl = 단가가 부가세 포함가, none = 세액 없음(면세·간이 영수증용) */
export type VatMode = 'excl' | 'incl' | 'none'
/** line = 품목별 세액 절사 후 합산, total = 공급가액 합계 × 10% (차액은 가장 큰 품목 세액에서 끝수 조정) */
export type VatBasis = 'line' | 'total'

export interface DocItem { qty: number; price: number; taxable: boolean }
export interface DocTotals {
  lines: Split[]
  supply: number
  vat: number
  total: number
  adjusted: number // total 기준일 때 끝수 조정한 세액(원). 0이면 품목별 합과 같음
}

export function computeTotals(items: DocItem[], mode: VatMode, basis: VatBasis): DocTotals {
  const inclusive = mode === 'incl'
  const lines = items.map((it) =>
    lineAmounts({ name: '', qty: it.qty, price: it.price, kind: mode !== 'none' && it.taxable ? 'taxable' : 'exempt' }, inclusive),
  )
  let adjusted = 0
  const taxIdx = items.flatMap((it, i) => (mode !== 'none' && it.taxable && lines[i].total > 0 ? [i] : []))
  if (basis === 'total' && taxIdx.length > 1) {
    const lineVat = taxIdx.reduce((a, i) => a + lines[i].vat, 0)
    const target = inclusive
      ? fromTotal(taxIdx.reduce((a, i) => a + lines[i].total, 0)).vat
      : vatOf(taxIdx.reduce((a, i) => a + lines[i].supply, 0))
    adjusted = target - lineVat
    if (adjusted) {
      const big = taxIdx.reduce((b, i) => (lines[i].supply > lines[b].supply ? i : b), taxIdx[0])
      const l = { ...lines[big], vat: lines[big].vat + adjusted }
      // 포함가: 받는 돈(합계)은 그대로, 공급가액에서 상쇄 / 별도: 합계가 세액만큼 변함
      if (inclusive) l.supply -= adjusted
      else l.total += adjusted
      lines[big] = l
    }
  }
  const sum = (k: keyof Split) => lines.reduce((a, l) => a + l[k], 0)
  return { lines, supply: sum('supply'), vat: sum('vat'), total: sum('total'), adjusted }
}

/** 1100000 → '금 일백일십만원정' (0 이하 → '') */
export function amountInKorean(n: number): string {
  const p = parseAmount(String(Math.floor(n)))
  return p ? toKoreanFormal(p, '금 ') : ''
}

/** 'YYYY-MM-DD' + 마지막 발행번호 → 같은 날이면 일련번호 +1, 아니면 001 */
export function nextDocNumber(date: string, last?: string | null): string {
  const ymd = date.replace(/\D/g, '').slice(0, 8)
  const m = last?.match(/^(\d{8})-(\d+)$/)
  const n = m && m[1] === ymd ? Number(m[2]) + 1 : 1
  return `${ymd}-${String(n).padStart(3, '0')}`
}

export const won = (n: number) => n.toLocaleString('ko-KR')
