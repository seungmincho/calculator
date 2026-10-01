// 문서 작성기 공통 헬퍼 (차용증·사직서·위임장·내용증명·근로계약서)
import { parseAmount, toKoreanFormal, commafy } from './numberToKorean.ts'

/** 당사자 (주민번호는 앞 6자리 + 뒷자리 첫째만 — 전체 번호는 받지 않음) */
export interface Party {
  name: string
  idFront: string // 6자리
  idBack1: string // 1자리 (선택)
  address: string
  phone: string
}

export const EMPTY_PARTY: Party = { name: '', idFront: '', idBack1: '', address: '', phone: '' }

/** 900101-1****** / 900101-******* / '' */
export function maskId(p: Pick<Party, 'idFront' | 'idBack1'>): string {
  if (!p.idFront) return ''
  return `${p.idFront}-${p.idBack1 ? p.idBack1 + '******' : '*******'}`
}

/** '2026-10-01' → '2026년 10월 1일' ('' → '    년    월    일' 빈칸 양식) */
export function krDate(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return '        년      월      일'
  return `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일`
}

/** 10000000 → '금 일천만원정 (₩10,000,000)'. 0·잘못된 값 → 빈칸 양식 */
export function amountText(n: number): string {
  if (!(n > 0)) return '금                    원정 (₩              )'
  const p = parseAmount(String(Math.floor(n)))
  return p ? `${toKoreanFormal(p)} (₩${commafy(p.int)})` : ''
}

export const won = (n: number) => Math.round(n).toLocaleString('ko-KR')

/** 파일명: 차용증_홍길동_2026-10-01 (금지 문자 제거, 빈 값 생략) */
export function docFileName(...parts: string[]): string {
  return parts.map((s) => s.trim()).filter(Boolean).join('_').replace(/[\\/:*?"<>|\s]/g, '')
}

/** 저장값을 기본값 위에 얹기 — 1단계 객체(당사자 등)는 필드 단위 병합, 새 필드가 생겨도 undefined 안 됨 */
export function mergeSaved<T extends object>(base: T, saved: unknown): T {
  if (!saved || typeof saved !== 'object') return base
  const out = { ...base } as Record<string, unknown>
  for (const [k, v] of Object.entries(saved as Record<string, unknown>)) {
    if (!(k in out) || v === undefined || v === null) continue
    const b = out[k]
    if (Array.isArray(b)) out[k] = Array.isArray(v) ? v : b
    else if (b && typeof b === 'object') out[k] = typeof v === 'object' && !Array.isArray(v) ? { ...b, ...v } : b
    else if (typeof v === typeof b) out[k] = v
  }
  return out as T
}
